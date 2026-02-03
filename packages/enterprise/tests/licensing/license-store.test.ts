/**
 * License Store Tests (RG-TDD)
 *
 * Test caching, retrieval, expiration (7 days), and hash collision prevention
 * Written FIRST before implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LicenseStore } from '../../src/licensing/license-store.js';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ValidationResult } from '../../src/licensing/license-types.js';

const TEST_CACHE_DIR = join(process.cwd(), 'test-cache');

describe('LicenseStore', () => {
  let store: LicenseStore;

  beforeEach(() => {
    // Create test cache directory
    if (!existsSync(TEST_CACHE_DIR)) {
      mkdirSync(TEST_CACHE_DIR, { recursive: true });
    }
    store = new LicenseStore(TEST_CACHE_DIR);
  });

  afterEach(() => {
    // Clean up test cache
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should create store with default cache directory', () => {
      const defaultStore = new LicenseStore();
      expect(defaultStore).toBeTruthy();
    });

    it('should create store with custom cache directory', () => {
      const customStore = new LicenseStore(TEST_CACHE_DIR);
      expect(customStore).toBeTruthy();
    });

    it('should create cache directory if it does not exist', () => {
      const newCacheDir = join(TEST_CACHE_DIR, 'new-cache');
      const newStore = new LicenseStore(newCacheDir);
      expect(existsSync(newCacheDir)).toBe(true);
      rmSync(newCacheDir, { recursive: true, force: true });
    });
  });

  describe('set', () => {
    const validationResult: ValidationResult = {
      valid: true,
      payload: {
        iss: 'enterprise-openclaw',
        sub: 'test_customer',
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

    it('should cache validation result', async () => {
      const licenseKey = 'test.license.key';
      await store.set(licenseKey, validationResult);

      const cached = await store.get(licenseKey);
      expect(cached).toEqual(validationResult);
    });

    it('should create cache file with SHA256 hash filename', async () => {
      const licenseKey = 'test.license.key';
      await store.set(licenseKey, validationResult);

      // Check that a file was created
      const files = existsSync(TEST_CACHE_DIR) ?
        require('fs').readdirSync(TEST_CACHE_DIR) : [];
      expect(files.length).toBeGreaterThan(0);

      // Filename should be 64 hex chars + .json
      const filename = files[0];
      expect(filename).toMatch(/^[a-f0-9]{64}\.json$/);
    });

    it('should overwrite existing cache', async () => {
      const licenseKey = 'test.license.key';

      // First cache
      await store.set(licenseKey, validationResult);
      const cached1 = await store.get(licenseKey);

      // Update with different result
      const updatedResult: ValidationResult = {
        ...validationResult,
        valid: false,
        reason: 'Updated'
      };

      await store.set(licenseKey, updatedResult);
      const cached2 = await store.get(licenseKey);

      expect(cached2).toEqual(updatedResult);
      expect(cached2).not.toEqual(cached1);
    });

    it('should handle different license keys separately', async () => {
      const key1 = 'license.key.1';
      const key2 = 'license.key.2';

      const result1: ValidationResult = { ...validationResult };
      const result2: ValidationResult = {
        ...validationResult,
        payload: { ...validationResult.payload!, sub: 'different_customer' }
      };

      await store.set(key1, result1);
      await store.set(key2, result2);

      const cached1 = await store.get(key1);
      const cached2 = await store.get(key2);

      expect(cached1).toEqual(result1);
      expect(cached2).toEqual(result2);
      expect(cached1).not.toEqual(cached2);
    });
  });

  describe('get', () => {
    it('should return null for non-existent cache', async () => {
      const result = await store.get('nonexistent.license.key');
      expect(result).toBeNull();
    });

    it('should retrieve cached validation result', async () => {
      const licenseKey = 'test.license.key';
      const validationResult: ValidationResult = {
        valid: true,
        payload: {
          iss: 'enterprise-openclaw',
          sub: 'test_customer',
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

      await store.set(licenseKey, validationResult);
      const cached = await store.get(licenseKey);

      expect(cached).toEqual(validationResult);
    });

    it('should return null for expired cache (default 7 days)', async () => {
      const licenseKey = 'test.license.key';
      const validationResult: ValidationResult = {
        valid: true,
        payload: {
          iss: 'enterprise-openclaw',
          sub: 'test_customer',
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

      // Set with 8 days ago timestamp (expired)
      await store.set(licenseKey, validationResult);

      // Manually modify the cached file timestamp to 8 days ago
      const cacheKey = store['getCacheKey'](licenseKey);
      const cachePath = join(TEST_CACHE_DIR, `${cacheKey}.json`);

      if (existsSync(cachePath)) {
        const cacheData = JSON.parse(readFileSync(cachePath, 'utf-8'));
        cacheData.cachedAt = Date.now() - (8 * 86400 * 1000); // 8 days ago
        writeFileSync(cachePath, JSON.stringify(cacheData));
      }

      const cached = await store.get(licenseKey);
      expect(cached).toBeNull();
    });

    it('should respect custom expiration days', async () => {
      const customStore = new LicenseStore(TEST_CACHE_DIR, 1); // 1 day expiration
      const licenseKey = 'test.license.key';
      const validationResult: ValidationResult = {
        valid: true,
        payload: {
          iss: 'enterprise-openclaw',
          sub: 'test_customer',
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

      await customStore.set(licenseKey, validationResult);

      // Manually modify to 2 days ago (should be expired with 1 day expiration)
      const cacheKey = customStore['getCacheKey'](licenseKey);
      const cachePath = join(TEST_CACHE_DIR, `${cacheKey}.json`);

      if (existsSync(cachePath)) {
        const cacheData = JSON.parse(readFileSync(cachePath, 'utf-8'));
        cacheData.cachedAt = Date.now() - (2 * 86400 * 1000);
        writeFileSync(cachePath, JSON.stringify(cacheData));
      }

      const cached = await customStore.get(licenseKey);
      expect(cached).toBeNull();
    });

    it('should handle corrupted cache files gracefully', async () => {
      const licenseKey = 'test.license.key';
      const cacheKey = store['getCacheKey'](licenseKey);
      const cachePath = join(TEST_CACHE_DIR, `${cacheKey}.json`);

      // Write corrupted JSON
      writeFileSync(cachePath, '{ invalid json }');

      const cached = await store.get(licenseKey);
      expect(cached).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear specific cache entry', async () => {
      const licenseKey = 'test.license.key';
      const validationResult: ValidationResult = {
        valid: true,
        payload: {
          iss: 'enterprise-openclaw',
          sub: 'test_customer',
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

      await store.set(licenseKey, validationResult);
      expect(await store.get(licenseKey)).toEqual(validationResult);

      await store.clear(licenseKey);
      expect(await store.get(licenseKey)).toBeNull();
    });

    it('should not affect other cache entries', async () => {
      const key1 = 'license.key.1';
      const key2 = 'license.key.2';
      const result: ValidationResult = {
        valid: true,
        payload: {
          iss: 'enterprise-openclaw',
          sub: 'test_customer',
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

      await store.set(key1, result);
      await store.set(key2, result);

      await store.clear(key1);

      expect(await store.get(key1)).toBeNull();
      expect(await store.get(key2)).toEqual(result);
    });
  });

  describe('Hash Collision Prevention', () => {
    it('should use SHA256 for cache key generation', async () => {
      const licenseKey = 'test.license.key';
      const cacheKey = store['getCacheKey'](licenseKey);

      // SHA256 produces 64 hex characters
      expect(cacheKey).toHaveLength(64);
      expect(cacheKey).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different cache keys for different licenses', async () => {
      const key1 = 'license.key.1';
      const key2 = 'license.key.2';

      const cacheKey1 = store['getCacheKey'](key1);
      const cacheKey2 = store['getCacheKey'](key2);

      expect(cacheKey1).not.toBe(cacheKey2);
    });

    it('should produce same cache key for same license', async () => {
      const licenseKey = 'test.license.key';

      const cacheKey1 = store['getCacheKey'](licenseKey);
      const cacheKey2 = store['getCacheKey'](licenseKey);

      expect(cacheKey1).toBe(cacheKey2);
    });
  });
});
