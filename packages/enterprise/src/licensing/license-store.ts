/**
 * License Store - Offline Cache
 *
 * File-based cache with SHA256 hash filenames and expiration checking
 */

import { createHash } from 'crypto';
import { mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ValidationResult } from './license-types.js';

interface CacheEntry {
  validationResult: ValidationResult;
  cachedAt: number;
}

export class LicenseStore {
  private cacheDir: string;
  private expirationDays: number;

  /**
   * Create a new license store
   * @param cacheDir - Directory for cache files (default: ~/.enterprise-openclaw/cache)
   * @param expirationDays - Number of days before cache expires (default: 7)
   */
  constructor(cacheDir?: string, expirationDays: number = 7) {
    this.cacheDir = cacheDir || join(homedir(), '.enterprise-openclaw', 'cache');
    this.expirationDays = expirationDays;

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate SHA256 cache key from license key
   */
  private getCacheKey(licenseKey: string): string {
    const hash = createHash('sha256');
    hash.update(licenseKey);
    return hash.digest('hex');
  }

  /**
   * Get cache file path
   */
  private getCachePath(licenseKey: string): string {
    const cacheKey = this.getCacheKey(licenseKey);
    return join(this.cacheDir, `${cacheKey}.json`);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(cachedAt: number): boolean {
    const now = Date.now();
    const expirationMs = this.expirationDays * 86400 * 1000; // days to milliseconds
    return (now - cachedAt) > expirationMs;
  }

  /**
   * Store validation result in cache
   */
  async set(licenseKey: string, validationResult: ValidationResult): Promise<void> {
    const cachePath = this.getCachePath(licenseKey);

    const cacheEntry: CacheEntry = {
      validationResult,
      cachedAt: Date.now()
    };

    try {
      writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
    } catch (error) {
      // Silently fail if we can't write cache
      console.error('Failed to write license cache:', error);
    }
  }

  /**
   * Retrieve validation result from cache
   * Returns null if cache doesn't exist, is expired, or is corrupted
   */
  async get(licenseKey: string): Promise<ValidationResult | null> {
    const cachePath = this.getCachePath(licenseKey);

    if (!existsSync(cachePath)) {
      return null;
    }

    try {
      const fileContent = readFileSync(cachePath, 'utf-8');
      const cacheEntry: CacheEntry = JSON.parse(fileContent);

      // Check if expired
      if (this.isExpired(cacheEntry.cachedAt)) {
        // Delete expired cache
        await this.clear(licenseKey);
        return null;
      }

      return cacheEntry.validationResult;
    } catch (error) {
      // Cache is corrupted, delete it
      try {
        unlinkSync(cachePath);
      } catch (deleteError) {
        // Ignore deletion errors
      }
      return null;
    }
  }

  /**
   * Clear cache entry for specific license key
   */
  async clear(licenseKey: string): Promise<void> {
    const cachePath = this.getCachePath(licenseKey);

    if (existsSync(cachePath)) {
      try {
        unlinkSync(cachePath);
      } catch (error) {
        // Silently fail if we can't delete cache
        console.error('Failed to delete license cache:', error);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(this.cacheDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.cacheDir, file);
          await fs.unlink(filePath).catch(() => {
            // Ignore errors
          });
        }
      }
    } catch (error) {
      console.error('Failed to clear license cache:', error);
    }
  }
}
