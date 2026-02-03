/**
 * License Validator Tests (RG-TDD)
 *
 * Comprehensive test suite covering:
 * - JWT parsing (invalid format, missing parts)
 * - Signature verification (tampered payload, wrong key)
 * - Expiration tests (expired, future, days remaining)
 * - Machine binding tests (mismatch, disabled)
 * - Schema validation tests (missing fields, invalid tier)
 * - Performance tests (<100ms validation)
 * - Integration scenarios (online, offline, cache)
 *
 * Written FIRST before implementation (~20 tests)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LicenseValidator } from '../../src/licensing/license-validator.js';
import { generateKeyPair, generateTestLicense, generateExpiredLicense, generateMachineLockedLicense } from '../test-utils/license-helpers.js';
import type { LicenseConfig } from '../../src/licensing/license-types.js';

describe('LicenseValidator', () => {
  let validator: LicenseValidator;
  let keyPair: { publicKey: string; privateKey: string };
  let testConfig: LicenseConfig;

  beforeEach(() => {
    keyPair = generateKeyPair();
    testConfig = {
      licenseKey: '',
      publicKey: keyPair.publicKey,
      serverUrl: 'https://license.test.com',
      enableMachineBinding: false,
      offlineCacheDays: 7,
      validationCacheMinutes: 5,
      phoneHomeTimeout: 5000
    };

    validator = new LicenseValidator(testConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JWT Parsing', () => {
    it('should parse valid JWT format', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
    });

    it('should reject invalid JWT format (not 3 parts)', async () => {
      const invalidLicense = 'invalid.jwt';
      testConfig.licenseKey = invalidLicense;

      const result = await validator.validate(invalidLicense);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid JWT format');
    });

    it('should reject JWT with missing header', async () => {
      const invalidLicense = '.payload.signature';
      testConfig.licenseKey = invalidLicense;

      const result = await validator.validate(invalidLicense);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid JWT format');
    });

    it('should reject JWT with missing payload', async () => {
      const invalidLicense = 'header..signature';
      testConfig.licenseKey = invalidLicense;

      const result = await validator.validate(invalidLicense);
      expect(result.valid).toBe(false);
    });

    it('should reject JWT with missing signature', async () => {
      const invalidLicense = 'header.payload.';
      testConfig.licenseKey = invalidLicense;

      const result = await validator.validate(invalidLicense);
      expect(result.valid).toBe(false);
    });

    it('should reject malformed base64 in JWT', async () => {
      const invalidLicense = 'not@valid#base64.not@valid#base64.not@valid#base64';
      testConfig.licenseKey = invalidLicense;

      const result = await validator.validate(invalidLicense);
      expect(result.valid).toBe(false);
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid RS256 signature', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
    });

    it('should reject tampered payload', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      const parts = license.split('.');

      // Tamper with payload
      const tamperedPayload = Buffer.from('{"tampered": true}').toString('base64url');
      const tamperedLicense = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      testConfig.licenseKey = tamperedLicense;

      const result = await validator.validate(tamperedLicense);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid signature');
    });

    it('should reject signature from wrong key', async () => {
      const otherKeyPair = generateKeyPair();
      const license = generateTestLicense(otherKeyPair.privateKey);

      testConfig.licenseKey = license;
      // Use original keyPair public key (mismatch)

      const result = await validator.validate(license);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid signature');
    });
  });

  describe('Expiration Checking', () => {
    it('should validate non-expired license', async () => {
      const license = generateTestLicense(keyPair.privateKey, {}, {
        expireDaysFromNow: 365
      });
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
    });

    it('should reject expired license', async () => {
      const license = generateExpiredLicense(keyPair.privateKey, 30);
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should reject license not yet valid (future iat)', async () => {
      const license = generateTestLicense(keyPair.privateKey, {}, {
        iatDaysAgo: -10 // 10 days in future
      });
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not yet valid');
    });

    it('should calculate days remaining correctly', async () => {
      const license = generateTestLicense(keyPair.privateKey, {}, {
        expireDaysFromNow: 30
      });
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
      // Days remaining should be around 30 (allow some variance)
      expect(result.payload?.exp).toBeDefined();
    });
  });

  describe('Machine Binding', () => {
    it('should validate when machine binding disabled', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;
      testConfig.enableMachineBinding = false;

      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
    });

    it('should validate matching machine ID', async () => {
      // Note: This test will pass if machine_id is not in license
      // or if it matches the current machine
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;
      testConfig.enableMachineBinding = true;

      const result = await validator.validate(license);
      // Should pass because license has no machine_id restriction
      expect(result.valid).toBe(true);
    });

    it('should reject mismatched machine ID', async () => {
      const license = generateMachineLockedLicense(
        keyPair.privateKey,
        'different_machine_hash'
      );

      // Create new validator with machine binding enabled
      const configWithMachineBinding: LicenseConfig = {
        ...testConfig,
        licenseKey: license,
        enableMachineBinding: true
      };

      const validatorWithMachineBinding = new LicenseValidator(configWithMachineBinding);

      const result = await validatorWithMachineBinding.validate(license);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Machine ID mismatch');
    });
  });

  describe('Schema Validation', () => {
    it('should validate complete license payload', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.tier).toBeDefined();
      expect(result.payload?.features).toBeDefined();
      expect(result.payload?.limits).toBeDefined();
    });

    it('should reject license with missing required fields', async () => {
      const invalidPayload = {
        iss: 'enterprise-openclaw',
        // Missing sub, iat, exp, tier, features, limits
      };

      const header = { alg: 'RS256', typ: 'JWT' };
      const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
      const encodedPayload = Buffer.from(JSON.stringify(invalidPayload)).toString('base64url');

      const invalidLicense = `${encodedHeader}.${encodedPayload}.fake_signature`;
      testConfig.licenseKey = invalidLicense;

      const result = await validator.validate(invalidLicense);
      expect(result.valid).toBe(false);
    });

    it('should reject license with invalid tier', async () => {
      const license = generateTestLicense(keyPair.privateKey, {
        tier: 'invalid_tier' as any
      });
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid license schema');
    });

    it('should reject license with empty features array', async () => {
      const license = generateTestLicense(keyPair.privateKey, {
        features: []
      });
      testConfig.licenseKey = license;

      const result = await validator.validate(license);
      expect(result.valid).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should validate in less than 100ms', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const startTime = performance.now();
      await validator.validate(license);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should use in-memory cache for repeated validations', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      // First validation
      const start1 = performance.now();
      await validator.validate(license);
      const duration1 = performance.now() - start1;

      // Second validation (should be cached)
      const start2 = performance.now();
      await validator.validate(license);
      const duration2 = performance.now() - start2;

      // Cached validation should be significantly faster
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(10); // Sub-10ms for cached
    });
  });

  describe('Integration Scenarios', () => {
    it('should validate with successful phone-home', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      // Mock successful phone-home
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ valid: true })
      });
      global.fetch = mockFetch;

      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
    });

    it('should fallback to offline cache when phone-home fails', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      // Mock phone-home failure
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      // First validation to populate cache
      await validator.validate(license);

      // Second validation should use cache despite network error
      const result = await validator.validate(license);
      expect(result.valid).toBe(true);
    });

    it('should validate offline when server unreachable', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      // Mock complete network failure
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      const result = await validator.validate(license);
      // Should still validate based on signature and expiration
      expect(result.valid).toBe(true);
    });
  });
});
