/**
 * Phone-Home Tests (RG-TDD)
 *
 * Test HTTP success/failure, timeout behavior, and network errors
 * Written FIRST before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhoneHomeClient } from '../../src/licensing/phone-home.js';
import type { PhoneHomeResponse } from '../../src/licensing/license-types.js';

describe('PhoneHomeClient', () => {
  let client: PhoneHomeClient;
  const mockServerUrl = 'https://license.enterprise-openclaw.com';

  beforeEach(() => {
    client = new PhoneHomeClient(mockServerUrl, 5000);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with server URL', () => {
      const newClient = new PhoneHomeClient(mockServerUrl);
      expect(newClient).toBeTruthy();
    });

    it('should create client with custom timeout', () => {
      const newClient = new PhoneHomeClient(mockServerUrl, 10000);
      expect(newClient).toBeTruthy();
    });

    it('should use default timeout when not specified', () => {
      const newClient = new PhoneHomeClient(mockServerUrl);
      expect(newClient).toBeTruthy();
    });
  });

  describe('validate', () => {
    it('should successfully validate with server', async () => {
      // Mock successful response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          cached_until: Date.now() + 3600000
        })
      });

      global.fetch = mockFetch;

      const result = await client.validate('test.license.key', 'machine_hash');

      expect(result.valid).toBe(true);
      expect(result.cached_until).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockServerUrl}/validate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
    });

    it('should handle validation failure from server', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          valid: false,
          reason: 'License expired'
        })
      });

      global.fetch = mockFetch;

      const result = await client.validate('expired.license.key', 'machine_hash');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('License expired');
    });

    it('should include machine_id in request', async () => {
      let requestBody: any;

      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        requestBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ valid: true })
        };
      });

      global.fetch = mockFetch;

      await client.validate('test.license.key', 'test_machine_hash');

      expect(requestBody.machine_id).toBe('test_machine_hash');
    });

    it('should include timestamp in request', async () => {
      let requestBody: any;

      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        requestBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ valid: true })
        };
      });

      global.fetch = mockFetch;

      const beforeTime = Date.now();
      await client.validate('test.license.key', 'machine_hash');
      const afterTime = Date.now();

      expect(requestBody.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(requestBody.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle timeout (5s default)', async () => {
      const shortTimeoutClient = new PhoneHomeClient(mockServerUrl, 50);

      // Mock fetch that respects AbortController
      const mockFetch = vi.fn().mockImplementation((url: string, options: any) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ valid: true })
            });
          }, 1000); // 1 second delay, but timeout is 50ms

          // Respect abort signal
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      });

      global.fetch = mockFetch;

      await expect(
        shortTimeoutClient.validate('test.license.key', 'machine_hash')
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      global.fetch = mockFetch;

      await expect(
        client.validate('test.license.key', 'machine_hash')
      ).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      });

      global.fetch = mockFetch;

      await expect(
        client.validate('test.license.key', 'machine_hash')
      ).rejects.toThrow();
    });

    it('should handle invalid JSON response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      global.fetch = mockFetch;

      await expect(
        client.validate('test.license.key', 'machine_hash')
      ).rejects.toThrow();
    });

    it('should allow validation without machine_id', async () => {
      let requestBody: any;

      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        requestBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ valid: true })
        };
      });

      global.fetch = mockFetch;

      await client.validate('test.license.key');

      expect(requestBody.machine_id).toBeUndefined();
      expect(requestBody.license_key).toBe('test.license.key');
    });
  });

  describe('Error Handling', () => {
    it('should throw on DNS resolution failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND')
      );

      global.fetch = mockFetch;

      await expect(
        client.validate('test.license.key', 'machine_hash')
      ).rejects.toThrow();
    });

    it('should throw on connection refused', async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new Error('connect ECONNREFUSED')
      );

      global.fetch = mockFetch;

      await expect(
        client.validate('test.license.key', 'machine_hash')
      ).rejects.toThrow();
    });

    it('should throw on SSL/TLS errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new Error('unable to verify the first certificate')
      );

      global.fetch = mockFetch;

      await expect(
        client.validate('test.license.key', 'machine_hash')
      ).rejects.toThrow();
    });
  });
});
