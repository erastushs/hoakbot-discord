import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageLogService } from '../../src/modules/logging/services/message-log.service.js';
import { AttachmentArchiveService } from '../../src/shared/attachment/attachment-archive.service.js';

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
    attachments: null as unknown as Map<string, { id: string; url: string; name: string; size: number }> | null,
    author: {
      id: 'user-1',
      bot: false,
    },
    ...overrides,
  };
}

function makeClient(send: ReturnType<typeof vi.fn>, fetchAuditLogs = vi.fn()) {
  const logChannel = { send, isTextBased: () => true };
  const guild = {
    id: 'guild-1',
    channels: { cache: new Map<string, typeof logChannel>() },
    fetchAuditLogs,
  };
  guild.channels.cache.set('msg-log-channel', logChannel);

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

const defaultConfig = {
  enabled: true,
  channelId: 'msg-log-channel',
  archiveAttachments: true,
  maxAttachmentSizeMb: 10,
};

function createService(
  client: ReturnType<typeof makeClient>,
  config = defaultConfig,
  logger = makeLogger(),
  metrics = makeMetrics(),
  eventBus = makeEventBus(),
) {
  const service = new MessageLogService(client as never, config, logger as never, metrics as never, eventBus as never);
  service.register();
  return { service, logger, metrics, eventBus };
}

function makeAttachments(...entries: Array<[string, string, number]>) {
  const map = new Map<string, { id: string; url: string; name: string; size: number }>();
  for (const [id, name, size] of entries) {
    map.set(id, { id, url: `https://cdn.discord.com/${id}/${name}`, name, size });
  }
  Object.defineProperty(map, 'size', { value: entries.length });
  return map;
}

describe('MessageLogService', () => {
  describe('message delete', () => {
    it('logs deleted message embed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const { metrics, eventBus } = createService(client);
      const message = makePartialMessage({ content: 'Hello world' });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      expect(embed?.title).toBe('\uD83D\uDDD1 Message Deleted');
      expect(embed?.color).toBe(0x8d99ae);
      expect(metrics.counter).toHaveBeenCalledWith('message_log_total');
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

  describe('attachment archiving', () => {
    let archiveSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      archiveSpy = vi.spyOn(AttachmentArchiveService.prototype, 'archive').mockResolvedValue({
        files: [],
        archivedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        firstImageFileName: null,
      });
    });

    it('archives one attachment and sends it as files[]', async () => {
      archiveSpy.mockResolvedValueOnce({
        files: [{ attachment: Buffer.from('fake'), name: 'image.png' } as never],
        archivedCount: 1,
        failedCount: 0,
        skippedCount: 0,
        firstImageFileName: 'image.png',
      });

      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const attachments = makeAttachments(['a1', 'image.png', 5000]);
      const message = makePartialMessage({ attachments: attachments as unknown as Map<string, unknown> });
      createService(client);
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const payload = send.mock.calls[0]?.[0] as Record<string, unknown>;
      const files = payload.files as Array<Record<string, unknown>>;
      expect(files).toBeDefined();
      expect(files.length).toBe(1);
      expect(files[0]?.name).toBe('image.png');
    });

    it('shows archival summary in Attachments field', async () => {
      archiveSpy.mockResolvedValueOnce({
        files: [],
        archivedCount: 2,
        failedCount: 1,
        skippedCount: 0,
        firstImageFileName: null,
      });

      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const attachments = makeAttachments(['a1', 'a.png', 1000], ['a2', 'b.png', 1000], ['a3', 'c.png', 1000]);
      const message = makePartialMessage({ attachments: attachments as unknown as Map<string, unknown> });
      createService(client);
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;
      const attField = fields?.find((f) => f.name === 'Attachments')?.value;
      expect(attField).toContain('Archived: 2');
      expect(attField).toContain('Failed: 1');
    });

    it('shows filenames only when archiveAttachments is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      createService(client, { ...defaultConfig, archiveAttachments: false });
      const attachments = makeAttachments(['a1', 'photo.jpg', 1000]);
      const message = makePartialMessage({ attachments: attachments as unknown as Map<string, unknown> });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Attachments')?.value).toBe('photo.jpg');
      const payload = send.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(payload.files).toBeUndefined();
    });

    it('shows multiple filenames when disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      createService(client, { ...defaultConfig, archiveAttachments: false });
      const attachments = makeAttachments(['a1', 'a.png', 1000], ['a2', 'b.png', 1000]);
      const message = makePartialMessage({ attachments: attachments as unknown as Map<string, unknown> });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Attachments')?.value).toBe('2 attachments');
    });

    it('handles archived/skipped/failed labels', async () => {
      archiveSpy.mockResolvedValueOnce({
        files: [],
        archivedCount: 0,
        failedCount: 0,
        skippedCount: 1,
        firstImageFileName: null,
      });

      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const attachments = makeAttachments(['big', 'large.zip', 999999999]);
      const message = makePartialMessage({ attachments: attachments as unknown as Map<string, unknown> });
      createService(client);
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;
      const attField = fields?.find((f) => f.name === 'Attachments')?.value;
      expect(attField).toContain('Skipped: 1');
    });

    it('logs archive metrics', async () => {
      archiveSpy.mockResolvedValueOnce({
        files: [],
        archivedCount: 1,
        failedCount: 2,
        skippedCount: 3,
        firstImageFileName: null,
      });

      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const { metrics } = createService(client);

      const map = new Map<string, { id: string; url: string; name: string; size: number }>();
      for (const [id, name, size] of [['a', 'x.png', 1000], ['b', 'y.png', 1000], ['c', 'z.png', 1000]] as Array<[string, string, number]>) {
        map.set(id, { id, url: `https://cdn.discord.com/${id}/${name}`, name, size });
      }
      const entries = [...map.entries()];
      const attachments = {
        size: 3,
        values: () => map.values(),
        get first() { return undefined; },
        entries: () => map.entries(),
        [Symbol.iterator]: () => entries[Symbol.iterator](),
      };

      const message = makePartialMessage({ attachments: attachments as unknown as Map<string, unknown> });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(metrics.counter).toHaveBeenCalledWith('message_attachment_archived_total');
      expect(metrics.counter).toHaveBeenCalledWith('message_attachment_failed_total');
      expect(metrics.counter).toHaveBeenCalledWith('message_attachment_skipped_total');
    });

    it('emits attachments_archived event', async () => {
      archiveSpy.mockResolvedValueOnce({
        files: [],
        archivedCount: 1,
        failedCount: 0,
        skippedCount: 0,
        firstImageFileName: null,
      });

      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const { eventBus } = createService(client);
      const attachments = makeAttachments(['a', 'img.png', 1000]);
      const message = makePartialMessage({ attachments: attachments as unknown as Map<string, unknown> });
      client.emitEvent('messageDelete', message);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(eventBus.emit).toHaveBeenCalledWith('logging.message.attachments_archived', {
        guildId: 'guild-1',
        channelId: 'chan-1',
        messageId: 'msg-1',
        archived: 1,
        failed: 0,
        skipped: 0,
      });
    });
  });

  describe('message edit', () => {
    it('logs edited message embed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const { metrics } = createService(client);
      const oldMsg = makePartialMessage({ content: 'before', partial: false });
      const newMsg = makePartialMessage({ content: 'after' });
      client.emitEvent('messageUpdate', oldMsg, newMsg);
      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;
      expect(embed?.title).toBe('\u270F\uFE0F Message Edited');
      expect(embed?.color).toBe(0x5865f2);
      expect(metrics.counter).toHaveBeenCalledWith('message_edit_log_total');
    });
  });

  describe('bulk delete', () => {
    function makeBulkMessages(ids: string[]) {
      const entries = ids.map((id) => [id, { id, guildId: 'guild-1', channelId: 'chan-1', partial: false }] as const);
      return { size: ids.length, first: () => (entries.length > 0 ? entries[0]![1] : undefined), keys: () => entries.map((e) => e[0])[Symbol.iterator]() };
    }

    function makeAuditLogs(moderatorId: string | null, channelId = 'chan-1') {
      const entries = new Map();
      entries.set('entry-1', {
        executor: moderatorId ? { id: moderatorId } : null,
        extra: { count: 3 },
        target: { id: channelId },
        createdTimestamp: Date.now(),
      });
      return {
        entries,
      };
    }

    it('shows moderator from audit log', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const fetchAuditLogs = vi.fn().mockResolvedValue(makeAuditLogs('mod-123'));
      const client = makeClient(send, fetchAuditLogs);

      const { logger, eventBus, metrics } = createService(client);

      client.emitEvent('messageDeleteBulk', makeBulkMessages(['a', 'b', 'c']));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;

      expect(embed?.title).toBe('\uD83D\uDDD1 Bulk Message Delete');
      expect(embed?.description).toBe('<@mod-123> deleted **3 messages** in <#chan-1>.');
      expect(embed?.fields).toBeUndefined();
      expect(embed?.footer?.text).toBe('Bulk Message Delete');

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ moderatorId: 'mod-123' }),
        expect.any(String),
      );
      expect(eventBus.emit).toHaveBeenCalledWith('logging.message.bulk_deleted', {
        guildId: 'guild-1',
        channelId: 'chan-1',
        count: 3,
        moderatorId: 'mod-123',
      });
      expect(metrics.counter).toHaveBeenCalledWith('message_bulk_delete_log_total');
    });

    it('shows Someone when audit log is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const fetchAuditLogs = vi.fn().mockResolvedValue({ entries: new Map() });
      const client = makeClient(send, fetchAuditLogs);

      createService(client);

      client.emitEvent('messageDeleteBulk', makeBulkMessages(['a', 'b']));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;

      expect(embed?.description).toBe('Someone deleted **2 messages** in <#chan-1>.');
    });

    it('shows Someone when audit log fetch fails', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const fetchAuditLogs = vi.fn().mockRejectedValue(new Error('API error'));
      const client = makeClient(send, fetchAuditLogs);

      createService(client);

      client.emitEvent('messageDeleteBulk', makeBulkMessages(['a']));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;

      expect(embed?.description).toBe('Someone deleted **1 message** in <#chan-1>.');
    });

    it('emits moderatorId as null when unknown', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const fetchAuditLogs = vi.fn().mockResolvedValue({ entries: new Map() });
      const client = makeClient(send, fetchAuditLogs);

      const { eventBus } = createService(client);

      client.emitEvent('messageDeleteBulk', makeBulkMessages(['x']));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(eventBus.emit).toHaveBeenCalledWith('logging.message.bulk_deleted', {
        guildId: 'guild-1',
        channelId: 'chan-1',
        count: 1,
        moderatorId: null,
      });
    });

    it('uses singular message wording for count of 1', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const fetchAuditLogs = vi.fn().mockResolvedValue({ entries: new Map() });
      const client = makeClient(send, fetchAuditLogs);

      createService(client);

      client.emitEvent('messageDeleteBulk', makeBulkMessages(['only-one']));

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const embed = (send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> }).embeds[0]?.data;

      expect(embed?.description).toBe('Someone deleted **1 message** in <#chan-1>.');
    });

    it('ignores empty collections', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const messages = {
        size: 0,
        first: () => undefined,
        keys: () => [][Symbol.iterator](),
      };

      client.emitEvent('messageDeleteBulk', messages);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });

    it('is disabled when config is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client, { ...defaultConfig, enabled: false });

      client.emitEvent('messageDeleteBulk', makeBulkMessages(['a']));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });
});
