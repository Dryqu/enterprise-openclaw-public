# Production RSA Key Generation Guide

## Overview

This guide explains how to generate and securely manage RSA key pairs for license signing in Enterprise OpenClaw.

## Prerequisites

- OpenSSL installed (comes with most Unix systems)
- Secure workstation for key generation
- Secure storage solution (HSM recommended for production)

## Generate RSA Key Pair

### Step 1: Generate Private Key

```bash
# Generate 2048-bit RSA private key
openssl genrsa -out private_key.pem 2048

# For higher security, use 4096-bit (slower but more secure)
openssl genrsa -out private_key.pem 4096
```

**Output:** `private_key.pem`

### Step 2: Extract Public Key

```bash
# Extract public key from private key
openssl rsa -in private_key.pem -pubout -out public_key.pem
```

**Output:** `public_key.pem`

### Step 3: Verify Keys

```bash
# Verify private key
openssl rsa -in private_key.pem -check

# View public key
openssl rsa -in public_key.pem -pubin -text -noout
```

## Key Format

### Private Key Format (PKCS#8)

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...
-----END PRIVATE KEY-----
```

### Public Key Format (SPKI)

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApXvDxlpE...
...
-----END PUBLIC KEY-----
```

## Security Best Practices

### 1. Private Key Protection

**CRITICAL: The private key must be kept absolutely secret!**

- ✅ Store in Hardware Security Module (HSM) for production
- ✅ Use encrypted storage (AES-256)
- ✅ Restrict file permissions: `chmod 600 private_key.pem`
- ✅ Never commit to version control
- ✅ Limit access to authorized personnel only
- ✅ Use environment variables or secrets management
- ❌ Never expose in logs or error messages
- ❌ Never transmit over insecure channels
- ❌ Never store in application code

### 2. Public Key Distribution

The public key can be distributed publicly:

- ✅ Include in application packages
- ✅ Publish in documentation
- ✅ Embed in enterprise package
- ✅ Store in version control
- ✅ Distribute to customers

### 3. File Permissions

```bash
# Set restrictive permissions on private key
chmod 600 private_key.pem
chown $USER:$USER private_key.pem

# Public key can have normal permissions
chmod 644 public_key.pem
```

### 4. Key Storage Options

#### Development/Testing
```bash
# Store in local directory (NOT for production)
export PRIVATE_KEY_PATH="./keys/private_key.pem"
export PUBLIC_KEY_PATH="./keys/public_key.pem"
```

#### Production Options

**Option 1: Environment Variables**
```bash
export LICENSE_PRIVATE_KEY="$(cat private_key.pem)"
export LICENSE_PUBLIC_KEY="$(cat public_key.pem)"
```

**Option 2: AWS Secrets Manager**
```bash
aws secretsmanager create-secret \
  --name enterprise-openclaw/license-private-key \
  --secret-string file://private_key.pem
```

**Option 3: HashiCorp Vault**
```bash
vault kv put secret/license-keys \
  private_key=@private_key.pem \
  public_key=@public_key.pem
```

**Option 4: Hardware Security Module (HSM)**
- Use AWS CloudHSM, Azure Key Vault HSM, or physical HSM
- Keys never leave HSM
- Sign licenses via HSM API

## Key Rotation

### When to Rotate

- Every 12-24 months (recommended)
- If private key is compromised
- Before major version releases
- As part of security audit

### Rotation Process

1. **Generate new key pair**
   ```bash
   openssl genrsa -out private_key_v2.pem 2048
   openssl rsa -in private_key_v2.pem -pubout -out public_key_v2.pem
   ```

2. **Sign new licenses with new key**
   - Start issuing licenses with new private key
   - Include key version in license payload

3. **Support both keys in validator**
   - Keep old public key for existing licenses
   - Add new public key for new licenses
   - Implement key versioning

4. **Phase out old key**
   - After grace period (6-12 months)
   - When all licenses renewed
   - Archive old keys securely

### Multi-Key Support

```typescript
// Support multiple public keys for key rotation
const publicKeys = {
  v1: PUBLIC_KEY_V1,
  v2: PUBLIC_KEY_V2
};

// Try each key until one works
for (const [version, publicKey] of Object.entries(publicKeys)) {
  if (verifySignature(license, publicKey)) {
    console.log(`Verified with key version: ${version}`);
    break;
  }
}
```

