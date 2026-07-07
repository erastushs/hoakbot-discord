import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionCleanupScheduler } from '../../src/core/auth/index.js';
import type { SessionCleanupService } from '../../src/core/auth/index.js';

describe('SessionCleanupScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts periodic session cleanup', async () => {
    vi.useFakeTimers();
    const cleanup = { cleanupExpiredSessions: vi.fn(async () => 1) } as unknown as SessionCleanupService;
    const logger = { info: vi.fn(), error: vi.fn() };
    const scheduler = new SessionCleanupScheduler(cleanup, logger, { intervalMs: 1000 });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(cleanup.cleanupExpiredSessions).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith({ intervalMs: 1000 }, 'Session cleanup scheduler started');
  });

  it('stops cleanup during shutdown', async () => {
    vi.useFakeTimers();
    const cleanup = { cleanupExpiredSessions: vi.fn(async () => 1) } as unknown as SessionCleanupService;
    const logger = { info: vi.fn(), error: vi.fn() };
    const scheduler = new SessionCleanupScheduler(cleanup, logger, { intervalMs: 1000 });

    scheduler.start();
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(cleanup.cleanupExpiredSessions).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Session cleanup scheduler stopped');
  });

  it('logs cleanup failures without throwing', async () => {
    vi.useFakeTimers();
    const error = new Error('cleanup failed');
    const cleanup = { cleanupExpiredSessions: vi.fn(async () => { throw error; }) } as unknown as SessionCleanupService;
    const logger = { info: vi.fn(), error: vi.fn() };
    const scheduler = new SessionCleanupScheduler(cleanup, logger, { intervalMs: 1000 });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(logger.error).toHaveBeenCalledWith({ error }, 'Session cleanup failed');
  });
});
