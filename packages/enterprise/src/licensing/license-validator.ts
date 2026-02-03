/**
 * License Validator
 *
 * Core validation logic:
 * - Parse JWT (base64url decode)
 * - Verify RS256 signature with crypto module
 * - Validate schema with Zod
 * - Check expiration
 * - Check machine binding
 * - Phone-home with offline fallback
 * - In-memory cache (5 min) for performance
 */

import { createVerify } from 'crypto';
import {
  LicensePayloadSchema,
  ValidationErrorReason,
  type LicenseConfig,
  type LicensePayload,
  type ValidationResult
} from './license-types.js';
import { LicenseStore } from './license-store.js';
import { PhoneHomeClient } from './phone-home.js';
import { getHashedMachineId } from './machine-id.js';
import { getLicenseMetrics } from './license-metrics.js';

interface CacheEntry {
  result: ValidationResult;
  timestamp: number;
}

export class LicenseValidator {
  private config: LicenseConfig;
  private licenseStore: LicenseStore;
  private phoneHomeClient?: PhoneHomeClient;
  private memoryCache: Map<string, CacheEntry>;
  private validationCacheMs: number;

  constructor(config: LicenseConfig) {
    this.config = {
      ...config,
      enableMachineBinding: config.enableMachineBinding ?? false,
      offlineCacheDays: config.offlineCacheDays ?? 7,
      validationCacheMinutes: config.validationCacheMinutes ?? 5,
      phoneHomeTimeout: config.phoneHomeTimeout ?? 5000
    };

    this.licenseStore = new LicenseStore(
      undefined,
      this.config.offlineCacheDays
    );

    if (this.config.serverUrl) {
      this.phoneHomeClient = new PhoneHomeClient(
        this.config.serverUrl,
        this.config.phoneHomeTimeout
      );
    }

    this.memoryCache = new Map();
    this.validationCacheMs = (this.config.validationCacheMinutes || 5) * 60 * 1000;
  }

  /**
   * Main validation entry point
   */
  async validate(licenseKey: string): Promise<ValidationResult> {
    const startTime = performance.now();
    const metrics = getLicenseMetrics();

    // Check in-memory cache first
    const cached = this.getFromMemoryCache(licenseKey);
    if (cached) {
      metrics.recordCacheHit();
      metrics.recordValidation(cached.valid, performance.now() - startTime, cached.reason);
      return cached;
    }

    metrics.recordCacheMiss();

    // Parse JWT
    const parseResult = this.parseJWT(licenseKey);
    if (!parseResult.success) {
      const result = {
        valid: false,
        reason: parseResult.error
      };
      metrics.recordValidation(false, performance.now() - startTime, parseResult.error);
      return result;
    }

    const { header, payload, signature, dataToVerify } = parseResult;

    // Verify signature
    const signatureValid = this.verifySignature(dataToVerify, signature);
    if (!signatureValid) {
      const result = {
        valid: false,
        reason: ValidationErrorReason.INVALID_SIGNATURE
      };
      metrics.recordValidation(false, performance.now() - startTime, ValidationErrorReason.INVALID_SIGNATURE);
      return result;
    }

    // Parse and validate payload schema
    const payloadResult = LicensePayloadSchema.safeParse(payload);
    if (!payloadResult.success) {
      const result = {
        valid: false,
        reason: ValidationErrorReason.INVALID_SCHEMA
      };
      metrics.recordValidation(false, performance.now() - startTime, ValidationErrorReason.INVALID_SCHEMA);
      return result;
    }

    const licensePayload = payloadResult.data;

    // Check expiration
    const expirationCheck = this.checkExpiration(licensePayload);
    if (!expirationCheck.valid) {
      metrics.recordValidation(false, performance.now() - startTime, expirationCheck.reason);
      return expirationCheck;
    }

    // Check machine binding
    if (this.config.enableMachineBinding) {
      const machineCheck = await this.checkMachineBinding(licensePayload);
      if (!machineCheck.valid) {
        metrics.recordValidation(false, performance.now() - startTime, machineCheck.reason);
        return machineCheck;
      }
    }

    // Phone home (if configured)
    if (this.phoneHomeClient) {
      try {
        const phoneHomeStart = performance.now();
        const machineId = this.config.enableMachineBinding
          ? await getHashedMachineId()
          : undefined;

        const phoneHomeResult = await this.phoneHomeClient.validate(
          licenseKey,
          machineId
        );

        metrics.recordPhoneHome(phoneHomeResult.valid, performance.now() - phoneHomeStart);

        if (!phoneHomeResult.valid) {
          const result: ValidationResult = {
            valid: false,
            reason: phoneHomeResult.reason || ValidationErrorReason.PHONE_HOME_FAILED,
            payload: licensePayload
          };

          // Cache negative result
          await this.licenseStore.set(licenseKey, result);
          this.setInMemoryCache(licenseKey, result);

          metrics.recordValidation(false, performance.now() - startTime, result.reason);
          return result;
        }
      } catch (error) {
        const phoneHomeEnd = performance.now();
        metrics.recordPhoneHome(false, phoneHomeEnd - startTime);

        // Phone-home failed, check offline cache
        const offlineResult = await this.licenseStore.get(licenseKey);
        if (offlineResult) {
          // Use cached result
          metrics.recordOfflineMode();
          this.setInMemoryCache(licenseKey, offlineResult);
          metrics.recordValidation(offlineResult.valid, performance.now() - startTime, offlineResult.reason);
          return offlineResult;
        }

        // No cache available, proceed with offline validation
        // (signature and expiration already checked)
        metrics.recordOfflineMode();
      }
    }

    // Validation successful
    const result: ValidationResult = {
      valid: true,
      payload: licensePayload
    };

    // Cache successful result
    await this.licenseStore.set(licenseKey, result);
    this.setInMemoryCache(licenseKey, result);

    metrics.recordValidation(true, performance.now() - startTime);
    return result;
  }

