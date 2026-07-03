import { describe, it, expect, vi } from 'vitest';
import { MessageLogService } from '../../src/modules/logging/services/message-log.service.js';

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
  return {
    emit: vi.fn(),
    subscribe: vi.fn(),
    publish: vi.fn(),
  };
}

function makePartialMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    guildId: 'guild-1',
    channelId: 'chan-1',
    system: false,
    content: 'Hello world',
    attachments: null as unknown as { size: number; first: () => { name: string } | undefined } | null,
    author: {
      id: 'user-1',
      bot: false,
    },
    ...overrides,
  };
}

function makeClient(send: ReturnType<typeof vi.fn>) {
  const channel = { send, isTextBased: () => true };
  const guild = {
    id: 'guild-1',
    channels: {
      cache: new Map<string, typeof channel>(),
    },
  };
  guild.channels.cache.set('msg-log-channel', channel);

  const guilds = new Map<string, typeof guild>();
  guilds.set('guild-1', guild);

  const handlers = new Map<string, (...args: unknown[]) => void>();

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emitEvent: (event: string, ...args: unknown[]) => {
      const handler = handlers.get(event);
      if (handler) handler(...args);
    },
    guilds: { cache: guilds },
  };
}

function createService(
  client: ReturnType<typeof makeClient>,
  config = { enabled: true, channelId: 'msg-log-channel' },
  logger = makeLogger(),
  metrics = makeMetrics(),
  eventBus = makeEventBus(),
) {
  const service = new MessageLogService(client as never, config, logger as never, metrics as never, eventBus as never);
  service.register();
  return { service, logger, metrics, eventBus };
}

describe('MessageLogService', () => {
  describe('single message delete', () => {
    it('logs deleted message embed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger, metrics, eventBus } = createService(client);

      const message = makePartialMessage({ content: 'Hello world' });

      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\uD83D\uDDD1 Message Deleted');
      expect(embed?.color).toBe(0x8d99ae);
      expect(embed?.footer?.text).toBe('Message Delete');

      expect(logger.info).toHaveBeenCalledWith(
        {
          guildId: 'guild-1',
          channelId: 'chan-1',
          messageId: 'msg-1',
          authorId: 'user-1',
          attachments: 0,
        },
        'Message delete log sent',
      );
      expect(metrics.counter).toHaveBeenCalledWith('message_log_total');
      expect(metrics.increment).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('logging.message.deleted', {
        guildId: 'guild-1',
        channelId: 'chan-1',
        messageId: 'msg-1',
        authorId: 'user-1',
        attachmentCount: 0,
      });
    });

    it('embed includes author mention field', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const message = makePartialMessage();
      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const fields = call.embeds[0]?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Author')?.value).toBe('<@user-1>');
      expect(fields?.find((f) => f.name === 'Channel')?.value).toBe('<#chan-1>');
      expect(fields?.find((f) => f.name === 'Message ID')?.value).toBe('`msg-1`');
    });
  });

  describe('empty content', () => {
    it('shows (No content) for empty messages', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const message = makePartialMessage({ content: '' });
      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const fields = call.embeds[0]?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Content')?.value).toBe('*(No content)*');
    });
  });

  describe('long content truncation', () => {
    it('truncates very long content', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const longContent = 'x'.repeat(2000);
      const message = makePartialMessage({ content: longContent });
      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const fields = call.embeds[0]?.data?.fields as Array<{ name: string; value: string }>;
      const contentField = fields?.find((f) => f.name === 'Content')?.value;

      expect(contentField?.endsWith('...')).toBe(true);
      expect(contentField!.length).toBeLessThanOrEqual(1030);
    });
  });

  describe('attachments', () => {
    it('omits attachments field when count is 0', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const message = makePartialMessage({ attachments: { size: 0, first: () => undefined } });
      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const fields = call.embeds[0]?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Attachments')).toBeUndefined();
    });

    it('shows filename for one attachment', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const message = makePartialMessage({
        attachments: { size: 1, first: () => ({ name: 'image.png' }) },
      });
      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const fields = call.embeds[0]?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Attachments')?.value).toBe('image.png');
    });

    it('shows count for multiple attachments', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const message = makePartialMessage({
        attachments: { size: 3, first: () => ({ name: 'a.png' }) },
      });
      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const fields = call.embeds[0]?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Attachments')?.value).toBe('3 attachments');
    });
  });

  describe('bot ignored', () => {
    it('does not log bot messages', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const message = makePartialMessage({ author: { id: 'bot-1', bot: true } });
      client.emitEvent('messageDelete', message);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('message_log_total');
    });
  });

  describe('disabled config', () => {
    it('does not send embed when disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client, { enabled: false, channelId: 'msg-log-channel' });

      const message = makePartialMessage();
      client.emitEvent('messageDelete', message);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('missing channel', () => {
    it('warns when channelId is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger } = createService(client, { enabled: true, channelId: '' });

      const message = makePartialMessage();
      client.emitEvent('messageDelete', message);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Message log channelId not configured');
    });
  });
});
