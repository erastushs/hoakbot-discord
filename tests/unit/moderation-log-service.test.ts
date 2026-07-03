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

function makeActionEvent(action: string, overrides: Record<string, string> = {}) {
  return {
    guildId: 'guild-1',
    moderatorId: 'mod-1',
    targetId: 'target-1',
    action,
    reason: 'Breaking rules',
    ...overrides,
  };
}

function makeWarnEvent(overrides: Record<string, string> = {}) {
  return {
    guildId: 'guild-1',
    moderatorId: 'mod-1',
    targetId: 'target-1',
    warningId: 'warn-1',
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

function getEmbed(send: ReturnType<typeof vi.fn>) {
  return (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
}

function getFields(embed: Record<string, unknown>) {
  return embed?.fields as Array<{ name: string; value: string }>;
}

describe('ModerationLogService', () => {
  describe('kick', () => {
    it('logs kick embed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();
      const { logger, metrics } = createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('kick'));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = getEmbed(send);
      expect(embed?.title).toBe('\uD83D\uDD28 Member Kicked');
      expect(embed?.color).toBe(0xf59e0b);
      expect(embed?.description).toBe('<@mod-1> kicked <@target-1>.');
      expect(embed?.footer?.text).toBe('Kick');
      expect(getFields(embed).find((f) => f.name === 'Reason')?.value).toBe('Breaking rules');

      expect(logger.info).toHaveBeenCalledWith(
        { guildId: 'guild-1', moderatorId: 'mod-1', targetId: 'target-1', action: 'kick', reason: 'Breaking rules' },
        'kick log sent',
      );
      expect(metrics.counter).toHaveBeenCalledWith('moderation_log_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.moderation.logged', {
        guildId: 'guild-1', action: 'kick', moderatorId: 'mod-1', targetId: 'target-1',
      });
    });
  });

  describe('ban', () => {
    it('logs ban embed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();
      const { logger } = createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('ban'));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const embed = getEmbed(send);
      expect(embed?.title).toBe('\u26D4 Member Banned');
      expect(embed?.color).toBe(0xef4444);
      expect(embed?.description).toBe('<@mod-1> banned <@target-1>.');
      expect(embed?.footer?.text).toBe('Ban');
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ action: 'ban' }), 'ban log sent');
    });
  });

  describe('timeout', () => {
    it('logs timeout embed with duration', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('timeout', { reason: '10m — spamming' }));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const embed = getEmbed(send);
      expect(embed?.title).toBe('\u23F3 Member Timed Out');
      expect(embed?.color).toBe(0xa855f7);
      expect(embed?.footer?.text).toBe('Timeout');
      expect(getFields(embed).find((f) => f.name === 'Duration')?.value).toBe('10m');
    });
  });

  describe('warn', () => {
    it('logs warn embed via warningIssued event', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();
      const { logger } = createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.warningIssued', makeWarnEvent());

      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const embed = getEmbed(send);
      expect(embed?.title).toBe('\u26A0 Warning Issued');
      expect(embed?.color).toBe(0xfacc15);
      expect(embed?.description).toBe('<@mod-1> warned <@target-1>.');
      expect(embed?.footer?.text).toBe('Warn');
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ action: 'warn' }), 'warn log sent');
    });
  });

  describe('warn_remove', () => {
    it('logs warn_remove embed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('warn_remove', { targetId: '', reason: '' }));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const embed = getEmbed(send);
      expect(embed?.title).toBe('\uD83D\uDDD1 Warning Removed');
      expect(embed?.color).toBe(0xf59e0b);
      expect(embed?.footer?.text).toBe('Warn Remove');
      expect(getFields(embed).find((f) => f.name === 'Reason')?.value).toBe('No reason provided.');
    });
  });

  describe('warn_clear', () => {
    it('logs warn_clear embed with warnings count', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('warn_clear', { reason: '3 warnings cleared' }));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const embed = getEmbed(send);
      expect(embed?.title).toBe('\uD83E\uDDF9 Warnings Cleared');
      expect(embed?.color).toBe(0xfacc15);
      expect(embed?.footer?.text).toBe('Warn Clear');
      expect(getFields(embed).find((f) => f.name === 'Warnings Removed')?.value).toBe('3');
    });
  });

  describe('reason fallback', () => {
    it('shows No reason provided when reason is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('kick', { reason: '' }));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      expect(getFields(getEmbed(send)).find((f) => f.name === 'Reason')?.value).toBe('No reason provided.');
    });
  });

  describe('common', () => {
    it('ignores unsupported actions', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, defaultConfig, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('unsupported'));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(send).not.toHaveBeenCalled();
    });

    it('does not send embed when disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();

      createService(client, { enabled: false, channelId: 'mod-log-channel' }, makeLogger(), makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('kick'));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(send).not.toHaveBeenCalled();
    });

    it('warns when channelId is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const eventBus = makeEventBus();
      const logger = makeLogger();

      createService(client, { enabled: true, channelId: '' }, logger, makeMetrics(), eventBus);

      eventBus.fire('moderation.action', makeActionEvent('kick'));

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Moderation log channelId not configured');
    });
  });
});
