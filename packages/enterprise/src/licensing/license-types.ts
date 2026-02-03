/**
 * License Types and Schemas
 *
 * Zod schemas for license validation and type definitions
 */

import { z } from 'zod';

/**
 * License tiers available
 */
export const LicenseTier = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
} as const;

export type LicenseTierType = typeof LicenseTier[keyof typeof LicenseTier];

/**
 * License limits schema
 */
export const LicenseLimitsSchema = z.object({
  max_tenants: z.number().int().positive(),
  max_concurrent_tasks: z.number().int().positive(),
  max_tokens_per_month: z.number().int().positive()
});

export type LicenseLimits = z.infer<typeof LicenseLimitsSchema>;

/**
 * JWT License payload schema
 */
export const LicensePayloadSchema = z.object({
  // Standard JWT claims
  iss: z.string(), // Issuer: "enterprise-openclaw"
  sub: z.string(), // Subject: customer_id
  iat: z.number().int(), // Issued at timestamp
  exp: z.number().int(), // Expiration timestamp

  // License-specific claims
  tier: z.enum(['starter', 'professional', 'enterprise']),
  features: z.array(z.string()).min(1),
  limits: LicenseLimitsSchema,

  // Optional machine binding
  machine_id: z.string().optional(),

  // Customer information
  company: z.string(),
  contact: z.string().email()
});

export type LicensePayload = z.infer<typeof LicensePayloadSchema>;

/**
 * Validation result
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  reason: z.string().optional(),
  payload: LicensePayloadSchema.optional()
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * License configuration for initialization
 */
export interface LicenseConfig {
  /** JWT license key */
  licenseKey: string;

  /** RSA public key for signature verification (PEM format) */
  publicKey: string;

  /** License server URL for phone-home validation */
  serverUrl?: string;

  /** Enable machine ID binding check */
  enableMachineBinding?: boolean;

  /** Offline cache duration in days (default: 7) */
  offlineCacheDays?: number;

  /** Validation cache duration in minutes (default: 5) */
  validationCacheMinutes?: number;

  /** Phone-home timeout in milliseconds (default: 5000) */
  phoneHomeTimeout?: number;
}

/**
 * Phone-home request payload
 */
export interface PhoneHomeRequest {
  license_key: string;
  machine_id?: string;
  timestamp: number;
  version: string;
}

/**
 * Phone-home response
 */
export interface PhoneHomeResponse {
  valid: boolean;
  reason?: string;
  cached_until?: number;
}

/**
 * License validation error reasons
 */
export enum ValidationErrorReason {
  INVALID_FORMAT = 'Invalid JWT format',
  INVALID_SIGNATURE = 'Invalid signature',
  EXPIRED = 'License expired',
  NOT_YET_VALID = 'License not yet valid',
  INVALID_SCHEMA = 'Invalid license schema',
  MACHINE_MISMATCH = 'Machine ID mismatch',
  PHONE_HOME_FAILED = 'Phone-home validation failed',
  OFFLINE_CACHE_EXPIRED = 'Offline cache expired'
}
