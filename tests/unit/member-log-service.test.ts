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

function makeRole(id: string, managed = false) {
  return { id, managed, name: `Role-${id}` };
}

function makeGuildMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    displayName: 'TestUser',
    toString: () => '<@user-1>',
    displayAvatarURL: () => '',
    nickname: null as string | null,
    user: {
      id: 'user-1',
      username: 'testuser',
      bot: false,
    },
    roles: {
      cache: new Map<string, { id: string; managed: boolean; name: string }>(),
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
  config = { enabled: true, channelId: 'member-log-channel', roles: true },
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
        user: { id: 'bot-1', username: 'bot', bot: true },
      });
      const newMember = makeGuildMember({
        nickname: 'NewNick',
        user: { id: 'bot-1', username: 'bot', bot: true },
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

      createService(client, { enabled: false, channelId: 'member-log-channel', roles: true });

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

      const { logger } = createService(client, { enabled: true, channelId: '', roles: true });

      const oldMember = makeGuildMember({ nickname: 'A' });
      const newMember = makeGuildMember({ nickname: 'B' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Member log channelId not configured');
    });
  });

  describe('role added', () => {
    it('logs a single role added', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics, eventBus, logger } = createService(client);

      const oldRoles = new Map();
      const newRoles = new Map();
      newRoles.set('role-1', makeRole('role-1'));

      const oldMember = makeGuildMember({ roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\u2795 Role Added');
      expect(embed?.description).toBe('<@user-1> received role(s).');
      expect(embed?.color).toBe(0x22c55e);
      expect(embed?.footer?.text).toBe('Role Added');

      const fields = embed?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Member')?.value).toBe('<@user-1>');
      expect(fields?.find((f) => f.name === 'Role(s)')?.value).toBe('<@&role-1>');
      expect(fields?.find((f) => f.name === 'Moderator')?.value).toBe('Unknown');

      expect(metrics.counter).toHaveBeenCalledWith('member_role_added_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.role_added', {
        guildId: 'guild-1',
        userId: 'user-1',
        roles: ['role-1'],
      });
      expect(logger.info).toHaveBeenCalledWith(
        { guildId: 'guild-1', userId: 'user-1', addedRoles: ['role-1'], removedRoles: [] },
        'Role change log sent',
      );
    });

    it('logs multiple roles added', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { eventBus, logger } = createService(client);

      const oldRoles = new Map();
      const newRoles = new Map();
      newRoles.set('role-a', makeRole('role-a'));
      newRoles.set('role-b', makeRole('role-b'));
      newRoles.set('role-c', makeRole('role-c'));

      const oldMember = makeGuildMember({ roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Role(s)')?.value).toBe('<@&role-a>\n<@&role-b>\n<@&role-c>');
      expect(logger.info).toHaveBeenCalledWith(
        { guildId: 'guild-1', userId: 'user-1', addedRoles: ['role-a', 'role-b', 'role-c'], removedRoles: [] },
        'Role change log sent',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.role_added', {
        guildId: 'guild-1',
        userId: 'user-1',
        roles: ['role-a', 'role-b', 'role-c'],
      });
    });

    it('does not log an added role when config.roles is false', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client, {
        enabled: true,
        channelId: 'member-log-channel',
        roles: false,
      });

      const oldRoles = new Map();
      const newRoles = new Map();
      newRoles.set('role-1', makeRole('role-1'));

      const oldMember = makeGuildMember({ roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_role_added_total');
    });
  });

  describe('role removed', () => {
    it('logs a single role removed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics, eventBus, logger } = createService(client);

      const oldRoles = new Map();
      oldRoles.set('role-1', makeRole('role-1'));
      const newRoles = new Map();

      const oldMember = makeGuildMember({ roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\u2796 Role Removed');
      expect(embed?.description).toBe('<@user-1> lost role(s).');
      expect(embed?.color).toBe(0xef4444);
      expect(embed?.footer?.text).toBe('Role Removed');

      const fields = embed?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Member')?.value).toBe('<@user-1>');
      expect(fields?.find((f) => f.name === 'Role(s)')?.value).toBe('<@&role-1>');
      expect(fields?.find((f) => f.name === 'Moderator')?.value).toBe('Unknown');

      expect(metrics.counter).toHaveBeenCalledWith('member_role_removed_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.role_removed', {
        guildId: 'guild-1',
        userId: 'user-1',
        roles: ['role-1'],
      });
      expect(logger.info).toHaveBeenCalledWith(
        { guildId: 'guild-1', userId: 'user-1', addedRoles: [], removedRoles: ['role-1'] },
        'Role change log sent',
      );
    });

    it('logs multiple roles removed', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { eventBus, logger } = createService(client);

      const oldRoles = new Map();
      oldRoles.set('role-x', makeRole('role-x'));
      oldRoles.set('role-y', makeRole('role-y'));
      oldRoles.set('role-z', makeRole('role-z'));
      const newRoles = new Map();

      const oldMember = makeGuildMember({ roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;
      const fields = embed?.fields as Array<{ name: string; value: string }>;

      expect(fields?.find((f) => f.name === 'Role(s)')?.value).toBe('<@&role-x>\n<@&role-y>\n<@&role-z>');
      expect(logger.info).toHaveBeenCalledWith(
        { guildId: 'guild-1', userId: 'user-1', addedRoles: [], removedRoles: ['role-x', 'role-y', 'role-z'] },
        'Role change log sent',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.role_removed', {
        guildId: 'guild-1',
        userId: 'user-1',
        roles: ['role-x', 'role-y', 'role-z'],
      });
    });
  });

  describe('role changes with nickname change', () => {
    it('logs both role change and nickname change', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics, eventBus, logger } = createService(client);

      const oldRoles = new Map();
      const newRoles = new Map();
      newRoles.set('role-1', makeRole('role-1'));

      const oldMember = makeGuildMember({ nickname: 'OldNick', roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ nickname: 'NewNick', roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));

      const roleCall = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const nickCall = send.mock.calls[1]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };

      expect(roleCall.embeds[0]?.data?.title).toBe('\u2795 Role Added');
      expect(nickCall.embeds[0]?.data?.title).toBe('\uD83C\uDFF7 Nickname Updated');

      expect(metrics.counter).toHaveBeenCalledWith('member_role_added_total');
      expect(metrics.counter).toHaveBeenCalledWith('member_log_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.role_added', {
        guildId: 'guild-1',
        userId: 'user-1',
        roles: ['role-1'],
      });
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.nickname_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
        before: 'OldNick',
        after: 'NewNick',
      });
    });
  });

  describe('managed role ignored', () => {
    it('does not log managed (bot integration) roles', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldRoles = new Map();
      const newRoles = new Map();
      newRoles.set('managed-role', makeRole('managed-role', true));

      const oldMember = makeGuildMember({ roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_role_added_total');
    });
  });

  describe('everyone ignored', () => {
    it('does not log the @everyone role', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldRoles = new Map();
      const newRoles = new Map();
      newRoles.set('guild-1', makeRole('guild-1'));

      const oldMember = makeGuildMember({ roles: { cache: oldRoles } });
      const newMember = makeGuildMember({ roles: { cache: newRoles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_role_added_total');
    });
  });

  describe('no role changes', () => {
    it('does not log when roles are unchanged', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const roles = new Map();
      roles.set('role-1', makeRole('role-1'));

      const oldMember = makeGuildMember({ roles: { cache: roles } });
      const newMember = makeGuildMember({ roles: { cache: roles } });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_role_added_total');
      expect(metrics.counter).not.toHaveBeenCalledWith('member_role_removed_total');
    });
  });

  describe('role config disabled', () => {
    it('still logs nickname changes when roles config is false', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics, eventBus } = createService(client, {
        enabled: true,
        channelId: 'member-log-channel',
        roles: false,
      });

      const oldMember = makeGuildMember({ nickname: 'OldName' });
      const newMember = makeGuildMember({ nickname: 'NewName' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;
      expect(embed?.title).toBe('\uD83C\uDFF7 Nickname Updated');
      expect(metrics.counter).toHaveBeenCalledWith('member_log_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.nickname_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
        before: 'OldName',
        after: 'NewName',
      });
    });
  });

  describe('display name changed', () => {
    it('logs when display name changes', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics, eventBus, logger } = createService(client);

      const oldMember = makeGuildMember({ displayName: 'OldDisplay' });
      const newMember = makeGuildMember({ displayName: 'NewDisplay' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\uD83C\uDFF7 Display Name Updated');
      expect(embed?.description).toBe('<@user-1> changed their display name.');
      expect(embed?.color).toBe(0x5865f2);
      expect(embed?.footer?.text).toBe('Display Name');

      const fields = embed?.fields as Array<{ name: string; value: string }>;
      expect(fields?.find((f) => f.name === 'Before')?.value).toBe('OldDisplay');
      expect(fields?.find((f) => f.name === 'After')?.value).toBe('NewDisplay');

      expect(metrics.counter).toHaveBeenCalledWith('member_display_name_log_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.display_name_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
        before: 'OldDisplay',
        after: 'NewDisplay',
      });
      expect(logger.info).toHaveBeenCalledWith(
        { userId: 'user-1', guildId: 'guild-1', before: 'OldDisplay', after: 'NewDisplay' },
        'Display name change log sent',
      );
    });

    it('does not log when display name is unchanged', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMember = makeGuildMember({ displayName: 'SameDisplay' });
      const newMember = makeGuildMember({ displayName: 'SameDisplay' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_display_name_log_total');
    });
  });

  describe('avatar changed', () => {
    it('logs when avatar changes', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics, eventBus, logger } = createService(client);

      const oldMember = makeGuildMember({ displayAvatarURL: () => 'https://old.avatar/url' });
      const newMember = makeGuildMember({ displayAvatarURL: () => 'https://new.avatar/url' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\uD83D\uDDBC Avatar Updated');
      expect(embed?.description).toBe('<@user-1> updated their avatar.');
      expect(embed?.color).toBe(0x5865f2);
      expect(embed?.footer?.text).toBe('Avatar Updated');
      expect(embed?.image?.url).toBe('https://new.avatar/url');
      expect(embed?.thumbnail?.url).toBe('https://old.avatar/url');

      expect(metrics.counter).toHaveBeenCalledWith('member_avatar_log_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.avatar_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
      });
      expect(logger.info).toHaveBeenCalledWith(
        { userId: 'user-1', guildId: 'guild-1' },
        'Avatar update log sent',
      );
    });

    it('does not log when avatar is unchanged', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const displayAvatar = () => 'https://same.avatar/url';
      const oldMember = makeGuildMember({ displayAvatarURL: displayAvatar });
      const newMember = makeGuildMember({ displayAvatarURL: displayAvatar });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_avatar_log_total');
    });

    it('handles previous avatar unavailable gracefully', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics, eventBus } = createService(client);

      const oldMember = makeGuildMember({ displayAvatarURL: () => '' });
      const newMember = makeGuildMember({ displayAvatarURL: () => 'https://new.avatar/url' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\uD83D\uDDBC Avatar Updated');
      expect(embed?.image?.url).toBe('https://new.avatar/url');
      expect(embed?.thumbnail).toBeUndefined();
      expect(metrics.counter).toHaveBeenCalledWith('member_avatar_log_total');
      expect(eventBus.emit).toHaveBeenCalledWith('logging.member.avatar_updated', {
        guildId: 'guild-1',
        userId: 'user-1',
      });
    });
  });

  describe('display name - bot ignored', () => {
    it('does not log display name change for bots', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMember = makeGuildMember({
        displayName: 'OldBotDisplay',
        user: { id: 'bot-1', username: 'bot', bot: true },
      });
      const newMember = makeGuildMember({
        displayName: 'NewBotDisplay',
        user: { id: 'bot-1', username: 'bot', bot: true },
      });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_display_name_log_total');
    });
  });

  describe('avatar - bot ignored', () => {
    it('does not log avatar change for bots', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const oldMember = makeGuildMember({
        displayAvatarURL: () => 'https://old-bot.avatar',
        user: { id: 'bot-1', username: 'bot', bot: true },
      });
      const newMember = makeGuildMember({
        displayAvatarURL: () => 'https://new-bot.avatar',
        user: { id: 'bot-1', username: 'bot', bot: true },
      });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_avatar_log_total');
    });
  });

  describe('display name - disabled config', () => {
    it('does not log display name when member logging is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client, {
        enabled: false,
        channelId: 'member-log-channel',
        roles: true,
      });

      const oldMember = makeGuildMember({ displayName: 'OldDisplay' });
      const newMember = makeGuildMember({ displayName: 'NewDisplay' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_display_name_log_total');
    });
  });

  describe('avatar - disabled config', () => {
    it('does not log avatar when member logging is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client, {
        enabled: false,
        channelId: 'member-log-channel',
        roles: true,
      });

      const oldMember = makeGuildMember({ displayAvatarURL: () => 'https://old.avatar' });
      const newMember = makeGuildMember({ displayAvatarURL: () => 'https://new.avatar' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('member_avatar_log_total');
    });
  });

  describe('display name - missing channel', () => {
    it('warns when channelId is empty for display name change', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger } = createService(client, { enabled: true, channelId: '', roles: true });

      const oldMember = makeGuildMember({ displayName: 'OldDisplay' });
      const newMember = makeGuildMember({ displayName: 'NewDisplay' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Member log channelId not configured');
    });
  });

  describe('avatar - missing channel', () => {
    it('warns when channelId is empty for avatar change', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger } = createService(client, { enabled: true, channelId: '', roles: true });

      const oldMember = makeGuildMember({ displayAvatarURL: () => 'https://old.avatar' });
      const newMember = makeGuildMember({ displayAvatarURL: () => 'https://new.avatar' });
      newMember.guild.channels.cache.set('member-log-channel', { send, isTextBased: () => true } as never);

      client.emitEvent('guildMemberUpdate', oldMember, newMember);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Member log channelId not configured');
    });
  });
});
