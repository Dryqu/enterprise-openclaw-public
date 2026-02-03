/**
 * License Test Helpers
 *
 * Utilities for generating test licenses and key pairs
 */

import { createSign, createVerify, generateKeyPairSync } from 'crypto';
import type { LicensePayload } from '../../src/licensing/license-types.js';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate RSA key pair for testing
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { publicKey, privateKey };
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a signed JWT test license
 */
export function generateTestLicense(
  privateKey: string,
  payload: Partial<LicensePayload> = {},
  options: {
    expireDaysFromNow?: number;
    iatDaysAgo?: number;
    invalidSignature?: boolean;
    invalidFormat?: boolean;
  } = {}
): string {
  const now = Math.floor(Date.now() / 1000);

  const defaultPayload: LicensePayload = {
    iss: 'enterprise-openclaw',
    sub: payload.sub || 'test_customer_001',
    iat: options.iatDaysAgo !== undefined ? now - (options.iatDaysAgo * 86400) : now,
    exp: options.expireDaysFromNow !== undefined ? now + (options.expireDaysFromNow * 86400) : now + (365 * 86400),
    tier: payload.tier || 'enterprise',
    features: payload.features || [
      'drift-rag-advanced',
      'inference-engine',
      'multi-tenant',
      'pii-detection',
      'audit-logging',
      'connectors'
    ],
    limits: payload.limits || {
      max_tenants: 10,
      max_concurrent_tasks: 50,
      max_tokens_per_month: 1000000
    },
    machine_id: payload.machine_id,
    company: payload.company || 'Test Corp',
    contact: payload.contact || 'test@example.com',
    ...payload
  };

  // Invalid format - return malformed JWT
  if (options.invalidFormat) {
    return 'invalid.jwt.format';
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(defaultPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  let signature: string;

  if (options.invalidSignature) {
    // Generate invalid signature
    signature = base64UrlEncode('invalid_signature_data');
  } else {
    // Generate valid RS256 signature
    const sign = createSign('RSA-SHA256');
    sign.update(dataToSign);
    sign.end();
    const signatureBuffer = sign.sign(privateKey);
    signature = signatureBuffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  return `${dataToSign}.${signature}`;
}

/**
 * Generate an expired license
 */
export function generateExpiredLicense(privateKey: string, daysExpired: number = 30): string {
  return generateTestLicense(privateKey, {}, {
    expireDaysFromNow: -daysExpired
  });
}

/**
 * Generate a license for specific tier
 */
export function generateTierLicense(
  privateKey: string,
  tier: 'starter' | 'professional' | 'enterprise'
): string {
  const tierFeatures: Record<string, string[]> = {
    starter: ['drift-rag-advanced'],
    professional: ['drift-rag-advanced', 'inference-engine', 'pii-detection'],
    enterprise: [
      'drift-rag-advanced',
      'inference-engine',
      'multi-tenant',
      'pii-detection',
      'audit-logging',
      'connectors'
    ]
  };

  const tierLimits: Record<string, LicensePayload['limits']> = {
    starter: {
      max_tenants: 1,
      max_concurrent_tasks: 10,
      max_tokens_per_month: 100000
    },
    professional: {
      max_tenants: 5,
      max_concurrent_tasks: 25,
      max_tokens_per_month: 500000
    },
    enterprise: {
      max_tenants: 10,
      max_concurrent_tasks: 50,
      max_tokens_per_month: 1000000
    }
  };

  return generateTestLicense(privateKey, {
    tier,
    features: tierFeatures[tier],
    limits: tierLimits[tier]
  });
}

/**
 * Generate a machine-locked license
 */
export function generateMachineLockedLicense(
  privateKey: string,
  machineId: string
): string {
  return generateTestLicense(privateKey, {
    machine_id: machineId
  });
}

/**
 * Verify signature manually (for testing)
 */
export function verifySignature(jwt: string, publicKey: string): boolean {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    // Decode signature
    const signature = Buffer.from(
      encodedSignature.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    const verify = createVerify('RSA-SHA256');
    verify.update(dataToVerify);
    verify.end();

    return verify.verify(publicKey, signature);
  } catch (error) {
    return false;
  }
}

/**
 * Parse JWT payload without verification (for testing)
 */
export function parsePayload(jwt: string): LicensePayload | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;

    const encodedPayload = parts[1];
    const payloadJson = Buffer.from(
      encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf-8');

    return JSON.parse(payloadJson);
  } catch (error) {
    return null;
  }
}
