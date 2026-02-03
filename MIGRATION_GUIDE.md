# Migration Guide: v0.9.x → v1.0.0 (Open-Core)

## Overview

This guide helps you migrate from Enterprise OpenClaw v0.9.x (monorepo) to v1.0.0 (open-core with licensed features).

## Breaking Changes

### Package Structure

**Before (v0.9.x):**
```typescript
import { KnowledgeGraph } from './extensions/knowledge-system/knowledge-graph.js';
import { DRIFTRAG } from './extensions/knowledge-system/rag-modes/drift-rag.js';
```

**After (v1.0.0):**
```typescript
// Core features (open source)
import { KnowledgeGraph } from '@enterprise-openclaw/core';

// Enterprise features (licensed)
import {
  DRIFTRAGAdvanced,
  initializeLicense
} from '@enterprise-openclaw/enterprise';
```

### License Required for Enterprise Features

v1.0.0 requires a valid license to use enterprise features. Core features remain open source.

## Migration Steps

### Step 1: Update Dependencies

**Option A: Using Workspaces (Recommended)**

If you're developing or contributing:

```bash
# Clone the new repo
git clone https://github.com/enterprise-openclaw/enterprise-openclaw.git
cd enterprise-openclaw

# Install dependencies
npm install

# Build packages
npm run build
```

**Option B: Using Published Packages**

If you're using as a library:

```bash
# Install core (open source)
npm install @enterprise-openclaw/core

# Install enterprise (licensed)
npm install @enterprise-openclaw/enterprise
```

### Step 2: Update Imports

#### Knowledge Graph

**Before:**
```typescript
import { KnowledgeGraph } from './extensions/knowledge-system/knowledge-graph.js';
import { VectorStore } from './extensions/knowledge-system/vector-store.js';
```

**After:**
```typescript
import { KnowledgeGraph, VectorStore } from '@enterprise-openclaw/core';
```

#### DRIFT RAG

**Before:**
```typescript
import { DRIFTRAG } from './extensions/knowledge-system/rag-modes/drift-rag.js';
```

**After (with license):**
```typescript
import { DRIFTRAGAdvanced, initializeLicense } from '@enterprise-openclaw/enterprise';

// Initialize license first
await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!
});

// Now use advanced features
const rag = new DRIFTRAGAdvanced({ knowledgeGraph: kg });
```

#### Inference Engine

**Before:**
```typescript
import { InferenceEngine } from './extensions/knowledge-system/inference-engine.js';
```

**After (with license):**
```typescript
import { InferenceEngine, initializeLicense } from '@enterprise-openclaw/enterprise';

await initializeLicense(config);
const engine = new InferenceEngine();
```

#### Security Features

**Before:**
```typescript
import { PIIDetector } from './src/security/pii-detector.js';
import { AuditLogger } from './src/security/audit-logger.js';
```

**After (with license):**
```typescript
// These are now part of enterprise package (not yet exported in index)
// Will be available after completing Task #24
```

### Step 3: Initialize License System

Add license initialization at application startup:

```typescript
import { initializeLicense } from '@enterprise-openclaw/enterprise';

async function bootstrap() {
  // Initialize license (required for enterprise features)
  try {
    await initializeLicense({
      licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
      publicKey: process.env.LICENSE_PUBLIC_KEY!,
      serverUrl: process.env.LICENSE_SERVER_URL || 'https://license.enterprise-openclaw.com',
      enableMachineBinding: false,
      offlineCacheDays: 7
    });

    console.log('✓ License validated');
  } catch (error) {
    console.error('✗ License validation failed:', error.message);
    process.exit(1);
  }

  // Continue with application initialization
  await startApplication();
}

bootstrap().catch(console.error);
```

### Step 4: Update Configuration

#### Environment Variables

Create `.env` file:

```bash
# Required for enterprise features
ENTERPRISE_LICENSE_KEY="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIj..."

# Optional
LICENSE_SERVER_URL="https://license.enterprise-openclaw.com"
ENABLE_MACHINE_BINDING="false"
OFFLINE_CACHE_DAYS="7"
```

#### TypeScript Configuration

Update `tsconfig.json` if using workspaces:

```json
{
  "compilerOptions": {
    "paths": {
      "@enterprise-openclaw/core": ["./packages/core/src"],
      "@enterprise-openclaw/enterprise": ["./packages/enterprise/src"]
    }
  }
}
```

### Step 5: Update Tests

