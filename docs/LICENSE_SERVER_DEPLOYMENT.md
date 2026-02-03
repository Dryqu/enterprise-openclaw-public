# License Validation Server Deployment Guide

## Overview

The license validation server provides phone-home validation for Enterprise OpenClaw licenses. It verifies licenses, tracks usage, and detects abuse.

## Architecture

```
┌─────────────┐                    ┌──────────────────┐
│   Client    │                    │  License Server  │
│             │                    │                  │
│  License    │  POST /validate   │  ┌────────────┐  │
│  Validator  ├───────────────────>│  │  API       │  │
│             │                    │  │  Handler   │  │
│             │<───────────────────┤  └────────────┘  │
│             │   200 OK/403       │         │        │
└─────────────┘                    │  ┌──────▼──────┐ │
                                   │  │  Database   │ │
                                   │  │  (Postgres) │ │
                                   │  └─────────────┘ │
                                   └──────────────────┘
```

## API Specification

### POST /validate

Validate a license and track usage.

**Request:**
```json
{
  "license_key": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "machine_id": "sha256_hash_of_machine_id",
  "timestamp": 1706918400000,
  "version": "1.0.0"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "cached_until": 1706922000000
}
```

**Response (Failure):**
```json
{
  "valid": false,
  "reason": "License expired"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1706918400000
}
```

## Database Schema

### Table: licenses

Stores issued licenses for tracking and validation.

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL,
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  machine_id VARCHAR(64),
  issued_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licenses_customer_id ON licenses(customer_id);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
```

### Table: license_validations

Tracks all validation attempts for monitoring and analytics.

```sql
CREATE TABLE license_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  license_key TEXT NOT NULL,
  machine_id VARCHAR(64),
  client_version VARCHAR(50),
  client_ip INET,
  validation_result BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  validated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_validations_license_id ON license_validations(license_id);
CREATE INDEX idx_validations_validated_at ON license_validations(validated_at);
CREATE INDEX idx_validations_result ON license_validations(validation_result);
```

### Table: license_metrics

Aggregated metrics for monitoring.

```sql
CREATE TABLE license_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  date DATE NOT NULL,
  validation_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  unique_machines INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(license_id, date)
);

CREATE INDEX idx_metrics_license_date ON license_metrics(license_id, date);
```

## Implementation Example (Node.js + Express)

### server.ts

```typescript
import express from 'express';
import { createVerify } from 'crypto';
import { Pool } from 'pg';
import pino from 'pino';

const app = express();
const logger = pino();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Request received');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now()
  });
});

