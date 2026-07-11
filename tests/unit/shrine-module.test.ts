import { afterEach, describe, expect, it, vi } from 'vitest';

import { Container } from '../../src/core/container/container.js';
import { TOKENS } from '../../src/core/container/tokens.js';
import { ShrineModule } from '../../src/modules/shrine/shrine.module.js';
import { ShrinePollingScheduler } from '../../src/modules/shrine/services/shrine-polling.scheduler.js';

const shrineConfig = {
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
  dev: {
    forceAnnouncementOnStartup: true,
  },
};

function makeLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
}

function makeEventBus() {
  const handlers = new Map<string, (payload: unknown) => void>();
  return {
    subscribe: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);
      return { unsubscribe: vi.fn() };
    }),
    once: vi.fn(),
    emit: vi.fn((event: string, payload?: unknown) => handlers.get(event)?.(payload)),
    subscriberCount: vi.fn(),
    removeAllListeners: vi.fn(),
  };
}

function makeContainer(clientReady: boolean) {
  const container = new Container();
  const logger = makeLogger();
  const eventBus = makeEventBus();
  const config = { bot: { shrine: shrineConfig }, guildId: 'guild-1' };
  const configurationService = { current: vi.fn(() => config), getMany: vi.fn() };
  const client = { isReady: vi.fn(() => clientReady), guilds: { cache: new Map() } };
  const metrics = { counter: vi.fn(), gauge: vi.fn(), timer: vi.fn(), snapshot: vi.fn() };

  container.registerSingleton(TOKENS.ConfigurationService, () => configurationService as never);
  container.registerSingleton(TOKENS.Logger, () => logger);
  container.registerSingleton(TOKENS.DiscordClient, () => client as never);
  container.registerSingleton(TOKENS.EventBus, () => eventBus as never);
  container.registerSingleton(TOKENS.MetricsService, () => metrics as never);

  return { container, logger, eventBus };
}

describe('ShrineModule', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for Discord readiness before starting the Shrine scheduler', async () => {
    const start = vi.spyOn(ShrinePollingScheduler.prototype, 'start').mockImplementation(() => undefined);
    const { container, eventBus, logger } = makeContainer(false);
    const module = new ShrineModule();

    module.register(container);
    await module.onStart();

    expect(start).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Shrine scheduler waiting for Discord client ready');

    eventBus.emit('bot.ready', { guildCount: 1, pingMs: 10 });
    eventBus.emit('bot.ready', { guildCount: 1, pingMs: 10 });

    expect(start).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Discord client ready; starting Shrine scheduler');
  });

  it('starts immediately when Discord is already ready', async () => {
    const start = vi.spyOn(ShrinePollingScheduler.prototype, 'start').mockImplementation(() => undefined);
    const { container } = makeContainer(true);
    const module = new ShrineModule();

    module.register(container);
    await module.onStart();

    expect(start).toHaveBeenCalledTimes(1);
  });
});