#### Before (v0.9.x)

```typescript
import { KnowledgeGraph } from '../knowledge-system/knowledge-graph.js';

describe('KnowledgeGraph', () => {
  it('should work', async () => {
    const kg = new KnowledgeGraph('./test-db');
    await kg.initialize();
    // ...
  });
});
```

#### After (v1.0.0)

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';
import {
  initializeLicense,
  generateKeyPair,
  generateTestLicense
} from '@enterprise-openclaw/enterprise';

describe('KnowledgeGraph with Enterprise Features', () => {
  beforeAll(async () => {
    // Generate test license
    const { publicKey, privateKey } = generateKeyPair();
    const license = generateTestLicense(privateKey, {
      tier: 'enterprise',
      features: ['drift-rag-advanced', 'inference-engine']
    });

    // Initialize license for tests
    await initializeLicense({
      licenseKey: license,
      publicKey: publicKey
    });
  });

  it('should work with enterprise features', async () => {
    const kg = new KnowledgeGraph('./test-db');
    await kg.initialize();
    // ...
  });
});
```

## Feature Availability

### Open Source (Core Package)

Available to everyone under Apache 2.0:

- ✅ Knowledge Graph
- ✅ Vector Store (LanceDB)
- ✅ Basic graph traversal
- ✅ Node/edge queries
- ✅ Type definitions

### Licensed (Enterprise Package)

Requires valid license:

- 🔒 Advanced DRIFT RAG (full version)
- 🔒 Inference Engine
- 🔒 Document Processor
- 🔒 PII Detection
- 🔒 Audit Logging
- 🔒 Multi-tenant support (coming soon)
- 🔒 Enterprise connectors (coming soon)

## Common Migration Scenarios

### Scenario 1: Using Only Core Features

If you only need open-source features:

```typescript
// No license required!
import { KnowledgeGraph } from '@enterprise-openclaw/core';

const kg = new KnowledgeGraph('./data/kg');
await kg.initialize();

// Use core features freely
const nodes = await kg.getAllNodes();
const neighbors = await kg.getNeighbors(nodeId);
```

### Scenario 2: Upgrading to Enterprise

If you want enterprise features:

1. **Contact sales:** sales@enterprise-openclaw.com
2. **Receive license key:** JWT format with RS256 signature
3. **Install enterprise package:** `npm install @enterprise-openclaw/enterprise`
4. **Initialize license:** Use `initializeLicense()`
5. **Use enterprise features:** Import from enterprise package

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';
import {
  DRIFTRAGAdvanced,
  InferenceEngine,
  initializeLicense
} from '@enterprise-openclaw/enterprise';

// Initialize license
await initializeLicense(licenseConfig);

// Use enterprise features
const kg = new KnowledgeGraph('./data/kg');
const rag = new DRIFTRAGAdvanced({
  knowledgeGraph: kg,
  useInference: true
});
```

### Scenario 3: Graceful Degradation

Handle missing license gracefully:

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';
import { initializeLicense, hasFeature } from '@enterprise-openclaw/enterprise';

let useAdvancedFeatures = false;

try {
  await initializeLicense(licenseConfig);
  useAdvancedFeatures = hasFeature('drift-rag-advanced');
} catch (error) {
  console.warn('Enterprise features not available:', error.message);
}

const kg = new KnowledgeGraph('./data/kg');

if (useAdvancedFeatures) {
  const { DRIFTRAGAdvanced } = await import('@enterprise-openclaw/enterprise');
  const rag = new DRIFTRAGAdvanced({ knowledgeGraph: kg });
} else {
  // Use core features only
  const results = await kg.query({ /* basic query */ });
}
```

## Backward Compatibility

### v0.9.x Branch

The original monorepo structure is preserved in the `v0.9.x` branch:

```bash
# Stay on v0.9.x (no license required)
git checkout v0.9.x
npm install
```

### Migration Timeline

- **v0.9.x:** Supported until 2026-06-01 (security patches only)
- **v1.0.0:** Current release (open-core)
- **v1.1.0:** Planned for 2026-04-01 (additional features)

## Troubleshooting

### Issue: "License not initialized"

**Error:**
```
Error: License not initialized. Call initializeLicense() first.
```

**Solution:**
```typescript
// Add this at application startup
await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!
});
```

### Issue: Module not found

**Error:**
```
Cannot find module '@enterprise-openclaw/core'
```

**Solution:**
```bash
# Install dependencies
npm install

