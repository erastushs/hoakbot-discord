import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShrinePollingScheduler } from '../../src/modules/shrine/services/shrine-polling.scheduler.js';

const config = {
  enabled: true,
  guildId: 'guild-1',
  channelId: 'channel-1',
  nightLightBaseUrl: 'https://api.nightlight.gg/v1',
  imageCdnUrl: 'https://cdn.nightlight.gg/img/',
  polling: {
    pollIntervalMs: 30000,
    preResetWindowMs: 120000,
    delayedUpdateWindowMs: 600000,
    fallbackRetryMs: 300000,
  },
};

function makeLogger() {
  return { debug: vi.fn(), info: vi.fn(), error: vi.fn() };
}

describe('ShrinePollingScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with an immediate poll and then sleeps until the pre-reset window', async () => {
    vi.useFakeTimers();
    let now = Date.parse('2026-07-11T12:00:00Z');
    const reset = new Date('2026-07-11T15:00:00Z');
    const service = {
      pollAndAnnounce: vi.fn(async () => undefined),
      nextResetTime: vi.fn(() => reset),
    };
    const scheduler = new ShrinePollingScheduler(service as never, makeLogger(), config, () => now);

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(service.pollAndAnnounce).toHaveBeenCalledTimes(1);

    now = Date.parse('2026-07-11T14:58:00Z');
    await vi.advanceTimersByTimeAsync(1000 * 60 * 178);

    expect(service.pollAndAnnounce).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('falls back to lower-frequency retry after delayed update window', async () => {
    vi.useFakeTimers();
    let now = Date.parse('2026-07-11T15:01:00Z');
    const reset = new Date('2026-07-11T15:00:00Z');
    const service = {
      pollAndAnnounce: vi.fn(async () => undefined),
      nextResetTime: vi.fn(() => reset),
    };
    const logger = makeLogger();
    const scheduler = new ShrinePollingScheduler(service as never, logger, config, () => now);

    scheduler.start();
    await vi.runOnlyPendingTimersAsync();

    now = Date.parse('2026-07-11T15:12:00Z');
    await vi.advanceTimersByTimeAsync(30000);

    expect(logger.debug).toHaveBeenLastCalledWith({ delayMs: config.polling.fallbackRetryMs }, 'Next Shrine poll scheduled');
    scheduler.stop();
  });

  it('logs poll failures without stopping future polls', async () => {
    vi.useFakeTimers();
    const error = new Error('poll failed');
    const service = {
      pollAndAnnounce: vi.fn(async () => { throw error; }),
      nextResetTime: vi.fn(() => null),
    };
    const logger = makeLogger();
    const scheduler = new ShrinePollingScheduler(service as never, logger, config);

    scheduler.start();
    await vi.runOnlyPendingTimersAsync();

    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ message: 'poll failed' }) }), 'Shrine scheduled poll failed');
    expect(logger.debug).toHaveBeenCalledWith({ delayMs: config.polling.pollIntervalMs }, 'Next Shrine poll scheduled');
    scheduler.stop();
  });
});
