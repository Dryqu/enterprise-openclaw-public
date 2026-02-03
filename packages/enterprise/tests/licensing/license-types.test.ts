/**
 * License Types Tests (RG-TDD)
 *
 * Test Zod schema validation, tier validation, and invalid formats
 * Written FIRST before implementation
 */

import { describe, it, expect } from 'vitest';
import {
  LicensePayloadSchema,
  LicenseTier,
  ValidationResultSchema,
  type LicensePayload,
  type ValidationResult
} from '../../src/licensing/license-types.js';

describe('LicenseTypes', () => {
  describe('LicenseTier', () => {
    it('should define valid license tiers', () => {
      expect(LicenseTier.STARTER).toBe('starter');
      expect(LicenseTier.PROFESSIONAL).toBe('professional');
      expect(LicenseTier.ENTERPRISE).toBe('enterprise');
    });

    it('should have all expected tiers', () => {
      const tiers = Object.values(LicenseTier);
      expect(tiers).toHaveLength(3);
      expect(tiers).toContain('starter');
      expect(tiers).toContain('professional');
      expect(tiers).toContain('enterprise');
    });
  });

  describe('LicensePayloadSchema', () => {
    const validPayload: LicensePayload = {
      iss: 'enterprise-openclaw',
      sub: 'customer_001',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (365 * 86400),
      tier: 'enterprise',
      features: ['drift-rag-advanced', 'inference-engine'],
      limits: {
        max_tenants: 10,
        max_concurrent_tasks: 50,
        max_tokens_per_month: 1000000
      },
      company: 'Test Corp',
      contact: 'test@example.com'
    };

    it('should validate a complete valid payload', () => {
      const result = LicensePayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('should validate payload with optional machine_id', () => {
      const payloadWithMachineId = {
        ...validPayload,
        machine_id: 'sha256_hash_of_machine'
      };

      const result = LicensePayloadSchema.safeParse(payloadWithMachineId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.machine_id).toBe('sha256_hash_of_machine');
      }
    });

    it('should validate starter tier', () => {
      const starterPayload = {
        ...validPayload,
        tier: 'starter',
        features: ['drift-rag-advanced'],
        limits: {
          max_tenants: 1,
          max_concurrent_tasks: 10,
          max_tokens_per_month: 100000
        }
      };

      const result = LicensePayloadSchema.safeParse(starterPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier).toBe('starter');
      }
    });

    it('should validate professional tier', () => {
      const professionalPayload = {
        ...validPayload,
        tier: 'professional',
        features: ['drift-rag-advanced', 'inference-engine', 'pii-detection']
      };

      const result = LicensePayloadSchema.safeParse(professionalPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier).toBe('professional');
      }
    });

    it('should reject invalid tier', () => {
      const invalidPayload = {
        ...validPayload,
        tier: 'invalid_tier'
      };

      const result = LicensePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: iss', () => {
      const { iss, ...payloadWithoutIss } = validPayload;
      const result = LicensePayloadSchema.safeParse(payloadWithoutIss);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: sub', () => {
      const { sub, ...payloadWithoutSub } = validPayload;
      const result = LicensePayloadSchema.safeParse(payloadWithoutSub);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: iat', () => {
      const { iat, ...payloadWithoutIat } = validPayload;
      const result = LicensePayloadSchema.safeParse(payloadWithoutIat);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: exp', () => {
      const { exp, ...payloadWithoutExp } = validPayload;
      const result = LicensePayloadSchema.safeParse(payloadWithoutExp);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: tier', () => {
      const { tier, ...payloadWithoutTier } = validPayload;
      const result = LicensePayloadSchema.safeParse(payloadWithoutTier);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: features', () => {
      const { features, ...payloadWithoutFeatures } = validPayload;
      const result = LicensePayloadSchema.safeParse(payloadWithoutFeatures);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: limits', () => {
      const { limits, ...payloadWithoutLimits } = validPayload;
      const result = LicensePayloadSchema.safeParse(payloadWithoutLimits);
      expect(result.success).toBe(false);
    });

    it('should reject invalid iat type', () => {
      const invalidPayload = {
        ...validPayload,
        iat: 'not_a_number'
      };
      const result = LicensePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid exp type', () => {
      const invalidPayload = {
        ...validPayload,
        exp: 'not_a_number'
      };
      const result = LicensePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid features type', () => {
      const invalidPayload = {
        ...validPayload,
        features: 'not_an_array'
      };
      const result = LicensePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject empty features array', () => {
      const invalidPayload = {
        ...validPayload,
        features: []
      };
      const result = LicensePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid limits structure', () => {
      const invalidPayload = {
        ...validPayload,
        limits: {
          max_tenants: 'not_a_number'
        }
      };
      const result = LicensePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject missing limits fields', () => {
      const invalidPayload = {
        ...validPayload,
        limits: {
          max_tenants: 10
          // missing max_concurrent_tasks and max_tokens_per_month
        }
      };
      const result = LicensePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('ValidationResultSchema', () => {
    it('should validate successful validation result', () => {
      const validResult: ValidationResult = {
        valid: true,
        payload: {
          iss: 'enterprise-openclaw',
          sub: 'customer_001',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (365 * 86400),
          tier: 'enterprise',
          features: ['drift-rag-advanced'],
          limits: {
            max_tenants: 10,
            max_concurrent_tasks: 50,
            max_tokens_per_month: 1000000
          },
          company: 'Test Corp',
          contact: 'test@example.com'
        }
      };

      const result = ValidationResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate failed validation result with reason', () => {
      const invalidResult: ValidationResult = {
        valid: false,
        reason: 'License expired'
      };

      const result = ValidationResultSchema.safeParse(invalidResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.reason).toBe('License expired');
      }
    });

    it('should validate failed validation result with payload', () => {
      const invalidResult: ValidationResult = {
        valid: false,
        reason: 'Machine ID mismatch',
        payload: {
          iss: 'enterprise-openclaw',
          sub: 'customer_001',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (365 * 86400),
          tier: 'enterprise',
          features: ['drift-rag-advanced'],
          limits: {
            max_tenants: 10,
            max_concurrent_tasks: 50,
            max_tokens_per_month: 1000000
          },
          company: 'Test Corp',
          contact: 'test@example.com',
          machine_id: 'different_machine'
        }
      };

      const result = ValidationResultSchema.safeParse(invalidResult);
      expect(result.success).toBe(true);
    });

    it('should reject validation result without valid field', () => {
      const invalidResult = {
        reason: 'Missing valid field'
      };

      const result = ValidationResultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it('should reject validation result with invalid payload', () => {
      const invalidResult = {
        valid: true,
        payload: {
          // Missing required fields
          iss: 'enterprise-openclaw'
        }
      };

      const result = ValidationResultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });
});
