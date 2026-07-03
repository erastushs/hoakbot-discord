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
    url: null as string | null,
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
  describe('message delete', () => {
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
      expect(metrics.counter).toHaveBeenCalledWith('message_log_total');
      expect(metrics.increment).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('logging.message.deleted', expect.any(Object));
    });

    it('embed includes author mention field', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      createService(client);
      const message = makePartialMessage();
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Author')?.value).toBe('<@user-1>');
    });
  });

  describe('message edit', () => {
    it('logs edited message embed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger, metrics, eventBus } = createService(client);

      const oldMsg = makePartialMessage({ content: 'before', partial: false });
      const newMsg = makePartialMessage({ content: 'after' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\u270F\uFE0F Message Edited');
      expect(embed?.color).toBe(0x5865f2);
      expect(embed?.footer?.text).toBe('Message Edit');

      expect(logger.info).toHaveBeenCalledWith(
        {
          guildId: 'guild-1',
          channelId: 'chan-1',
          messageId: 'msg-1',
          authorId: 'user-1',
        },
        'Message edit log sent',
      );
      expect(metrics.counter).toHaveBeenCalledWith('message_edit_log_total');
      expect(metrics.increment).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('logging.message.edited', {
        guildId: 'guild-1',
        channelId: 'chan-1',
        messageId: 'msg-1',
        authorId: 'user-1',
      });
    });

    it('shows Before and After fields', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const oldMsg = makePartialMessage({ content: 'Old text', partial: false });
      const newMsg = makePartialMessage({ content: 'New text' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Before')?.value).toBe('Old text');
      expect(fields?.find((f) => f.name === 'After')?.value).toBe('New text');
    });

    it('shows (No content) for empty before', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const oldMsg = makePartialMessage({ content: '', partial: false });
      const newMsg = makePartialMessage({ content: 'New text' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Before')?.value).toBe('*(No content)*');
    });

    it('shows (No content) for empty after', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const oldMsg = makePartialMessage({ content: 'Old text', partial: false });
      const newMsg = makePartialMessage({ content: '' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'After')?.value).toBe('*(No content)*');
    });

    it('truncates long before content', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const longContent = 'x'.repeat(2000);
      const oldMsg = makePartialMessage({ content: longContent, partial: false });
      const newMsg = makePartialMessage({ content: 'short' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;

      const beforeField = fields?.find((f) => f.name === 'Before')?.value;
      expect(beforeField?.endsWith('...')).toBe(true);
      expect(beforeField!.length).toBeLessThanOrEqual(1030);
    });

    it('truncates long after content', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const longContent = 'x'.repeat(2000);
      const oldMsg = makePartialMessage({ content: 'short', partial: false });
      const newMsg = makePartialMessage({ content: longContent });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;

      const afterField = fields?.find((f) => f.name === 'After')?.value;
      expect(afterField?.endsWith('...')).toBe(true);
      expect(afterField!.length).toBeLessThanOrEqual(1030);
    });

    it('ignores unchanged content', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMsg = makePartialMessage({ content: 'same', partial: false });
      const newMsg = makePartialMessage({ content: 'same' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('message_edit_log_total');
    });

    it('ignores bot messages', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMsg = makePartialMessage({ partial: false, author: { id: 'bot-1', bot: true } });
      const newMsg = makePartialMessage({ author: { id: 'bot-1', bot: true } });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });

    it('ignores partial old messages', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const oldMsg = makePartialMessage({ content: 'before', partial: true });
      const newMsg = makePartialMessage({ content: 'after' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });

    it('adds jump link when url is available', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const oldMsg = makePartialMessage({ content: 'before', partial: false });
      const newMsg = makePartialMessage({ content: 'after', url: 'https://discord.com/channels/1/2/3' });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Jump')?.value).toBe('[Open Message](https://discord.com/channels/1/2/3)');
    });

    it('omits jump link when url is not available', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const oldMsg = makePartialMessage({ content: 'before', partial: false });
      const newMsg = makePartialMessage({ content: 'after', url: null });

      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Jump')).toBeUndefined();
    });

    it('is disabled when config is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client, { enabled: false, channelId: 'msg-log-channel' });

      const oldMsg = makePartialMessage({ partial: false });
      const newMsg = makePartialMessage();
      client.emitEvent('messageUpdate', oldMsg, newMsg);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('empty content', () => {
    it('shows (No content) for empty delete messages', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      createService(client);
      const message = makePartialMessage({ content: '' });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Content')?.value).toBe('*(No content)*');
    });
  });

  describe('long content truncation', () => {
    it('truncates very long delete content', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      createService(client);
      const longContent = 'x'.repeat(2000);
      const message = makePartialMessage({ content: longContent });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;
      const contentField = fields?.find((f) => f.name === 'Content')?.value;
      expect(contentField?.endsWith('...')).toBe(true);
      expect(contentField!.length).toBeLessThanOrEqual(1030);
    });
  });

  describe('attachments delete', () => {
    it('omits attachments field when count is 0', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      createService(client);
      const message = makePartialMessage({ attachments: { size: 0, first: () => undefined } });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const fields = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]
        ?.data?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Attachments')).toBeUndefined();
    });
  });

  describe('bot ignored', () => {
    it('does not log bot delete messages', async () => {
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
});
