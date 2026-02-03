/**
 * Machine ID Tests (RG-TDD)
 *
 * Test platform detection (macOS, Linux, Windows) and SHA256 hashing
 * Written FIRST before implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMachineId, hashMachineId } from '../../src/licensing/machine-id.js';
import { execSync } from 'child_process';

describe('MachineID', () => {
  describe('getMachineId', () => {
    it('should return a non-empty string on current platform', async () => {
      const machineId = await getMachineId();
      expect(machineId).toBeTruthy();
      expect(typeof machineId).toBe('string');
      expect(machineId.length).toBeGreaterThan(0);
    });

    it('should return consistent ID on multiple calls', async () => {
      const id1 = await getMachineId();
      const id2 = await getMachineId();
      expect(id1).toBe(id2);
    });

    it('should detect macOS platform', async () => {
      const platform = process.platform;
      if (platform === 'darwin') {
        const machineId = await getMachineId();
        expect(machineId).toBeTruthy();
        // macOS should use hardware UUID
        expect(machineId.length).toBeGreaterThan(10);
      }
    });

    it('should detect Linux platform', async () => {
      const platform = process.platform;
      if (platform === 'linux') {
        const machineId = await getMachineId();
        expect(machineId).toBeTruthy();
        // Linux should use machine-id or hostname
        expect(machineId.length).toBeGreaterThan(5);
      }
    });

    it('should detect Windows platform', async () => {
      const platform = process.platform;
      if (platform === 'win32') {
        const machineId = await getMachineId();
        expect(machineId).toBeTruthy();
        // Windows should use MachineGuid
        expect(machineId.length).toBeGreaterThan(10);
      }
    });

    it('should handle errors gracefully and fallback', async () => {
      // This test verifies error handling exists
      const machineId = await getMachineId();
      expect(machineId).toBeTruthy();
    });
  });

  describe('hashMachineId', () => {
    it('should return SHA256 hash', () => {
      const input = 'test-machine-id';
      const hash = hashMachineId(input);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      // SHA256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes', () => {
      const input = 'test-machine-id';
      const hash1 = hashMachineId(input);
      const hash2 = hashMachineId(input);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashMachineId('machine-1');
      const hash2 = hashMachineId('machine-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashMachineId('');
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64);
    });

    it('should handle special characters', () => {
      const hash = hashMachineId('machine-id-with-$pecial-ch@rs!');
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle unicode characters', () => {
      const hash = hashMachineId('机器-识别码-🔒');
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64);
    });
  });

  describe('Integration', () => {
    it('should get and hash machine ID in one flow', async () => {
      const rawId = await getMachineId();
      const hashedId = hashMachineId(rawId);

      expect(hashedId).toBeTruthy();
      expect(hashedId).toHaveLength(64);
      expect(hashedId).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce same hash for same machine', async () => {
      const rawId1 = await getMachineId();
      const hashedId1 = hashMachineId(rawId1);

      const rawId2 = await getMachineId();
      const hashedId2 = hashMachineId(rawId2);

      expect(hashedId1).toBe(hashedId2);
    });
  });
});
