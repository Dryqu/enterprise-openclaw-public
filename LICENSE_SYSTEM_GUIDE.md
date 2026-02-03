# Enterprise OpenClaw: License System Quick Start Guide

## Overview

The Enterprise OpenClaw license system provides secure, performant license validation with offline support and feature gating.

## Installation

```bash
# Install enterprise package
npm install @enterprise-openclaw/enterprise

# Or in workspace
npm install
```

## Basic Usage

### 1. Initialize License

```typescript
import { initializeLicense, getFeatureFlags } from '@enterprise-openclaw/enterprise';

// Initialize with license key
await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!,
  serverUrl: 'https://license.enterprise-openclaw.com',
  enableMachineBinding: false, // Optional: lock to specific machine
  offlineCacheDays: 7,         // Offline grace period
  validationCacheMinutes: 5     // In-memory cache duration
});

// Now you can use feature flags
const flags = getFeatureFlags();
console.log('License tier:', flags.getTier());
console.log('Has inference:', flags.hasFeature('inference-engine'));
```

### 2. Check Features

```typescript
import { hasFeature, getFeatureFlags } from '@enterprise-openclaw/enterprise';

// Quick check
if (hasFeature('drift-rag-advanced')) {
  // Use advanced RAG
}

// Get full feature manager
const flags = getFeatureFlags();

// Check feature availability
if (flags.hasFeature('multi-tenant')) {
  // Multi-tenant code
}

// Require feature (throws if not available)
try {
  flags.requireFeature('connectors');
  // Feature is available
} catch (error) {
  console.error('Connectors not available:', error.message);
}
```

### 3. Check Limits

```typescript
const flags = getFeatureFlags();

// Get specific limits
const maxTenants = flags.getLimit('max_tenants');
const maxTasks = flags.getLimit('max_concurrent_tasks');
const maxTokens = flags.getLimit('max_tokens_per_month');

console.log(`License allows ${maxTenants} tenants`);

// Get all limits
const limits = flags.getLimits();
console.log('All limits:', limits);
```

### 4. Customer Information

```typescript
const flags = getFeatureFlags();

const customerInfo = flags.getCustomerInfo();
console.log('Company:', customerInfo.company);
console.log('Contact:', customerInfo.contact);
console.log('Customer ID:', customerInfo.customerId);
```

### 5. Expiration Checking

```typescript
const flags = getFeatureFlags();

// Check days until expiration
const daysLeft = flags.getDaysUntilExpiration();
console.log(`License expires in ${daysLeft} days`);

// Check if expiring soon (default: 30 days)
if (flags.isExpiringSoon()) {
  console.warn('License expiring soon!');
}

// Check with custom threshold
if (flags.isExpiringSoon(60)) {
  console.warn('License expires within 60 days');
}
```

## Advanced Usage

### Custom License Validator

```typescript
import { LicenseValidator } from '@enterprise-openclaw/enterprise';

const validator = new LicenseValidator({
  licenseKey: 'your.license.key',
  publicKey: publicKeyPEM,
  serverUrl: 'https://your-license-server.com',
  enableMachineBinding: true,
  phoneHomeTimeout: 10000 // 10 seconds
});

const result = await validator.validate('your.license.key');

if (result.valid) {
  console.log('License valid!');
  console.log('Tier:', result.payload?.tier);
  console.log('Features:', result.payload?.features);
} else {
  console.error('License invalid:', result.reason);
}
```

### Offline Mode

The license system automatically handles offline scenarios:

1. **First validation:** Attempts phone-home, caches result
2. **Subsequent validations:** Uses in-memory cache (5 min)
3. **Network failure:** Falls back to file cache (7 days)
4. **Cache expired:** Validation fails, requires connectivity

```typescript
// Force offline mode by not providing serverUrl
await initializeLicense({
  licenseKey: licenseKey,
  publicKey: publicKey,
  serverUrl: undefined // Offline mode
});
```

### Machine Binding

Lock licenses to specific machines:

```typescript
await initializeLicense({
  licenseKey: licenseKey,
  publicKey: publicKey,
  enableMachineBinding: true // Enables machine ID check
});
```

**Note:** Machine-locked licenses will only work on the machine specified in the license's `machine_id` field.

## Configuration Options

### LicenseConfig

```typescript
interface LicenseConfig {
  // Required
  licenseKey: string;           // JWT license key
  publicKey: string;            // RS256 public key (PEM format)

  // Optional
  serverUrl?: string;           // License server URL
  enableMachineBinding?: boolean; // Enable machine ID check (default: false)
  offlineCacheDays?: number;    // Offline cache duration (default: 7)
  validationCacheMinutes?: number; // Memory cache duration (default: 5)
  phoneHomeTimeout?: number;    // Timeout in ms (default: 5000)
}
```

## License Tiers

### Starter
- **Features:** `drift-rag-advanced`
- **Limits:**
  - Max tenants: 1
  - Max concurrent tasks: 10
  - Max tokens/month: 100,000

### Professional
- **Features:** `drift-rag-advanced`, `inference-engine`, `pii-detection`
- **Limits:**
  - Max tenants: 5
  - Max concurrent tasks: 25
  - Max tokens/month: 500,000