# If using workspaces, build packages
npm run build
```

### Issue: License validation fails

**Error:**
```
License validation failed: Invalid signature
```

**Solutions:**
1. Verify license key is correct
2. Ensure public key matches private key used to sign
3. Check license hasn't expired
4. Try offline mode: `serverUrl: undefined`

### Issue: Features not available

**Error:**
```
Feature 'drift-rag-advanced' is not enabled in your license
```

**Solutions:**
1. Check your license tier: `getFeatureFlags().getTier()`
2. Verify feature is in your license: `getFeatureFlags().getFeatures()`
3. Contact sales to upgrade: sales@enterprise-openclaw.com

## Performance Considerations

### Caching Strategy

v1.0.0 uses multiple cache layers:

1. **Memory cache (5 min):** ~10ms validation
2. **File cache (7 days):** ~50ms validation
3. **Phone-home:** ~5s (first validation only)

**Recommendation:** Initialize license once at startup, not per request.

### Bundle Size

- **@enterprise-openclaw/core:** ~500KB (no license overhead)
- **@enterprise-openclaw/enterprise:** ~800KB (includes licensing)

**Recommendation:** Use tree-shaking to reduce bundle size.

## Testing Strategy

### Unit Tests

```typescript
import { generateKeyPair, generateTestLicense } from '@enterprise-openclaw/enterprise';

describe('My Feature', () => {
  let licenseConfig: LicenseConfig;

  beforeAll(() => {
    const { publicKey, privateKey } = generateKeyPair();
    const license = generateTestLicense(privateKey);

    licenseConfig = {
      licenseKey: license,
      publicKey: publicKey
    };
  });

  it('should work with valid license', async () => {
    await initializeLicense(licenseConfig);
    // Test your feature
  });
});
```

### Integration Tests

```typescript
describe('Integration', () => {
  it('should work with real license', async () => {
    // Use real license from environment
    await initializeLicense({
      licenseKey: process.env.TEST_LICENSE_KEY!,
      publicKey: process.env.TEST_PUBLIC_KEY!
    });

    // Test with actual license server
    const flags = getFeatureFlags();
    expect(flags.getTier()).toBe('enterprise');
  });
});
```

## Rollback Plan

If you encounter issues with v1.0.0:

### Quick Rollback

```bash
# Revert to v0.9.x
git checkout v0.9.x
npm install
npm run build
```

### Gradual Migration

1. Keep v0.9.x running in production
2. Test v1.0.0 in staging
3. Migrate users incrementally
4. Monitor for issues

## Support Resources

### Documentation
- **Core API:** https://docs.enterprise-openclaw.com/core
- **Enterprise API:** https://docs.enterprise-openclaw.com/enterprise
- **License System:** See `LICENSE_SYSTEM_GUIDE.md`

### Community
- **GitHub Issues:** https://github.com/enterprise-openclaw/enterprise-openclaw/issues
- **Discord:** https://discord.gg/enterprise-openclaw
- **Stack Overflow:** Tag `enterprise-openclaw`

### Enterprise Support
- **Email:** support@enterprise-openclaw.com
- **Slack:** Enterprise customers only
- **Phone:** +1-XXX-XXX-XXXX

## FAQ

### Q: Do I need a license for development?

A: No, you can use the core package for development. For enterprise features, generate test licenses using the test helpers.

### Q: Can I use v1.0.0 without a license?

A: Yes! The core package is Apache 2.0 and fully functional. You only need a license for enterprise features.

### Q: What happens if my license expires?

A: You have a 7-day grace period (offline cache). After that, enterprise features will be disabled until you renew.

### Q: Can I deploy without internet access?

A: Yes, offline mode works for 7 days. Contact us about air-gapped deployments.

### Q: How do I upgrade my license tier?

A: Contact sales@enterprise-openclaw.com. We'll issue a new license key.

## Checklist

- [ ] Updated dependencies to v1.0.0
- [ ] Updated imports to use new packages
- [ ] Added license initialization code
- [ ] Configured environment variables
- [ ] Updated tests to use test helpers
- [ ] Tested with valid license
- [ ] Tested offline mode
- [ ] Updated CI/CD pipelines
- [ ] Updated documentation
- [ ] Trained team on new structure

---

**Last Updated:** 2026-02-03
**Migration Tool:** Coming soon
**Estimated Migration Time:** 1-2 hours for typical project
