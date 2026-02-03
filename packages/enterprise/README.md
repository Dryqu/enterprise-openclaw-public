# @enterprise-openclaw/enterprise

Licensed enterprise features for Enterprise OpenClaw.

## Features

- **Advanced DRIFT RAG**: Full-featured DRIFT RAG with inference engine
- **Inference Engine**: Knowledge gap detection and automated reasoning
- **Security**: PII detection and comprehensive audit logging
- **Multi-Tenant**: Tenant isolation and management
- **Enterprise Connectors**: Advanced data source integrations

## License Required

This package requires a valid license key. Contact sales@enterprise-openclaw.com for licensing.

## Installation

```bash
npm install @enterprise-openclaw/enterprise
```

## Usage

```typescript
import { initializeLicense, hasFeature } from '@enterprise-openclaw/enterprise';

// Initialize with license key
await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!,
  serverUrl: 'https://license.enterprise-openclaw.com'
});

// Check feature availability
if (hasFeature('drift-rag-advanced')) {
  // Use advanced features
}
```

## License Tiers

- **Starter**: Basic enterprise features
- **Professional**: Advanced RAG and inference
- **Enterprise**: Full feature set with multi-tenant support

## Support

Enterprise support: support@enterprise-openclaw.com

## License

Proprietary - See LICENSE file