### Enterprise
- **Features:** All features including:
  - `drift-rag-advanced`
  - `inference-engine`
  - `multi-tenant`
  - `pii-detection`
  - `audit-logging`
  - `connectors`
- **Limits:**
  - Max tenants: 10
  - Max concurrent tasks: 50
  - Max tokens/month: 1,000,000

## Error Handling

```typescript
import { initializeLicense } from '@enterprise-openclaw/enterprise';

try {
  await initializeLicense(config);
} catch (error) {
  if (error.message.includes('expired')) {
    // Handle expired license
    console.error('License has expired');
  } else if (error.message.includes('Machine ID mismatch')) {
    // Handle machine binding error
    console.error('License not valid for this machine');
  } else if (error.message.includes('Invalid signature')) {
    // Handle tampered license
    console.error('License has been tampered with');
  } else {
    // Generic error
    console.error('License validation failed:', error.message);
  }
}
```

## Performance Tips

1. **Initialize once:** Call `initializeLicense()` at application startup
2. **Cache results:** Feature flags are cached in memory (5 min default)
3. **Offline-first:** System automatically uses cached results when possible
4. **Monitor latency:** First validation <100ms, cached <10ms

## Testing

### Generate Test Licenses

```typescript
import { generateKeyPair, generateTestLicense } from '@enterprise-openclaw/enterprise/tests/test-utils/license-helpers';

// Generate key pair for testing
const { publicKey, privateKey } = generateKeyPair();

// Generate test license
const license = generateTestLicense(privateKey, {
  tier: 'professional',
  features: ['drift-rag-advanced', 'inference-engine'],
  company: 'Test Corp'
});

// Use in tests
const validator = new LicenseValidator({
  licenseKey: license,
  publicKey: publicKey
});

const result = await validator.validate(license);
expect(result.valid).toBe(true);
```

## Environment Variables

```bash
# Required
ENTERPRISE_LICENSE_KEY="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Optional
LICENSE_SERVER_URL="https://license.enterprise-openclaw.com"
ENABLE_MACHINE_BINDING="false"
OFFLINE_CACHE_DAYS="7"
VALIDATION_CACHE_MINUTES="5"
```

## Troubleshooting

### License Validation Fails

1. **Check license format:** Must be valid JWT with 3 parts (header.payload.signature)
2. **Verify public key:** Must match the private key used to sign
3. **Check expiration:** Ensure license hasn't expired
4. **Network issues:** System will use offline cache if available

### Performance Issues

1. **Slow first validation:** Normal (includes phone-home)
2. **Slow subsequent validations:** Check cache configuration
3. **Frequent phone-home:** Increase `validationCacheMinutes`

### Machine Binding Issues

1. **Disable binding:** Set `enableMachineBinding: false`
2. **VM/Container:** Machine ID may change on redeployment
3. **Cloud:** Consider not using machine binding for dynamic infrastructure

## Support

For license issues:
- **Email:** license@enterprise-openclaw.com
- **Sales:** sales@enterprise-openclaw.com
- **Support:** support@enterprise-openclaw.com

For technical issues:
- **GitHub:** https://github.com/enterprise-openclaw/enterprise-openclaw/issues
- **Docs:** https://docs.enterprise-openclaw.com

## Example: Full Application Integration

```typescript
import { initializeLicense, getFeatureFlags } from '@enterprise-openclaw/enterprise';
import { KnowledgeGraph } from '@enterprise-openclaw/core';

async function main() {
  // Initialize license
  try {
    await initializeLicense({
      licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
      publicKey: process.env.LICENSE_PUBLIC_KEY!,
      serverUrl: process.env.LICENSE_SERVER_URL
    });

    console.log('License validated successfully');
  } catch (error) {
    console.error('License validation failed:', error);
    process.exit(1);
  }

  // Check license details
  const flags = getFeatureFlags();
  console.log(`Licensed to: ${flags.getCustomerInfo().company}`);
  console.log(`Tier: ${flags.getTier()}`);
  console.log(`Days until expiration: ${flags.getDaysUntilExpiration()}`);

  // Initialize knowledge graph (from core package)
  const kg = new KnowledgeGraph('./data/kg');
  await kg.initialize();

  // Use enterprise features based on license
  if (flags.hasFeature('drift-rag-advanced')) {
    const { DRIFTRAGAdvanced } = await import('@enterprise-openclaw/enterprise');
    const rag = new DRIFTRAGAdvanced({
      knowledgeGraph: kg,
      useInference: flags.hasFeature('inference-engine')
    });

    // Use advanced RAG
    const results = await rag.query('What is DRIFT RAG?');
    console.log('Results:', results);
  } else {
    // Fall back to basic features
    console.warn('Advanced RAG not available in your license');
  }

  // Check limits
  const maxTenants = flags.getLimit('max_tenants');
  console.log(`Your license allows ${maxTenants} tenants`);
}

main().catch(console.error);
```

---

**Last Updated:** 2026-02-03
**License System Version:** 1.0.0
**Status:** Production Ready ✅
