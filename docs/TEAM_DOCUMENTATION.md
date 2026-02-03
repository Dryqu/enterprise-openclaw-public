# Enterprise OpenClaw: Team Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Workflow](#development-workflow)
3. [Testing Guidelines](#testing-guidelines)
4. [Deployment Procedures](#deployment-procedures)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Best Practices](#best-practices)

## Architecture Overview

### Package Structure

```
enterprise-openclaw/
├── packages/
│   ├── core/                    # Open source (Apache 2.0)
│   │   ├── src/
│   │   │   ├── knowledge-graph/ # Graph operations
│   │   │   ├── rag/             # Basic RAG
│   │   │   └── types.ts         # Type definitions
│   │   └── tests/
│   │
│   ├── enterprise/              # Licensed features
│   │   ├── src/
│   │   │   ├── licensing/       # License system
│   │   │   ├── rag/             # Advanced DRIFT RAG
│   │   │   ├── knowledge-graph/ # Inference engine
│   │   │   └── security/        # PII, audit logging
│   │   ├── tests/               # 134 tests
│   │   └── scripts/             # CLI tools
│   │
│   └── cloud/                   # SaaS backend (future)
│
├── docs/                        # Documentation
└── package.json                 # Workspace root
```

### Technology Stack

**Core:**
- TypeScript 5.7.3
- Node.js >=20.0.0
- npm workspaces

**Libraries:**
- Anthropic SDK 0.32.1 (Claude integration)
- LanceDB 0.23.0 (vector store)
- Zod 3.25.76 (schema validation)
- Vitest 2.1.9 (testing)
- Pino 8.17.2 (logging)

**License System:**
- RS256 (JWT signatures)
- Undici 6.0.0 (HTTP client)
- Crypto (Node.js built-in)

## Development Workflow

### Initial Setup

```bash
# Clone repository
git clone https://github.com/enterprise-openclaw/enterprise-openclaw.git
cd enterprise-openclaw

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Daily Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes to code
# ...

# Run tests during development
npm run test:watch -w @enterprise-openclaw/enterprise

# Build before committing
npm run build

# Run full test suite
npm test

# Commit changes
git add .
git commit -m "feat: your feature description"
```

### Package Development

**Working on Core Package:**
```bash
cd packages/core

# Watch mode for development
npm run build -- --watch

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

**Working on Enterprise Package:**
```bash
cd packages/enterprise

# Build
npm run build

# Run specific tests
npm test -- license-validator.test.ts

# Generate test license
npm run generate-license -- --tier professional --customer "Test Corp" --contact "test@example.com"
```

### Adding New Features

#### 1. Core Features (Open Source)

```typescript
// packages/core/src/your-feature.ts
export class YourFeature {
  // Implementation
}

// packages/core/src/index.ts
export { YourFeature } from './your-feature.js';

// packages/core/tests/your-feature.test.ts
import { describe, it, expect } from 'vitest';
import { YourFeature } from '../src/your-feature.js';

describe('YourFeature', () => {
  it('should work', () => {
    // Test
  });
});
```

#### 2. Enterprise Features (Licensed)

```typescript
// packages/enterprise/src/your-feature.ts
import { getFeatureFlags } from './licensing/feature-flags.js';

export class YourEnterpriseFeature {
  constructor() {
    // Check license
    const flags = getFeatureFlags();
    flags.requireFeature('your-feature');
  }

  // Implementation
}

// Add to index.ts
export { YourEnterpriseFeature } from './your-feature.js';
```

## Testing Guidelines

### Testing Philosophy

We follow **RG-TDD (Reality-Grounded Test-Driven Development)**:

1. **Write tests FIRST**
2. **Tests must be realistic** (not mocks everywhere)
3. **Implement to pass tests**
4. **Refactor with confidence**

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Initialize test state
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Feature Area', () => {
    it('should do specific behavior', async () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = await performAction(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.value).toBe(expected);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific package tests
npm test -w @enterprise-openclaw/enterprise

# Run specific test file
npm test -w @enterprise-openclaw/enterprise -- license-validator.test.ts

# Run with coverage
npm run test:coverage -w @enterprise-openclaw/enterprise

# Watch mode
npm run test:watch -w @enterprise-openclaw/enterprise
```

### Coverage Requirements

- **License system:** 90%+ coverage (critical path)
- **Core features:** 80%+ coverage
- **Enterprise features:** 80%+ coverage
- **Integration tests:** Required for all major features

### Test Helpers

```typescript
// Use built-in test helpers
import { generateKeyPair, generateTestLicense } from '../test-utils/license-helpers.js';

const { publicKey, privateKey } = generateKeyPair();
const license = generateTestLicense(privateKey, {
  tier: 'enterprise',
  features: ['your-feature']
});
```

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Coverage requirements met
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately

### Version Bumping

```bash
# Patch (bug fixes)
npm version patch

# Minor (new features, backward compatible)
npm version minor

# Major (breaking changes)
npm version major
```

### Publishing Packages

**Core Package (Open Source):**
```bash
cd packages/core
npm version minor
npm publish --access public
```

**Enterprise Package (Licensed):**
```bash
cd packages/enterprise
npm version minor
npm publish --access restricted
```

### Deployment Environments

#### Development
- Branch: `develop`
- Auto-deploy on commit
- Uses test licenses

#### Staging
- Branch: `staging`
- Manual deploy
- Production-like environment
- Test licenses with real server

#### Production
- Branch: `main`
- Manual deploy with approval
- Real licenses
- Full monitoring

### Rollback Procedure

```bash
# If deployment fails
git revert HEAD
git push origin main

# Redeploy previous version
npm install @enterprise-openclaw/enterprise@previous-version
```

## Troubleshooting Guide

### Common Issues

#### Issue: "License not initialized"

**Symptom:**
```
Error: License not initialized. Call initializeLicense() first.
```

**Solution:**
```typescript
// Add at application startup
await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!
});
```

#### Issue: Build Fails

**Symptom:**
```
error TS2307: Cannot find module '@enterprise-openclaw/core'
```

**Solution:**
```bash
# Build core package first
npm run build -w @enterprise-openclaw/core

# Then build enterprise
npm run build -w @enterprise-openclaw/enterprise
```

#### Issue: Tests Fail After Changes

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build

# Run tests
npm test
```

#### Issue: Performance Degradation

**Check:**
1. License validation caching working?
2. Database connection pool size?
3. Memory leaks?
4. Metrics show anomalies?

**Debug:**
```typescript
// Enable metrics logging
import { getLicenseMetrics } from '@enterprise-openclaw/enterprise';

const metrics = getLicenseMetrics();
console.log(metrics.getComputedMetrics());
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=license:* npm start

# Or via environment variable
export DEBUG=license:*
export LOG_LEVEL=debug
```

### Getting Help

1. **Check documentation** in `/docs`
2. **Search issues** on GitHub
3. **Ask in Slack** #enterprise-openclaw channel
4. **Create GitHub issue** with reproduction steps
5. **Email support** support@enterprise-openclaw.com (enterprise customers)

## Best Practices

### Code Style

**TypeScript:**
```typescript
// Use explicit types
function validateLicense(key: string): Promise<ValidationResult> {
  // ...
}

// Prefer interfaces for objects
interface LicenseConfig {
  licenseKey: string;
  publicKey: string;
}

// Use async/await
async function init() {
  await initializeLicense(config);
}

// Handle errors properly
try {
  await validate();
} catch (error) {
  logger.error({ error }, 'Validation failed');
  throw error;
}
```

**Imports:**
```typescript
// Use explicit .js extensions
import { KnowledgeGraph } from './knowledge-graph.js';

// Group imports
import { createHash } from 'crypto';           // Node built-ins
import { KnowledgeGraph } from '@enterprise-openclaw/core';  // External
import { LicenseValidator } from './license-validator.js';   // Internal
```

### Error Handling

```typescript
// Always provide context
throw new Error(`License validation failed: ${reason}`);

// Log errors with structured logging
logger.error({ error, context }, 'Operation failed');

// Don't swallow errors
try {
  await operation();
} catch (error) {
  // Don't do this:
  // console.log('Error:', error);

  // Do this:
  logger.error({ error }, 'Operation failed');
  throw error; // or handle appropriately
}
```

### Performance

**Do:**
- ✅ Use in-memory caching
- ✅ Implement connection pooling
- ✅ Use async/await properly
- ✅ Monitor performance metrics

**Don't:**
- ❌ Block event loop
- ❌ Create new connections per request
- ❌ Ignore memory leaks
- ❌ Skip performance testing

### Security

**Do:**
- ✅ Validate all inputs
- ✅ Use prepared statements
- ✅ Implement rate limiting
- ✅ Log security events
- ✅ Keep dependencies updated

**Don't:**
- ❌ Expose private keys
- ❌ Log sensitive data
- ❌ Trust client input
- ❌ Skip authentication

### Git Workflow

**Commit Messages:**
```bash
# Format: type(scope): description

feat(license): add machine ID binding
fix(validator): handle expired licenses correctly
docs(readme): update installation instructions
test(license): add integration tests
refactor(core): simplify knowledge graph API
```

**Branch Naming:**
```bash
feature/add-machine-binding
fix/license-validation-bug
docs/update-readme
refactor/simplify-api
```

**Pull Requests:**
- Clear description
- Link to issue
- Screenshots (if UI changes)
- Tests added
- Documentation updated

### Code Review Checklist

- [ ] Tests added and passing
- [ ] Code follows style guide
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Error handling proper
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Additional Resources

### Internal Links
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [License System Guide](../LICENSE_SYSTEM_GUIDE.md)
- [Migration Guide](../MIGRATION_GUIDE.md)
- [RSA Key Generation](./RSA_KEY_GENERATION.md)
- [License Server Deployment](./LICENSE_SERVER_DEPLOYMENT.md)

### External Links
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [npm Workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [JWT Specification](https://datatracker.ietf.org/doc/html/rfc7519)

### Team Contacts

- **Architecture:** @tech-lead
- **DevOps:** @devops-team
- **Security:** @security-team
- **Support:** support@enterprise-openclaw.com

---

**Last Updated:** 2026-02-03
**Next Review:** 2026-03-03
**Maintainers:** Enterprise OpenClaw Core Team
