import { describe, it, expect, vi } from 'vitest';
import { ModerationLogService } from '../../src/modules/logging/services/moderation-log.service.js';

function makeMetrics() {
  const increment = vi.fn();
  const counter = vi.fn(() => ({ increment }));
  return { counter, increment };
}

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
    emit: vi.fn(),
    subscribe: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);
    }),
    fire: (event: string, payload: unknown) => {
      const handler = handlers.get(event);
      if (handler) handler(payload);
    },
  };
}

function makeClient(send: ReturnType<typeof vi.fn>) {
  const logChannel = { send, isTextBased: () => true };
  const guild = {
    id: 'guild-1',
    channels: { cache: new Map<string, typeof logChannel>() },
  };
  guild.channels.cache.set('mod-log-channel', logChannel);

  const guilds = new Map<string, typeof guild>();
  guilds.set('guild-1', guild);

  return {
    guilds: { cache: guilds },
  };
}

const defaultConfig = {
  enabled: true,
  channelId: 'mod-log-channel',
};

function makeKickEvent(overrides: Partial<{
  guildId: string;
  moderatorId: string;
  targetId: string;
  action: string;
  reason: string;
}> = {}) {
  return {
    guildId: 'guild-1',
    moderatorId: 'mod-1',
    targetId: 'target-1',
    action: 'kick',
    reason: 'Breaking rules',
    ...overrides,
  };
}

function createService(
  client: ReturnType<typeof makeClient>,
  config = defaultConfig,
  logger = makeLogger(),
  metrics = makeMetrics(),
  eventBus = makeEventBus(),
) {
  const service = new ModerationLogService(client as never, config, logger as never, metrics as never, eventBus as never);
  service.register();
  return { service, logger, metrics, eventBus };
}

describe('ModerationLogService', () => {
  describe('kick', () => {
    it('logs kick embed when moderation.action kick event fires', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      const { logger, metrics } = createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeKickEvent());

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\uD83D\uDD28 Member Kicked');
      expect(embed?.color).toBe(0xf59e0b);
      expect(embed?.description).toBe('<@mod-1> kicked <@target-1>.');
      expect(embed?.footer?.text).toBe('Kick');

      expect(logger.info).toHaveBeenCalledWith(
        {
          guildId: 'guild-1',
          moderatorId: 'mod-1',
          targetId: 'target-1',
          reason: 'Breaking rules',
        },
        'Kick log sent',
      );
      expect(metrics.counter).toHaveBeenCalledWith('moderation_kick_log_total');
      expect(metrics.increment).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('logging.moderation.kick_logged', {
        guildId: 'guild-1',
        moderatorId: 'mod-1',
        targetId: 'target-1',
        reason: 'Breaking rules',
      });
    });

    it('shows reason when provided', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeKickEvent({ reason: 'Spamming' }));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Reason')?.value).toBe('Spamming');
    });

    it('shows default reason when not provided', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeKickEvent({ reason: '' }));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Reason')?.value).toBe('No reason provided.');
    });

    it('ignores non-kick moderation actions', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeKickEvent({ action: 'ban' }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });

    it('does not send embed when disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, { enabled: false, channelId: 'mod-log-channel' }, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeKickEvent());

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });

    it('warns when channelId is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();
      const logger = makeLogger();

      createService(client, { enabled: true, channelId: '' }, logger, makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeKickEvent());

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Moderation log channelId not configured');
    });
  });
});
