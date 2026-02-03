/**
 * @enterprise-openclaw/enterprise
 *
 * Licensed enterprise features for Enterprise OpenClaw
 * Requires valid license key for operation
 *
 * This package provides:
 * - Advanced DRIFT RAG with full inference engine
 * - Knowledge gap detection and reasoning
 * - PII detection and audit logging
 * - Multi-tenant support
 * - Enterprise connectors
 */

import { LicenseValidator } from './licensing/license-validator.js';
import { FeatureFlagManager } from './licensing/feature-flags.js';
import type { LicenseConfig, ValidationResult } from './licensing/license-types.js';

let featureFlags: FeatureFlagManager | null = null;
let licenseValidator: LicenseValidator | null = null;

/**
 * Initialize enterprise features with license validation
 */
export async function initializeLicense(config: LicenseConfig): Promise<ValidationResult> {
  licenseValidator = new LicenseValidator(config);
  const result = await licenseValidator.validate(config.licenseKey);

  if (!result.valid) {
    throw new Error(`License validation failed: ${result.reason}`);
  }

  featureFlags = new FeatureFlagManager(result.payload!);
  return result;
}

/**
 * Get feature flags manager (requires license initialization)
 */
export function getFeatureFlags(): FeatureFlagManager {
  if (!featureFlags) {
    throw new Error('License not initialized. Call initializeLicense() first.');
  }
  return featureFlags;
}

/**
 * Check if a specific feature is enabled
 */
export function hasFeature(feature: string): boolean {
  if (!featureFlags) {
    return false;
  }
  return featureFlags.hasFeature(feature);
}

// Re-export license types
export * from './licensing/license-types.js';
export { LicenseValidator } from './licensing/license-validator.js';
export { FeatureFlagManager } from './licensing/feature-flags.js';

// Export enterprise features
// Note: These require license validation via initializeLicense()
export { DRIFTRAG as DRIFTRAGAdvanced } from './rag/drift-rag-advanced.js';
export { InferenceEngine } from './knowledge-graph/inference-engine.js';
export { DocumentProcessor } from './knowledge-graph/document-processor.js';
