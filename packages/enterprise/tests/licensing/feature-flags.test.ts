/**
 * Feature Flags Tests (RG-TDD)
 *
 * Test feature checking, limit retrieval, and error throwing
 * Written FIRST before implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlagManager } from '../../src/licensing/feature-flags.js';
import type { LicensePayload } from '../../src/licensing/license-types.js';

describe('FeatureFlagManager', () => {
  let starterPayload: LicensePayload;
  let professionalPayload: LicensePayload;
  let enterprisePayload: LicensePayload;

  beforeEach(() => {
    const now = Math.floor(Date.now() / 1000);

    starterPayload = {
      iss: 'enterprise-openclaw',
      sub: 'starter_customer',
      iat: now,
      exp: now + (365 * 86400),
      tier: 'starter',
      features: ['drift-rag-advanced'],
      limits: {
        max_tenants: 1,
        max_concurrent_tasks: 10,
        max_tokens_per_month: 100000
      },
      company: 'Starter Corp',
      contact: 'starter@example.com'
    };

    professionalPayload = {
      iss: 'enterprise-openclaw',
      sub: 'professional_customer',
      iat: now,
      exp: now + (365 * 86400),
      tier: 'professional',
      features: ['drift-rag-advanced', 'inference-engine', 'pii-detection'],
      limits: {
        max_tenants: 5,
        max_concurrent_tasks: 25,
        max_tokens_per_month: 500000
      },
      company: 'Professional Corp',
      contact: 'pro@example.com'
    };

    enterprisePayload = {
      iss: 'enterprise-openclaw',
      sub: 'enterprise_customer',
      iat: now,
      exp: now + (365 * 86400),
      tier: 'enterprise',
      features: [
        'drift-rag-advanced',
        'inference-engine',
        'multi-tenant',
        'pii-detection',
        'audit-logging',
        'connectors'
      ],
      limits: {
        max_tenants: 10,
        max_concurrent_tasks: 50,
        max_tokens_per_month: 1000000
      },
      company: 'Enterprise Corp',
      contact: 'enterprise@example.com'
    };
  });

  describe('Constructor', () => {
    it('should create manager with license payload', () => {
      const manager = new FeatureFlagManager(enterprisePayload);
      expect(manager).toBeTruthy();
    });
  });

  describe('hasFeature', () => {
    it('should return true for enabled features', () => {
      const manager = new FeatureFlagManager(enterprisePayload);

      expect(manager.hasFeature('drift-rag-advanced')).toBe(true);
      expect(manager.hasFeature('inference-engine')).toBe(true);
      expect(manager.hasFeature('multi-tenant')).toBe(true);
      expect(manager.hasFeature('pii-detection')).toBe(true);
      expect(manager.hasFeature('audit-logging')).toBe(true);
      expect(manager.hasFeature('connectors')).toBe(true);
    });

    it('should return false for disabled features', () => {
      const manager = new FeatureFlagManager(starterPayload);

      expect(manager.hasFeature('drift-rag-advanced')).toBe(true);
      expect(manager.hasFeature('inference-engine')).toBe(false);
      expect(manager.hasFeature('multi-tenant')).toBe(false);
      expect(manager.hasFeature('pii-detection')).toBe(false);
      expect(manager.hasFeature('audit-logging')).toBe(false);
      expect(manager.hasFeature('connectors')).toBe(false);
    });

    it('should handle starter tier features', () => {
      const manager = new FeatureFlagManager(starterPayload);

      expect(manager.hasFeature('drift-rag-advanced')).toBe(true);
      expect(manager.hasFeature('inference-engine')).toBe(false);
    });

    it('should handle professional tier features', () => {
      const manager = new FeatureFlagManager(professionalPayload);

      expect(manager.hasFeature('drift-rag-advanced')).toBe(true);
      expect(manager.hasFeature('inference-engine')).toBe(true);
      expect(manager.hasFeature('pii-detection')).toBe(true);
      expect(manager.hasFeature('multi-tenant')).toBe(false);
      expect(manager.hasFeature('connectors')).toBe(false);
    });

    it('should handle enterprise tier features', () => {
      const manager = new FeatureFlagManager(enterprisePayload);

      expect(manager.hasFeature('drift-rag-advanced')).toBe(true);
      expect(manager.hasFeature('inference-engine')).toBe(true);
      expect(manager.hasFeature('multi-tenant')).toBe(true);
      expect(manager.hasFeature('pii-detection')).toBe(true);
      expect(manager.hasFeature('audit-logging')).toBe(true);
      expect(manager.hasFeature('connectors')).toBe(true);
    });

    it('should return false for unknown features', () => {
      const manager = new FeatureFlagManager(enterprisePayload);

      expect(manager.hasFeature('unknown-feature')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const manager = new FeatureFlagManager(enterprisePayload);

      expect(manager.hasFeature('DRIFT-RAG-ADVANCED')).toBe(false);
      expect(manager.hasFeature('drift-rag-advanced')).toBe(true);
    });
  });

  describe('requireFeature', () => {
    it('should not throw for enabled features', () => {
      const manager = new FeatureFlagManager(enterprisePayload);

      expect(() => manager.requireFeature('drift-rag-advanced')).not.toThrow();
      expect(() => manager.requireFeature('inference-engine')).not.toThrow();
    });

    it('should throw for disabled features', () => {
      const manager = new FeatureFlagManager(starterPayload);

      expect(() => manager.requireFeature('inference-engine')).toThrow();
      expect(() => manager.requireFeature('multi-tenant')).toThrow();
    });

    it('should throw with descriptive error message', () => {
      const manager = new FeatureFlagManager(starterPayload);

      expect(() => manager.requireFeature('multi-tenant')).toThrow(
        /feature.*not enabled/i
      );
    });

    it('should include feature name in error', () => {
      const manager = new FeatureFlagManager(starterPayload);

      try {
        manager.requireFeature('connectors');
        expect.fail('Should have thrown');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('connectors');
        }
      }
    });
  });

  describe('getLimit', () => {
    it('should return max_tenants limit', () => {
      const starterManager = new FeatureFlagManager(starterPayload);
      const proManager = new FeatureFlagManager(professionalPayload);
      const enterpriseManager = new FeatureFlagManager(enterprisePayload);

      expect(starterManager.getLimit('max_tenants')).toBe(1);
      expect(proManager.getLimit('max_tenants')).toBe(5);
      expect(enterpriseManager.getLimit('max_tenants')).toBe(10);
    });

    it('should return max_concurrent_tasks limit', () => {
      const starterManager = new FeatureFlagManager(starterPayload);
      const proManager = new FeatureFlagManager(professionalPayload);
      const enterpriseManager = new FeatureFlagManager(enterprisePayload);

      expect(starterManager.getLimit('max_concurrent_tasks')).toBe(10);
      expect(proManager.getLimit('max_concurrent_tasks')).toBe(25);
      expect(enterpriseManager.getLimit('max_concurrent_tasks')).toBe(50);
    });

    it('should return max_tokens_per_month limit', () => {
      const starterManager = new FeatureFlagManager(starterPayload);
      const proManager = new FeatureFlagManager(professionalPayload);
      const enterpriseManager = new FeatureFlagManager(enterprisePayload);

      expect(starterManager.getLimit('max_tokens_per_month')).toBe(100000);
      expect(proManager.getLimit('max_tokens_per_month')).toBe(500000);
      expect(enterpriseManager.getLimit('max_tokens_per_month')).toBe(1000000);
    });

    it('should throw for unknown limit keys', () => {
      const manager = new FeatureFlagManager(enterprisePayload);

      expect(() => manager.getLimit('unknown_limit' as any)).toThrow();
    });
  });

  describe('getTier', () => {
    it('should return correct tier', () => {
      const starterManager = new FeatureFlagManager(starterPayload);
      const proManager = new FeatureFlagManager(professionalPayload);
      const enterpriseManager = new FeatureFlagManager(enterprisePayload);

      expect(starterManager.getTier()).toBe('starter');
      expect(proManager.getTier()).toBe('professional');
      expect(enterpriseManager.getTier()).toBe('enterprise');
    });
  });

  describe('getFeatures', () => {
    it('should return all enabled features', () => {
      const manager = new FeatureFlagManager(professionalPayload);
      const features = manager.getFeatures();

      expect(features).toContain('drift-rag-advanced');
      expect(features).toContain('inference-engine');
      expect(features).toContain('pii-detection');
      expect(features).toHaveLength(3);
    });

    it('should return array copy (not reference)', () => {
      const manager = new FeatureFlagManager(professionalPayload);
      const features1 = manager.getFeatures();
      const features2 = manager.getFeatures();

      expect(features1).toEqual(features2);
      expect(features1).not.toBe(features2); // Different array instances
    });
  });

  describe('getLimits', () => {
    it('should return all limits', () => {
      const manager = new FeatureFlagManager(enterprisePayload);
      const limits = manager.getLimits();

      expect(limits.max_tenants).toBe(10);
      expect(limits.max_concurrent_tasks).toBe(50);
      expect(limits.max_tokens_per_month).toBe(1000000);
    });

    it('should return object copy (not reference)', () => {
      const manager = new FeatureFlagManager(enterprisePayload);
      const limits1 = manager.getLimits();
      const limits2 = manager.getLimits();

      expect(limits1).toEqual(limits2);
      expect(limits1).not.toBe(limits2); // Different object instances
    });
  });
});
