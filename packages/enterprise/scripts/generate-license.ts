#!/usr/bin/env node
/**
 * License Generation CLI Tool
 *
 * Generate signed license keys for Enterprise OpenClaw
 *
 * Usage:
 *   npm run generate-license -- \
 *     --tier enterprise \
 *     --customer "Acme Corp" \
 *     --duration 365 \
 *     --features drift-rag-advanced,inference-engine
 */

import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import { program } from 'commander';
import type { LicensePayload } from '../src/licensing/license-types.js';

// Parse command line arguments
program
  .name('generate-license')
  .description('Generate Enterprise OpenClaw license keys')
  .requiredOption('--tier <tier>', 'License tier (starter|professional|enterprise)')
  .requiredOption('--customer <name>', 'Customer company name')
  .requiredOption('--contact <email>', 'Customer contact email')
  .option('--duration <days>', 'License duration in days', '365')
  .option('--features <list>', 'Comma-separated feature list')
  .option('--machine-id <id>', 'Optional machine ID binding')
  .option('--private-key <path>', 'Path to private key', './private_key.pem')
  .option('--customer-id <id>', 'Customer ID (auto-generated if not provided)')
  .parse();

const options = program.opts();

// Validate tier
const validTiers = ['starter', 'professional', 'enterprise'];
if (!validTiers.includes(options.tier)) {
  console.error(`Error: Invalid tier "${options.tier}"`);
  console.error(`Valid tiers: ${validTiers.join(', ')}`);
  process.exit(1);
}

// Validate email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(options.contact)) {
  console.error(`Error: Invalid email address "${options.contact}"`);
  process.exit(1);
}

// Load private key
let privateKey: string;
try {
  privateKey = readFileSync(options.privateKey, 'utf-8');
} catch (error) {
  console.error(`Error: Could not read private key from ${options.privateKey}`);
  console.error('Generate keys with: openssl genrsa -out private_key.pem 2048');
  process.exit(1);
}

// Define tier-specific features and limits
const tierConfig = {
  starter: {
    features: ['drift-rag-advanced'],
    limits: {
      max_tenants: 1,
      max_concurrent_tasks: 10,
      max_tokens_per_month: 100000
    }
  },
  professional: {
    features: ['drift-rag-advanced', 'inference-engine', 'pii-detection'],
    limits: {
      max_tenants: 5,
      max_concurrent_tasks: 25,
      max_tokens_per_month: 500000
    }
  },
  enterprise: {
    features: [
      'drift-rag-advanced',
      'inference-engine',
      'multi-tenant',
      'pii-detection',
      'audit-logging',
      'connectors'
    ],
    limits: {
      max_tenants: 10,
      max_concurrent_tasks: 50,
      max_tokens_per_month: 1000000
    }
  }
};

// Override features if provided
const features = options.features
  ? options.features.split(',').map((f: string) => f.trim())
  : tierConfig[options.tier as keyof typeof tierConfig].features;

// Generate customer ID if not provided
const customerId = options.customerId ||
  `${options.customer.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`;

// Calculate timestamps
const now = Math.floor(Date.now() / 1000);
const duration = parseInt(options.duration);
const expirationDate = now + (duration * 86400);

// Create license payload
const payload: LicensePayload = {
  iss: 'enterprise-openclaw',
  sub: customerId,
  iat: now,
  exp: expirationDate,
  tier: options.tier,
  features,
  limits: tierConfig[options.tier as keyof typeof tierConfig].limits,
  company: options.customer,
  contact: options.contact
};

// Add machine ID if provided
if (options.machineId) {
  payload.machine_id = options.machineId;
}

// Create JWT header
const header = {
  alg: 'RS256',
  typ: 'JWT'
};

// Encode header and payload
const encodedHeader = Buffer.from(JSON.stringify(header))
  .toString('base64url');
const encodedPayload = Buffer.from(JSON.stringify(payload))
  .toString('base64url');

// Sign the license
const dataToSign = `${encodedHeader}.${encodedPayload}`;
const sign = createSign('RSA-SHA256');
sign.update(dataToSign);
sign.end();

const signature = sign.sign(privateKey, 'base64url');
const licenseKey = `${dataToSign}.${signature}`;

// Calculate expiration date
const expirationDateString = new Date(expirationDate * 1000).toISOString();

// Output results
console.log('\n✅ License Generated Successfully!\n');
console.log('='.repeat(80));
console.log('\nLicense Details:');
console.log('-'.repeat(80));
console.log(`Customer:      ${options.customer}`);
console.log(`Contact:       ${options.contact}`);
console.log(`Customer ID:   ${customerId}`);
console.log(`Tier:          ${options.tier}`);
console.log(`Duration:      ${duration} days`);
console.log(`Expires:       ${expirationDateString}`);
console.log(`Features:      ${features.join(', ')}`);
console.log(`Limits:        ${JSON.stringify(payload.limits, null, 2)}`);
if (payload.machine_id) {
  console.log(`Machine ID:    ${payload.machine_id}`);
}
console.log('\n' + '='.repeat(80));
console.log('\nLicense Key:');
console.log('-'.repeat(80));
console.log(licenseKey);
console.log('-'.repeat(80));

// Output environment variable format
console.log('\n📋 Environment Variable:');
console.log('-'.repeat(80));
console.log(`ENTERPRISE_LICENSE_KEY="${licenseKey}"`);
console.log('-'.repeat(80));

// Output JSON format for record keeping
const record = {
  customer: options.customer,
  contact: options.contact,
  customer_id: customerId,
  tier: options.tier,
  issued_at: new Date(now * 1000).toISOString(),
  expires_at: expirationDateString,
  duration_days: duration,
  features,
  limits: payload.limits,
  machine_id: payload.machine_id || null,
  license_key: licenseKey
};

console.log('\n💾 Record (save this for your records):');
console.log('-'.repeat(80));
console.log(JSON.stringify(record, null, 2));
console.log('-'.repeat(80));

console.log('\n⚠️  IMPORTANT:');
console.log('   1. Store the license key securely');
console.log('   2. Share only with authorized customer contacts');
console.log('   3. Keep the record in your license database');
console.log('   4. The private key must remain secret');
console.log('\n');
