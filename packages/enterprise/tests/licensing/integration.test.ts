/**
 * License Integration Tests
 *
 * End-to-end validation flows, offline mode scenarios, and real-world use cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LicenseValidator } from '../../src/licensing/license-validator.js';
import { FeatureFlagManager } from '../../src/licensing/feature-flags.js';
import { generateKeyPair, generateTestLicense, generateExpiredLicense, generateTierLicense } from '../test-utils/license-helpers.js';
import type { LicenseConfig } from '../../src/licensing/license-types.js';

describe('License Integration', () => {
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

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Validation', () => {
    it('should complete full validation flow with valid license', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.tier).toBe('enterprise');
      expect(result.payload?.features).toContain('drift-rag-advanced');
    });

    it('should work with FeatureFlagManager after validation', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);

      const featureFlags = new FeatureFlagManager(result.payload!);

      expect(featureFlags.hasFeature('drift-rag-advanced')).toBe(true);
      expect(featureFlags.getLimit('max_tenants')).toBe(10);
      expect(featureFlags.getTier()).toBe('enterprise');
    });

    it('should reject invalid license end-to-end', async () => {
      const license = 'invalid.license.key';
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject expired license end-to-end', async () => {
      const license = generateExpiredLicense(keyPair.privateKey, 30);
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });
  });

  describe('Tier-Based Workflows', () => {
    it('should validate and gate starter tier features', async () => {
      const license = generateTierLicense(keyPair.privateKey, 'starter');
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);

      const featureFlags = new FeatureFlagManager(result.payload!);

      expect(featureFlags.getTier()).toBe('starter');
      expect(featureFlags.hasFeature('drift-rag-advanced')).toBe(true);
      expect(featureFlags.hasFeature('inference-engine')).toBe(false);
      expect(featureFlags.hasFeature('multi-tenant')).toBe(false);

      expect(() => featureFlags.requireFeature('drift-rag-advanced')).not.toThrow();
      expect(() => featureFlags.requireFeature('inference-engine')).toThrow();
    });

    it('should validate and gate professional tier features', async () => {
      const license = generateTierLicense(keyPair.privateKey, 'professional');
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);

      const featureFlags = new FeatureFlagManager(result.payload!);

      expect(featureFlags.getTier()).toBe('professional');
      expect(featureFlags.hasFeature('drift-rag-advanced')).toBe(true);
      expect(featureFlags.hasFeature('inference-engine')).toBe(true);
      expect(featureFlags.hasFeature('pii-detection')).toBe(true);
      expect(featureFlags.hasFeature('multi-tenant')).toBe(false);
      expect(featureFlags.hasFeature('connectors')).toBe(false);

      expect(featureFlags.getLimit('max_tenants')).toBe(5);
      expect(featureFlags.getLimit('max_concurrent_tasks')).toBe(25);
    });

    it('should validate and allow all enterprise tier features', async () => {
      const license = generateTierLicense(keyPair.privateKey, 'enterprise');
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);

      const featureFlags = new FeatureFlagManager(result.payload!);

      expect(featureFlags.getTier()).toBe('enterprise');
      expect(featureFlags.hasFeature('drift-rag-advanced')).toBe(true);
      expect(featureFlags.hasFeature('inference-engine')).toBe(true);
      expect(featureFlags.hasFeature('multi-tenant')).toBe(true);
      expect(featureFlags.hasFeature('pii-detection')).toBe(true);
      expect(featureFlags.hasFeature('audit-logging')).toBe(true);
      expect(featureFlags.hasFeature('connectors')).toBe(true);

      expect(featureFlags.getLimit('max_tenants')).toBe(10);
      expect(featureFlags.getLimit('max_concurrent_tasks')).toBe(50);
      expect(featureFlags.getLimit('max_tokens_per_month')).toBe(1000000);
    });
  });

  describe('Offline Mode', () => {
    it('should work offline without server URL', async () => {
      const license = generateTestLicense(keyPair.privateKey);

      const offlineConfig: LicenseConfig = {
        ...testConfig,
        licenseKey: license,
        serverUrl: undefined // No phone-home
      };

      const validator = new LicenseValidator(offlineConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);
    });

    it('should fallback to offline validation on network error', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      // Mock network error
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      // Should still validate successfully offline
      expect(result.valid).toBe(true);
    });

    it('should use offline cache after initial validation', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      // Mock successful phone-home
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ valid: true })
      });
      global.fetch = mockFetch;

      const validator = new LicenseValidator(testConfig);

      // First validation (populates cache)
      const result1 = await validator.validate(license);
      expect(result1.valid).toBe(true);

      // Simulate network failure
      mockFetch.mockRejectedValue(new Error('Network down'));

      // Second validation (should use cache)
      const result2 = await validator.validate(license);
      expect(result2.valid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should validate quickly on first call', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);

      const start = performance.now();
      await validator.validate(license);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should validate very quickly on cached calls', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);

      // Prime cache
      await validator.validate(license);

      // Measure cached validation
      const start = performance.now();
      await validator.validate(license);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle multiple concurrent validations', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);

      const promises = Array.from({ length: 10 }, () =>
        validator.validate(license)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle license upgrade scenario', async () => {
      // Start with starter license
      const starterLicense = generateTierLicense(keyPair.privateKey, 'starter');
      testConfig.licenseKey = starterLicense;

      let validator = new LicenseValidator(testConfig);
      let result = await validator.validate(starterLicense);

      expect(result.valid).toBe(true);

      let featureFlags = new FeatureFlagManager(result.payload!);
      expect(featureFlags.getTier()).toBe('starter');
      expect(featureFlags.hasFeature('inference-engine')).toBe(false);

      // Upgrade to enterprise license
      const enterpriseLicense = generateTierLicense(keyPair.privateKey, 'enterprise');
      testConfig.licenseKey = enterpriseLicense;

      validator = new LicenseValidator(testConfig);
      result = await validator.validate(enterpriseLicense);

      expect(result.valid).toBe(true);

      featureFlags = new FeatureFlagManager(result.payload!);
      expect(featureFlags.getTier()).toBe('enterprise');
      expect(featureFlags.hasFeature('inference-engine')).toBe(true);
    });

    it('should provide useful error messages', async () => {
      const license = generateTestLicense(keyPair.privateKey);
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);

      const featureFlags = new FeatureFlagManager(result.payload!);

      try {
        featureFlags.requireFeature('nonexistent-feature');
        expect.fail('Should have thrown');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('nonexistent-feature');
          expect(error.message).toContain('not enabled');
        }
      }
    });

    it('should provide customer information', async () => {
      const license = generateTestLicense(keyPair.privateKey, {
        company: 'Acme Corp',
        contact: 'admin@acme.com',
        sub: 'acme_001'
      });
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);

      const featureFlags = new FeatureFlagManager(result.payload!);
      const customerInfo = featureFlags.getCustomerInfo();

      expect(customerInfo.company).toBe('Acme Corp');
      expect(customerInfo.contact).toBe('admin@acme.com');
      expect(customerInfo.customerId).toBe('acme_001');
    });

    it('should detect expiring licenses', async () => {
      const license = generateTestLicense(keyPair.privateKey, {}, {
        expireDaysFromNow: 15 // Expires in 15 days
      });
      testConfig.licenseKey = license;

      const validator = new LicenseValidator(testConfig);
      const result = await validator.validate(license);

      expect(result.valid).toBe(true);

      const featureFlags = new FeatureFlagManager(result.payload!);

      expect(featureFlags.isExpiringSoon(30)).toBe(true); // Within 30 days
      expect(featureFlags.isExpiringSoon(10)).toBe(false); // Not within 10 days
      expect(featureFlags.getDaysUntilExpiration()).toBeGreaterThan(10);
      expect(featureFlags.getDaysUntilExpiration()).toBeLessThan(20);
    });
  });
});
