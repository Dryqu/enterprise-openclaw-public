/**
 * Phone-Home Client
 *
 * POST to license server with machine_id and timestamp
 * Includes timeout handling
 */

import type { PhoneHomeRequest, PhoneHomeResponse } from './license-types.js';

export class PhoneHomeClient {
  private serverUrl: string;
  private timeout: number;

  /**
   * Create a new phone-home client
   * @param serverUrl - License validation server URL
   * @param timeout - Request timeout in milliseconds (default: 5000)
   */
  constructor(serverUrl: string, timeout: number = 5000) {
    this.serverUrl = serverUrl;
    this.timeout = timeout;
  }

  /**
   * Validate license with server
   * @param licenseKey - JWT license key
   * @param machineId - Optional hashed machine ID
   * @returns Phone-home response
   * @throws Error if validation fails or times out
   */
  async validate(licenseKey: string, machineId?: string): Promise<PhoneHomeResponse> {
    const request: PhoneHomeRequest = {
      license_key: licenseKey,
      machine_id: machineId,
      timestamp: Date.now(),
      version: '1.0.0'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.serverUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Enterprise-OpenClaw/1.0.0'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `License validation failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json() as PhoneHomeResponse;
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `License validation timeout after ${this.timeout}ms`
          );
        }
        throw error;
      }

      throw new Error('Unknown error during license validation');
    }
  }

  /**
   * Check server connectivity
   * @returns true if server is reachable
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
