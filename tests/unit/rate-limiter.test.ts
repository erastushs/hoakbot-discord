import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createRateLimitMiddleware, ok, rateLimitHeaders, RateLimiter } from '../../src/core/api/index.js';
import type { APIEndpoint } from '../../src/core/api/index.js';

function endpoint(): APIEndpoint {
  return {
    module: 'test',
    method: 'GET',
    path: '/limited',
    auth: 'public',
    metadata: { operationId: 'getLimited', tags: ['test'] },
    handler: async () => ok({ reached: true }),
  };
}

describe('RateLimiter', () => {
  it('tracks remaining count and reset time', () => {
    let now = 1_000;
    const limiter = new RateLimiter({ now: () => now });

    const first = limiter.check('client', { limit: 2, windowMs: 60_000 });
    const second = limiter.check('client', { limit: 2, windowMs: 60_000 });

    expect(first).toMatchObject({ allowed: true, remaining: 1, resetAt: 61_000, retryAfterSeconds: 0 });
    expect(second).toMatchObject({ allowed: true, remaining: 0, resetAt: 61_000, retryAfterSeconds: 0 });
  });

  it('expires requests outside the sliding window', () => {
    let now = 1_000;
    const limiter = new RateLimiter({ now: () => now });

    expect(limiter.check('client', { limit: 1, windowMs: 1_000 }).allowed).toBe(true);
    expect(limiter.check('client', { limit: 1, windowMs: 1_000 }).allowed).toBe(false);
    now = 2_001;
    expect(limiter.check('client', { limit: 1, windowMs: 1_000 }).allowed).toBe(true);
  });

  it('cleans inactive buckets automatically', () => {
    let now = 1_000;
    const limiter = new RateLimiter({ now: () => now, cleanupIntervalMs: 1_000 });

    limiter.check('client', { limit: 1, windowMs: 500 });
    expect(limiter.bucketCount()).toBe(1);
    now = 2_100;
    limiter.check('other-client', { limit: 1, windowMs: 500 });

    expect(limiter.bucketCount()).toBe(1);
  });

  it('returns Retry-After when the limit is exceeded', () => {
    let now = 1_000;
    const limiter = new RateLimiter({ now: () => now });

    limiter.check('client', { limit: 1, windowMs: 60_000 });
    now = 1_500;
    const exceeded = limiter.check('client', { limit: 1, windowMs: 60_000 });

    expect(exceeded).toMatchObject({ allowed: false, remaining: 0, resetAt: 61_000, retryAfterSeconds: 60 });
    expect(rateLimitHeaders(exceeded)).toMatchObject({
      'Retry-After': '60',
      'X-RateLimit-Limit': '1',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '61',
    });
  });
});

describe('rate limit middleware', () => {
  it('returns 429 envelopes and logs only when exceeded', async () => {
    const logger = { warn: vi.fn() };
    const router = new APIRouter();
    router.use(createRateLimitMiddleware({
      limiter: new RateLimiter({ now: () => 1_000 }),
      logger,
      rules: [{ name: 'limited', method: 'GET', path: '/api/v1/limited', limit: 1, windowMs: 60_000 }],
    }));
    router.register(endpoint());

    await expect(router.handle({ method: 'GET', path: '/api/v1/limited', ip: '127.0.0.1' })).resolves.toMatchObject({
      success: true,
      headers: { 'X-RateLimit-Limit': '1', 'X-RateLimit-Remaining': '0' },
    });
    await expect(router.handle({ method: 'GET', path: '/api/v1/limited', ip: '127.0.0.1' })).resolves.toMatchObject({
      success: false,
      status: 429,
      error: { code: 'RATE_LIMITED' },
      headers: { 'Retry-After': '60', 'X-RateLimit-Limit': '1', 'X-RateLimit-Remaining': '0' },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      { method: 'GET', path: '/api/v1/limited', rule: 'limited' },
      'Dashboard API rate limit exceeded',
    );
  });
});