// License validation
app.post('/validate', async (req, res) => {
  try {
    const { license_key, machine_id, timestamp, version } = req.body;

    if (!license_key) {
      return res.status(400).json({
        valid: false,
        reason: 'Missing license_key'
      });
    }

    // Parse JWT
    const parts = license_key.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({
        valid: false,
        reason: 'Invalid JWT format'
      });
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // Decode payload
    const payloadJson = Buffer.from(
      encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf-8');
    const payload = JSON.parse(payloadJson);

    // Check if license exists in database
    const licenseResult = await pool.query(
      'SELECT * FROM licenses WHERE license_key = $1',
      [license_key]
    );

    if (licenseResult.rows.length === 0) {
      // Log validation attempt
      await logValidation(license_key, machine_id, version, req.ip, false, 'License not found');

      return res.status(403).json({
        valid: false,
        reason: 'License not found'
      });
    }

    const license = licenseResult.rows[0];

    // Check if license is active
    if (!license.is_active) {
      await logValidation(license.id, machine_id, version, req.ip, false, 'License inactive');

      return res.status(403).json({
        valid: false,
        reason: 'License inactive'
      });
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      await logValidation(license.id, machine_id, version, req.ip, false, 'License expired');

      return res.status(403).json({
        valid: false,
        reason: 'License expired'
      });
    }

    // Check machine ID if bound
    if (license.machine_id && machine_id !== license.machine_id) {
      await logValidation(license.id, machine_id, version, req.ip, false, 'Machine ID mismatch');

      return res.status(403).json({
        valid: false,
        reason: 'Machine ID mismatch'
      });
    }

    // Log successful validation
    await logValidation(license.id, machine_id, version, req.ip, true, null);

    // Update metrics
    await updateMetrics(license.id, machine_id);

    // Return success with cache duration
    res.json({
      valid: true,
      cached_until: Date.now() + (3600 * 1000) // 1 hour
    });

  } catch (error) {
    logger.error({ error }, 'Validation error');
    res.status(500).json({
      valid: false,
      reason: 'Internal server error'
    });
  }
});

// Helper: Log validation attempt
async function logValidation(
  licenseId: string,
  machineId: string | null,
  version: string,
  clientIp: string,
  result: boolean,
  reason: string | null
) {
  await pool.query(
    `INSERT INTO license_validations
     (license_id, machine_id, client_version, client_ip, validation_result, failure_reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [licenseId, machineId, version, clientIp, result, reason]
  );
}

// Helper: Update metrics
async function updateMetrics(licenseId: string, machineId: string | null) {
  const today = new Date().toISOString().split('T')[0];

  await pool.query(
    `INSERT INTO license_metrics (license_id, date, validation_count, success_count, unique_machines)
     VALUES ($1, $2, 1, 1, 1)
     ON CONFLICT (license_id, date)
     DO UPDATE SET
       validation_count = license_metrics.validation_count + 1,
       success_count = license_metrics.success_count + 1,
       updated_at = NOW()`,
    [licenseId, today]
  );
}

// Start server
app.listen(port, () => {
  logger.info({ port }, 'License server started');
});
```

## Deployment Options

### Option 1: AWS (Recommended)

**Architecture:**
- ECS/Fargate for API server
- RDS PostgreSQL for database
- Application Load Balancer
- Route 53 for DNS
- Certificate Manager for SSL

**Deployment:**
```bash
# Build Docker image
docker build -t license-server .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
docker tag license-server:latest $ECR_URI/license-server:latest
docker push $ECR_URI/license-server:latest

# Deploy to ECS
aws ecs update-service --cluster license-cluster --service license-service --force-new-deployment
```

### Option 2: Google Cloud

**Architecture:**
- Cloud Run for API server
- Cloud SQL PostgreSQL
- Cloud Load Balancer
- Cloud DNS

### Option 3: Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: license-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: license-server
  template:
    metadata:
      labels:
        app: license-server
    spec:
      containers:
      - name: license-server
        image: license-server:latest
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: license-server
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 3000
  selector:
    app: license-server
```

## Monitoring and Alerting

### Metrics to Track

1. **Validation Metrics**
   - Total validations per minute/hour/day
   - Success rate
   - Failure rate by reason
   - P50/P95/P99 latency

2. **License Metrics**
   - Active licenses
   - Expiring soon (< 30 days)
   - Expired licenses
   - Licenses by tier

3. **Security Metrics**
   - Invalid license attempts
   - Machine ID mismatches
   - Rate limit violations
   - Suspicious patterns

### Alerts

```yaml
# Prometheus alert rules
groups:
  - name: license_server
    rules:
      - alert: HighFailureRate
        expr: rate(license_validation_failure[5m]) > 0.1
        annotations:
          summary: "High license validation failure rate"

      - alert: ServerDown
        expr: up{job="license-server"} == 0
        annotations:
          summary: "License server is down"

      - alert: DatabaseConnectionFailed
        expr: license_db_connection_errors > 0
        annotations:
          summary: "Database connection failures"
```

## Security Considerations

### 1. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/validate', limiter);
```

### 2. DDoS Protection

- Use CloudFlare or AWS Shield
- Implement request throttling
- Monitor for suspicious patterns

### 3. Database Security

- Use connection pooling
- Enable SSL/TLS
- Implement prepared statements
- Regular backups

### 4. Audit Logging

```typescript
// Log all validation attempts
logger.info({
  event: 'license_validation',
  license_id: license.id,
  customer_id: license.customer_id,
  machine_id,
  result,
  client_ip: req.ip
});
```

## Maintenance

### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > backup-$(date +\%Y\%m\%d).sql.gz
```

### Log Rotation

```bash
# Rotate logs weekly
/var/log/license-server/*.log {
    weekly
    rotate 52
    compress
    delaycompress
    notifempty
}
```

### Certificate Renewal

```bash
# Auto-renew Let's Encrypt certificates
0 0 1 * * certbot renew --quiet
```

## Testing

### Load Testing

```bash
# Use artillery for load testing
artillery quick --count 100 --num 10 https://license.example.com/validate
```

### Integration Testing

```typescript
import { test, expect } from '@playwright/test';

test('license validation succeeds', async ({ request }) => {
  const response = await request.post('/validate', {
    data: {
      license_key: validLicense,
      machine_id: testMachineId,
      timestamp: Date.now(),
      version: '1.0.0'
    }
  });

  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.valid).toBe(true);
});
```

---

**Last Updated:** 2026-02-03
**Recommended Stack:** Node.js + Express + PostgreSQL
**Hosting:** AWS ECS/Fargate (recommended)
