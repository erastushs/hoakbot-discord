export interface RateLimitRule {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: number;
  readonly retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  readonly now?: () => number;
  readonly cleanupIntervalMs?: number;
}

const DEFAULT_CLEANUP_INTERVAL_MS = 60_000;

export class RateLimiter {
  private readonly buckets = new Map<string, number[]>();
  private readonly now: () => number;
  private readonly cleanupIntervalMs: number;
  private lastCleanupAt: number;

  constructor(options: RateLimiterOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
    this.lastCleanupAt = this.now();
  }

  check(key: string, rule: RateLimitRule): RateLimitResult {
    const now = this.now();
    this.cleanup(now);

    const bucket = this.activeRequests(key, rule.windowMs, now);
    if (bucket.length >= rule.limit) {
      const resetAt = oldestTimestamp(bucket, now) + rule.windowMs;
      return {
        allowed: false,
        limit: rule.limit,
        remaining: 0,
        resetAt,
        retryAfterSeconds: secondsUntil(resetAt, now),
      };
    }

    bucket.push(now);
    this.buckets.set(key, bucket);
    const resetAt = oldestTimestamp(bucket, now) + rule.windowMs;

    return {
      allowed: true,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - bucket.length),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  cleanup(now = this.now()): void {
    if (now - this.lastCleanupAt < this.cleanupIntervalMs) {
      return;
    }

    for (const [key, timestamps] of this.buckets) {
      const newest = timestamps[timestamps.length - 1];
      if (newest === undefined || newest <= now - this.cleanupIntervalMs) {
        this.buckets.delete(key);
      }
    }

    this.lastCleanupAt = now;
  }

  bucketCount(): number {
    return this.buckets.size;
  }

  private activeRequests(key: string, windowMs: number, now: number): number[] {
    const windowStart = now - windowMs;
    return (this.buckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
  }
}

function secondsUntil(timestamp: number, now: number): number {
  return Math.max(1, Math.ceil((timestamp - now) / 1000));
}

function oldestTimestamp(bucket: readonly number[], fallback: number): number {
  return bucket[0] ?? fallback;
}