## Key Backup and Recovery

### Backup Strategy

```bash
# Encrypt backup with strong passphrase
openssl enc -aes-256-cbc -salt \
  -in private_key.pem \
  -out private_key.pem.enc

# Store encrypted backup in multiple locations:
# 1. Encrypted cloud storage (AWS S3, Google Cloud Storage)
# 2. Offline secure storage (safe, vault)
# 3. Split-key storage (Shamir's Secret Sharing)
```

### Recovery Process

```bash
# Decrypt backup
openssl enc -aes-256-cbc -d \
  -in private_key.pem.enc \
  -out private_key.pem

# Verify integrity
openssl rsa -in private_key.pem -check
```

## Integration with License System

### 1. Store Public Key in Enterprise Package

```typescript
// packages/enterprise/src/licensing/public-key.ts
export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApXvDxlpE...
-----END PUBLIC KEY-----`;
```

### 2. Configure Validator

```typescript
import { initializeLicense } from '@enterprise-openclaw/enterprise';
import { LICENSE_PUBLIC_KEY } from './licensing/public-key.js';

await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: LICENSE_PUBLIC_KEY,
  serverUrl: 'https://license.enterprise-openclaw.com'
});
```

### 3. Sign Licenses with Private Key

```typescript
// Use private key to sign licenses (server-side only!)
import { createSign } from 'crypto';

function signLicense(payload: LicensePayload, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };

  const encodedHeader = Buffer.from(JSON.stringify(header))
    .toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64url');

  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const sign = createSign('RSA-SHA256');
  sign.update(dataToSign);
  sign.end();

  const signature = sign.sign(privateKey, 'base64url');

  return `${dataToSign}.${signature}`;
}
```

## Security Audit Checklist

- [ ] Private key stored in HSM or encrypted storage
- [ ] Private key never exposed in logs
- [ ] Private key not in version control
- [ ] Private key file permissions set to 600
- [ ] Private key access restricted to authorized personnel
- [ ] Backup strategy implemented
- [ ] Key rotation schedule defined
- [ ] Public key distributed with application
- [ ] License signing isolated to secure environment
- [ ] Monitoring for suspicious license generation

## Troubleshooting

### Issue: "bad decrypt" Error

**Cause:** Wrong passphrase for encrypted key

**Solution:**
```bash
# Remove passphrase protection
openssl rsa -in private_key.pem -out private_key_no_pass.pem
```

### Issue: "unable to load Private Key"

**Cause:** Incorrect key format or corrupted file

**Solution:**
```bash
# Verify key format
openssl rsa -in private_key.pem -text -noout

# Convert to PKCS#8 if needed
openssl pkcs8 -topk8 -inform PEM -outform PEM \
  -in private_key.pem -out private_key_pkcs8.pem -nocrypt
```

### Issue: Signature Verification Fails

**Cause:** Public/private key mismatch

**Solution:**
```bash
# Verify keys match
openssl rsa -in private_key.pem -pubout | \
  diff - public_key.pem
```

## Example: Complete Setup

```bash
#!/bin/bash
# Production key generation script

set -e

echo "Generating Enterprise OpenClaw license signing keys..."

# Create secure directory
mkdir -p ~/.enterprise-openclaw/keys
chmod 700 ~/.enterprise-openclaw/keys

# Generate private key
openssl genrsa -out ~/.enterprise-openclaw/keys/private_key.pem 2048
chmod 600 ~/.enterprise-openclaw/keys/private_key.pem

# Extract public key
openssl rsa \
  -in ~/.enterprise-openclaw/keys/private_key.pem \
  -pubout \
  -out ~/.enterprise-openclaw/keys/public_key.pem

echo "✓ Keys generated successfully"
echo ""
echo "Private key: ~/.enterprise-openclaw/keys/private_key.pem"
echo "Public key: ~/.enterprise-openclaw/keys/public_key.pem"
echo ""
echo "⚠️  WARNING: Keep private key absolutely secret!"
echo "   Store in HSM for production use."
```

## References

- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [RFC 7517 - JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [NIST Key Management Guidelines](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf)

---

**Last Updated:** 2026-02-03
**Recommended Key Size:** 2048-bit minimum (4096-bit preferred)
**Key Rotation:** Every 12-24 months
