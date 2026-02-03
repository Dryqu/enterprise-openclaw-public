/**
 * Feature Flags
 *
 * Feature gating by license tier and limit enforcement
 */

import type { LicensePayload, LicenseLimits } from './license-types.js';

export class FeatureFlagManager {
  private payload: LicensePayload;

  constructor(payload: LicensePayload) {
    this.payload = payload;
  }

  /**
   * Check if a feature is enabled
   */
  hasFeature(feature: string): boolean {
    return this.payload.features.includes(feature);
  }

  /**
   * Require a feature (throw if not enabled)
   */
  requireFeature(feature: string): void {
    if (!this.hasFeature(feature)) {
      throw new Error(
        `Feature '${feature}' is not enabled in your license. ` +
        `Current tier: ${this.payload.tier}. ` +
        `Contact sales@enterprise-openclaw.com to upgrade.`
      );
    }
  }

  /**
   * Get a specific limit value
   */
  getLimit(limitKey: keyof LicenseLimits): number {
    const value = this.payload.limits[limitKey];

    if (value === undefined) {
      throw new Error(
        `Unknown limit key: ${limitKey}. ` +
        `Available limits: ${Object.keys(this.payload.limits).join(', ')}`
      );
    }

    return value;
  }

  /**
   * Get license tier
   */
  getTier(): string {
    return this.payload.tier;
  }

  /**
   * Get all enabled features
   */
  getFeatures(): string[] {
    return [...this.payload.features];
  }

  /**
   * Get all limits
   */
  getLimits(): LicenseLimits {
    return { ...this.payload.limits };
  }

  /**
   * Get customer information
   */
  getCustomerInfo(): {
    company: string;
    contact: string;
    customerId: string;
  } {
    return {
      company: this.payload.company,
      contact: this.payload.contact,
      customerId: this.payload.sub
    };
  }

  /**
   * Get license expiration timestamp
   */
  getExpirationTimestamp(): number {
    return this.payload.exp;
  }

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration(): number {
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = this.payload.exp - now;
    return Math.floor(secondsRemaining / 86400);
  }

  /**
   * Check if license is expiring soon (within specified days)
   */
  isExpiringSoon(days: number = 30): boolean {
    return this.getDaysUntilExpiration() <= days;
  }

  /**
   * Get full license payload (for debugging)
   */
  getPayload(): LicensePayload {
    return { ...this.payload };
  }
}
