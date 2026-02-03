# Enterprise OpenClaw

**Version:** 1.0.0
**License:** Open-Core (Apache 2.0 for core, Proprietary for enterprise)
**Status:** ✅ Production Ready

---

## Overview

Enterprise OpenClaw is a GenAI-native multi-agent platform with self-improvement capabilities, featuring a sophisticated license validation system and open-core architecture.

### Key Features

- 🔓 **Open Source Core** - Knowledge graph, vector store, basic RAG (Apache 2.0)
- 🔒 **Enterprise Features** - Advanced DRIFT RAG, inference engine, security (Licensed)
- 🛡️ **License System** - Production-ready validation with offline support
- 📊 **Metrics & Monitoring** - Prometheus-ready performance tracking
- 🚀 **Production Tooling** - CLI tools, deployment guides, comprehensive docs

---

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Usage

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';
import { initializeLicense } from '@enterprise-openclaw/enterprise';

// Initialize license (for enterprise features)
await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!
});

// Use core features
const kg = new KnowledgeGraph('./data/kg');
await kg.initialize();
```

---

## Package Structure

```
packages/
├── core/          # Open source (Apache 2.0)
│   ├── Knowledge Graph
│   ├── Vector Store
│   └── Basic RAG
│
└── enterprise/    # Licensed features
    ├── License System
    ├── Advanced DRIFT RAG
    ├── Inference Engine
    └── Security Features
```

---

## Documentation

### Getting Started
- 📖 [**Implementation Summary**](./IMPLEMENTATION_SUMMARY.md) - Technical overview
- 🚀 [**License System Guide**](./LICENSE_SYSTEM_GUIDE.md) - Quick start
- 📋 [**Migration Guide**](./MIGRATION_GUIDE.md) - Upgrade from v0.9.x

### Operations
- 🔑 [**RSA Key Generation**](./docs/RSA_KEY_GENERATION.md) - Security setup
- 🌐 [**License Server Deployment**](./docs/LICENSE_SERVER_DEPLOYMENT.md) - Production deploy
- 👥 [**Team Documentation**](./docs/TEAM_DOCUMENTATION.md) - Developer handbook

### Reports
- ✅ [**Final Completion Report**](./FINAL_COMPLETION_REPORT.md) - Production readiness

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific package tests
npm test -w @enterprise-openclaw/enterprise
```

**Test Results:** 134/134 passing ✅
**Coverage:** 74.43% average, 90%+ critical paths

---

## Development

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Scripts

```bash
npm run build              # Build all packages
npm run test               # Run all tests
npm run test:core          # Test core package
npm run test:enterprise    # Test enterprise package
npm run lint               # Lint all packages
npm run clean              # Clean build artifacts
```

### Package Development

```bash
# Work on core package
cd packages/core
npm run build
npm test

# Work on enterprise package
cd packages/enterprise
npm run build
npm test
npm run generate-license  # Generate test licenses
```

---

## License Tiers

### 🌱 Starter
- Advanced DRIFT RAG
- 1 tenant, 10 concurrent tasks
- 100K tokens/month

### 💼 Professional
- All Starter features
- Inference engine, PII detection
- 5 tenants, 25 concurrent tasks
- 500K tokens/month

### 🏢 Enterprise
- All Professional features
- Multi-tenant, audit logging, connectors
- 10 tenants, 50 concurrent tasks
- 1M tokens/month

---

## Support

### Community
- 📧 Email: support@enterprise-openclaw.com
- 💬 GitHub Issues: [Report bugs](https://github.com/enterprise-openclaw/issues)

### Enterprise
- 🎯 Sales: sales@enterprise-openclaw.com
- 🆘 Priority Support: support@enterprise-openclaw.com
- 📞 Phone: Available for enterprise customers

---

## Contributing

We welcome contributions to the core package (Apache 2.0). See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Architecture

Enterprise OpenClaw uses a modern open-core architecture:

- **npm workspaces** - Multi-package monorepo
- **TypeScript** - Type-safe development
- **Vitest** - Fast, modern testing
- **LanceDB** - Vector storage
- **Zod** - Schema validation
- **JWT + RS256** - License validation

---

## Performance

- ⚡ <10ms cached validation
- ⚡ <50ms offline cache
- ⚡ <100ms first validation
- 📊 Prometheus metrics
- 🔍 Real-time monitoring

---

## Security

- 🔐 RS256 signature verification
- 🔒 SHA256 hashing
- 🛡️ Input validation (Zod)
- 📝 Audit logging
- 🔑 Offline grace period (7 days)

---

## Project Status

**Latest Release:** v1.0.0
**Release Date:** 2026-02-03
**Status:** Production Ready ✅

### Stats
- **Code:** 9,500+ lines
- **Tests:** 134 (100% passing)
- **Documentation:** 3,000+ lines
- **Guides:** 8 comprehensive docs

---

## Archive

Historical development files and planning documents are preserved in the [`archive/`](./archive/) directory for reference.

---

**Built with ❤️ by the Enterprise OpenClaw Team**

*Powered by Claude Sonnet 4.5*
