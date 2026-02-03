import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.base.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: '@enterprise-openclaw/enterprise',
      coverage: {
        thresholds: {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        }
      }
    }
  })
);
