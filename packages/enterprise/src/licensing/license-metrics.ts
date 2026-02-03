/**
 * License Metrics
 *
 * Track and monitor license validation metrics for observability
 */

export interface LicenseMetrics {
  // Validation metrics
  validation_count: number;
  validation_success_count: number;
  validation_failure_count: number;
  validation_latency_ms: number[];

  // Phone-home metrics
  phone_home_count: number;
  phone_home_success_count: number;
  phone_home_failure_count: number;
  phone_home_latency_ms: number[];

  // Cache metrics
  cache_hit_count: number;
  cache_miss_count: number;
  offline_mode_usage_count: number;

  // Error metrics
  errors_by_reason: Record<string, number>;

  // Timestamp
  last_updated: number;
}

export class LicenseMetricsCollector {
  private metrics: LicenseMetrics;

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): LicenseMetrics {
    return {
      validation_count: 0,
      validation_success_count: 0,
      validation_failure_count: 0,
      validation_latency_ms: [],
      phone_home_count: 0,
      phone_home_success_count: 0,
      phone_home_failure_count: 0,
      phone_home_latency_ms: [],
      cache_hit_count: 0,
      cache_miss_count: 0,
      offline_mode_usage_count: 0,
      errors_by_reason: {},
      last_updated: Date.now()
    };
  }

  /**
   * Record a validation attempt
   */
  recordValidation(success: boolean, latencyMs: number, reason?: string): void {
    this.metrics.validation_count++;

    if (success) {
      this.metrics.validation_success_count++;
    } else {
      this.metrics.validation_failure_count++;

      if (reason) {
        this.metrics.errors_by_reason[reason] =
          (this.metrics.errors_by_reason[reason] || 0) + 1;
      }
    }

    this.metrics.validation_latency_ms.push(latencyMs);

    // Keep only last 1000 latency measurements
    if (this.metrics.validation_latency_ms.length > 1000) {
      this.metrics.validation_latency_ms =
        this.metrics.validation_latency_ms.slice(-1000);
    }

    this.metrics.last_updated = Date.now();
  }

  /**
   * Record a phone-home attempt
   */
  recordPhoneHome(success: boolean, latencyMs: number): void {
    this.metrics.phone_home_count++;

    if (success) {
      this.metrics.phone_home_success_count++;
    } else {
      this.metrics.phone_home_failure_count++;
    }

    this.metrics.phone_home_latency_ms.push(latencyMs);

    // Keep only last 1000 latency measurements
    if (this.metrics.phone_home_latency_ms.length > 1000) {
      this.metrics.phone_home_latency_ms =
        this.metrics.phone_home_latency_ms.slice(-1000);
    }

    this.metrics.last_updated = Date.now();
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.metrics.cache_hit_count++;
    this.metrics.last_updated = Date.now();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.metrics.cache_miss_count++;
    this.metrics.last_updated = Date.now();
  }

  /**
   * Record offline mode usage
   */
  recordOfflineMode(): void {
    this.metrics.offline_mode_usage_count++;
    this.metrics.last_updated = Date.now();
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): LicenseMetrics {
    return { ...this.metrics };
  }

  /**
   * Get computed metrics (percentiles, rates, etc.)
   */
  getComputedMetrics(): {
    validation_success_rate: number;
    validation_failure_rate: number;
    validation_latency_p50: number;
    validation_latency_p95: number;
    validation_latency_p99: number;
    phone_home_success_rate: number;
    phone_home_latency_p50: number;
    phone_home_latency_p95: number;
    phone_home_latency_p99: number;
    cache_hit_rate: number;
  } {
    const validationTotal = this.metrics.validation_count || 1;
    const phoneHomeTotal = this.metrics.phone_home_count || 1;
    const cacheTotal = this.metrics.cache_hit_count + this.metrics.cache_miss_count || 1;

    return {
      validation_success_rate:
        this.metrics.validation_success_count / validationTotal,
      validation_failure_rate:
        this.metrics.validation_failure_count / validationTotal,
      validation_latency_p50: this.percentile(
        this.metrics.validation_latency_ms,
        0.5
      ),
      validation_latency_p95: this.percentile(
        this.metrics.validation_latency_ms,
        0.95
      ),
      validation_latency_p99: this.percentile(
        this.metrics.validation_latency_ms,
        0.99
      ),
      phone_home_success_rate:
        this.metrics.phone_home_success_count / phoneHomeTotal,
      phone_home_latency_p50: this.percentile(
        this.metrics.phone_home_latency_ms,
        0.5
      ),
      phone_home_latency_p95: this.percentile(
        this.metrics.phone_home_latency_ms,
        0.95
      ),
      phone_home_latency_p99: this.percentile(
        this.metrics.phone_home_latency_ms,
        0.99
      ),
      cache_hit_rate: this.metrics.cache_hit_count / cacheTotal
    };
  }

  /**
   * Calculate percentile from array
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;

    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheus(): string {
    const computed = this.getComputedMetrics();

    return `
# HELP license_validation_total Total number of license validations
# TYPE license_validation_total counter
license_validation_total ${this.metrics.validation_count}

# HELP license_validation_success Total successful validations
# TYPE license_validation_success counter
license_validation_success ${this.metrics.validation_success_count}

# HELP license_validation_failure Total failed validations
# TYPE license_validation_failure counter
license_validation_failure ${this.metrics.validation_failure_count}

# HELP license_validation_success_rate Success rate of validations
# TYPE license_validation_success_rate gauge
license_validation_success_rate ${computed.validation_success_rate.toFixed(4)}

# HELP license_validation_latency_p50 P50 validation latency in ms
# TYPE license_validation_latency_p50 gauge
license_validation_latency_p50 ${computed.validation_latency_p50.toFixed(2)}

# HELP license_validation_latency_p95 P95 validation latency in ms
# TYPE license_validation_latency_p95 gauge
license_validation_latency_p95 ${computed.validation_latency_p95.toFixed(2)}

# HELP license_validation_latency_p99 P99 validation latency in ms
# TYPE license_validation_latency_p99 gauge
license_validation_latency_p99 ${computed.validation_latency_p99.toFixed(2)}

# HELP license_phone_home_total Total phone-home attempts
# TYPE license_phone_home_total counter
license_phone_home_total ${this.metrics.phone_home_count}

# HELP license_phone_home_success_rate Phone-home success rate
# TYPE license_phone_home_success_rate gauge
license_phone_home_success_rate ${computed.phone_home_success_rate.toFixed(4)}

# HELP license_cache_hit_rate Cache hit rate
# TYPE license_cache_hit_rate gauge
license_cache_hit_rate ${computed.cache_hit_rate.toFixed(4)}

# HELP license_offline_mode_usage Offline mode usage count
# TYPE license_offline_mode_usage counter
license_offline_mode_usage ${this.metrics.offline_mode_usage_count}
`.trim();
  }

  /**
   * Export metrics in JSON format
   */
  toJSON(): string {
    return JSON.stringify(
      {
        ...this.metrics,
        computed: this.getComputedMetrics()
      },
      null,
      2
    );
  }
}

// Global metrics collector instance
let globalMetrics: LicenseMetricsCollector | null = null;

/**
 * Get or create global metrics collector
 */
export function getLicenseMetrics(): LicenseMetricsCollector {
  if (!globalMetrics) {
    globalMetrics = new LicenseMetricsCollector();
  }
  return globalMetrics;
}

/**
 * Reset global metrics
 */
export function resetLicenseMetrics(): void {
  if (globalMetrics) {
    globalMetrics.reset();
  }
}