  /**
   * Parse JWT into components
   */
  private parseJWT(jwt: string): {
    success: true;
    header: any;
    payload: any;
    signature: Buffer;
    dataToVerify: string;
  } | {
    success: false;
    error: string;
  } {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        return {
          success: false,
          error: ValidationErrorReason.INVALID_FORMAT
        };
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;

      if (!encodedHeader || !encodedPayload || !encodedSignature) {
        return {
          success: false,
          error: ValidationErrorReason.INVALID_FORMAT
        };
      }

      // Decode header
      const headerJson = Buffer.from(
        encodedHeader.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8');
      const header = JSON.parse(headerJson);

      // Decode payload
      const payloadJson = Buffer.from(
        encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8');
      const payload = JSON.parse(payloadJson);

      // Decode signature
      const signature = Buffer.from(
        encodedSignature.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      );

      const dataToVerify = `${encodedHeader}.${encodedPayload}`;

      return {
        success: true,
        header,
        payload,
        signature,
        dataToVerify
      };
    } catch (error) {
      return {
        success: false,
        error: `${ValidationErrorReason.INVALID_FORMAT}: ${error}`
      };
    }
  }

  /**
   * Verify RS256 signature
   */
  private verifySignature(data: string, signature: Buffer): boolean {
    try {
      const verify = createVerify('RSA-SHA256');
      verify.update(data);
      verify.end();

      return verify.verify(this.config.publicKey, signature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check license expiration
   */
  private checkExpiration(payload: LicensePayload): ValidationResult {
    const now = Math.floor(Date.now() / 1000);

    // Check if not yet valid
    if (payload.iat > now) {
      return {
        valid: false,
        reason: ValidationErrorReason.NOT_YET_VALID,
        payload
      };
    }

    // Check if expired
    if (payload.exp < now) {
      return {
        valid: false,
        reason: ValidationErrorReason.EXPIRED,
        payload
      };
    }

    return {
      valid: true,
      payload
    };
  }

  /**
   * Check machine ID binding
   */
  private async checkMachineBinding(payload: LicensePayload): Promise<ValidationResult> {
    if (!payload.machine_id) {
      // No machine binding in license
      return {
        valid: true,
        payload
      };
    }

    const currentMachineId = await getHashedMachineId();

    if (currentMachineId !== payload.machine_id) {
      return {
        valid: false,
        reason: ValidationErrorReason.MACHINE_MISMATCH,
        payload
      };
    }

    return {
      valid: true,
      payload
    };
  }

  /**
   * Get from in-memory cache
   */
  private getFromMemoryCache(licenseKey: string): ValidationResult | null {
    const entry = this.memoryCache.get(licenseKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.validationCacheMs) {
      // Cache expired
      this.memoryCache.delete(licenseKey);
      return null;
    }

    return entry.result;
  }

  /**
   * Set in-memory cache
   */
  private setInMemoryCache(licenseKey: string, result: ValidationResult): void {
    this.memoryCache.set(licenseKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    await this.licenseStore.clearAll();
  }
}
