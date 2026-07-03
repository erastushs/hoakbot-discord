import { describe, it, expect, vi } from 'vitest';
import { MemberLogService } from '../../src/modules/logging/services/member-log.service.js';

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

function makeGuildMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    displayName: 'TestUser',
    toString: () => '<@user-1>',
    nickname: null as string | null,
    user: {
      id: 'user-1',
      username: 'testuser',
      bot: false,
      displayAvatarURL: () => '',
    },
    guild: {
      id: 'guild-1',
      name: 'Test Guild',
      memberCount: 10,
      channels: {
        cache: new Map<string, { send: ReturnType<typeof vi.fn> }>(),
      },
    },
    ...overrides,
  };
}

function makeClient(send: ReturnType<typeof vi.fn>) {
  const channel = { send, isTextBased: () => true };
  const channels = new Map<string, typeof channel>();
  channels.set('member-log-channel', channel);

  const handlers = new Map<string, (...args: unknown[]) => void>();

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emitEvent: (event: string, ...args: unknown[]) => {
      const handler = handlers.get(event);
      if (handler) handler(...args);
    },
    guilds: { cache: new Map() },
  };
}

function createService(
  client: ReturnType<typeof makeClient>,
  config = { enabled: true, channelId: 'member-log-channel' },
  logger = makeLogger(),
  metrics = makeMetrics(),
  eventBus = makeEventBus(),
) {
  const service = new MemberLogService(client as never, config, logger as never, metrics as never, eventBus as never);
  service.register();
  return { service, logger, metrics, eventBus };
}

describe('MemberLogService', () => {
  describe('nickname added', () => {
    it('logs when nickname is added (None -> value)', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger, metrics, eventBus } = createService(client);

      const oldMember = makeGuildMember({ nickname: null });
      const newMember = makeGuildMember({ nickname: 'Erastus' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\uD83C\uDFF7 Nickname Updated');
      expect(embed?.color).toBe(0x5865f2);
      expect(embed?.fields).toHaveLength(5);
      expect(logger.info).toHaveBeenCalledWith(
        { userId: 'user-1', guildId: 'guild-1', before: null, after: 'Erastus' },
        'Nickname change log sent',
      );
      expect(metrics.counter).toHaveBeenCalledWith('member_log_total');
      expect(metrics.increment).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.nickname_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
        before: null,
        after: 'Erastus',
      });
    });
  });

  describe('nickname removed', () => {
    it('logs when nickname is removed (value -> None)', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger, eventBus } = createService(client);

      const oldMember = makeGuildMember({ nickname: 'Erastus' });
      const newMember = makeGuildMember({ nickname: null });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(logger.info).toHaveBeenCalledWith(
        { userId: 'user-1', guildId: 'guild-1', before: 'Erastus', after: null },
        'Nickname change log sent',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.nickname_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
        before: 'Erastus',
        after: null,
      });
    });
  });

  describe('nickname changed', () => {
    it('logs when nickname changes', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger, eventBus } = createService(client);

      const oldMember = makeGuildMember({ nickname: 'Erastus' });
      const newMember = makeGuildMember({ nickname: 'Erastus HS' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(logger.info).toHaveBeenCalledWith(
        { userId: 'user-1', guildId: 'guild-1', before: 'Erastus', after: 'Erastus HS' },
        'Nickname change log sent',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.nickname_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
        before: 'Erastus',
        after: 'Erastus HS',
      });
    });

    it('embed shows correct Before and After values', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const oldMember = makeGuildMember({ nickname: 'OldName' });
      const newMember = makeGuildMember({ nickname: 'NewName' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Before')?.value).toBe('OldName');
      expect(fields?.find((f) => f.name === 'After')?.value).toBe('NewName');
    });
  });

  describe('no nickname change', () => {
    it('does not log when nickname is unchanged', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMember = makeGuildMember({ nickname: 'SameName' });
      const newMember = makeGuildMember({ nickname: 'SameName' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_log_total');
    });

    it('does not log when both nicknames are null', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMember = makeGuildMember({ nickname: null });
      const newMember = makeGuildMember({ nickname: null });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('bots ignored', () => {
    it('does not log for bot users', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMember = makeGuildMember({
        nickname: null,
        user: { id: 'bot-1', username: 'bot', bot: true, displayAvatarURL: () => '' },
      });
      const newMember = makeGuildMember({
        nickname: 'NewNick',
        user: { id: 'bot-1', username: 'bot', bot: true, displayAvatarURL: () => '' },
      });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_log_total');
    });
  });

  describe('disabled config', () => {
    it('does not send embed when member logging is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client, { enabled: false, channelId: 'member-log-channel' });

      const oldMember = makeGuildMember({ nickname: 'A' });
      const newMember = makeGuildMember({ nickname: 'B' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('missing channel', () => {
    it('warns when channelId is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger } = createService(client, { enabled: true, channelId: '' });

      const oldMember = makeGuildMember({ nickname: 'A' });
      const newMember = makeGuildMember({ nickname: 'B' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Member log channelId not configured');
    });
  });
});
