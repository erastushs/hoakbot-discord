import { describe, expect, it, vi } from 'vitest';

import { AuthorizationProvider, GuildResolver, PermissionResolver } from '../../src/core/auth/index.js';
import type { AuthenticatedUser, GuildDataSource, GuildIdentity } from '../../src/core/auth/index.js';

const ADMINISTRATOR = '8';
const MANAGE_GUILD = '32';

const user: AuthenticatedUser = {
  id: 'user-1',
  provider: 'discord',
  username: 'admin',
};

function provider(options: {
  ownerIds?: string[];
  botGuilds?: GuildIdentity[];
  userGuilds?: GuildIdentity[];
  fail?: boolean;
} = {}) {
  const dataSource: GuildDataSource = {
    getBotGuilds: vi.fn(async () => {
      if (options.fail) throw new Error('Discord API failed');
      return options.botGuilds ?? [{ id: 'guild-1', name: 'Hoak Family' }];
    }),
    getUserGuilds: vi.fn(async () => {
      if (options.fail) throw new Error('Discord API failed');
      return options.userGuilds ?? [];
    }),
  };

  return {
    dataSource,
    resolver: new GuildResolver(dataSource),
    authorization: new AuthorizationProvider({ ownerIds: options.ownerIds ?? [] }, new GuildResolver(dataSource)),
  };
}

describe('AuthorizationProvider', () => {
  it('allows OWNER_IDS full access to dashboard, all guilds, modules, and configuration', async () => {
    const { authorization } = provider({ ownerIds: ['user-1'], botGuilds: [], userGuilds: [] });

    await expect(authorization.canAccessDashboard(user)).resolves.toMatchObject({
      allowed: true,
      source: 'owner-ids',
      reason: 'owner-ids-dashboard-access',
      userId: 'user-1',
      action: 'dashboard',
    });
    await expect(authorization.canAccessGuild(user, 'any-guild')).resolves.toMatchObject({
      allowed: true,
      source: 'owner-ids',
      guildId: 'any-guild',
    });
    await expect(authorization.canManageModule(user, 'any-guild', 'voice')).resolves.toMatchObject({
      allowed: true,
      source: 'owner-ids',
      action: 'module',
    });
    await expect(
      authorization.canModifyConfiguration(user, { guildId: 'any-guild', action: 'delete', settingKey: 'voice.volume' }),
    ).resolves.toMatchObject({ allowed: true, source: 'owner-ids', action: 'delete' });
  });

  it('allows guild owners for their own guild only', async () => {
    const { authorization } = provider({ userGuilds: [{ id: 'guild-1', owner: true }] });

    await expect(authorization.canAccessDashboard(user)).resolves.toMatchObject({
      allowed: true,
      source: 'discord:guild-owner',
      guildId: 'guild-1',
    });
    await expect(authorization.canAccessGuild(user, 'guild-1')).resolves.toMatchObject({
      allowed: true,
      source: 'discord:guild-owner',
    });
    await expect(authorization.canAccessGuild(user, 'guild-2')).resolves.toMatchObject({
      allowed: false,
      reason: 'guild-intersection-denied',
    });
  });

  it('allows administrators for their own guild only', async () => {
    const { authorization } = provider({ userGuilds: [{ id: 'guild-1', rawPermissions: ADMINISTRATOR }] });

    await expect(authorization.canAccessGuild(user, 'guild-1')).resolves.toMatchObject({
      allowed: true,
      source: 'discord:administrator',
      reason: 'administrator',
    });
    await expect(authorization.canModifyConfiguration(user, { guildId: 'guild-1', action: 'write' })).resolves.toMatchObject({
      allowed: true,
      source: 'discord:administrator',
      action: 'write',
    });
  });

  it('allows Manage Guild users for their own guild only', async () => {
    const { authorization } = provider({ userGuilds: [{ id: 'guild-1', rawPermissions: MANAGE_GUILD }] });

    await expect(authorization.canAccessGuild(user, 'guild-1')).resolves.toMatchObject({
      allowed: true,
      source: 'discord:manage-guild',
      reason: 'manage-guild',
    });
    await expect(authorization.canManageModule(user, 'guild-1', 'voice')).resolves.toMatchObject({
      allowed: true,
      source: 'discord:manage-guild',
      action: 'module',
    });
  });

  it('denies regular members dashboard and configuration access', async () => {
    const { authorization } = provider({ userGuilds: [{ id: 'guild-1', rawPermissions: '0' }] });

    await expect(authorization.canAccessDashboard(user)).resolves.toMatchObject({
      allowed: false,
      code: 'authorization.dashboard_denied',
      reason: 'dashboard-access-denied',
    });
    await expect(authorization.canModifyConfiguration(user, { guildId: 'guild-1', action: 'read' })).resolves.toMatchObject({
      allowed: false,
      code: 'authorization.configuration_denied',
      reason: 'insufficient-permission',
      source: 'unknown',
      userId: 'user-1',
      guildId: 'guild-1',
      action: 'read',
    });
  });

  it('denies users outside guilds and missing guilds', async () => {
    const { authorization } = provider({ userGuilds: [{ id: 'other-guild', rawPermissions: ADMINISTRATOR }] });

    await expect(authorization.canAccessGuild(user, 'guild-1')).resolves.toMatchObject({
      allowed: false,
      code: 'authorization.guild_denied',
      reason: 'guild-intersection-denied',
    });
    await expect(authorization.canAccessGuild(user, '')).resolves.toMatchObject({
      allowed: false,
      code: 'authorization.guild_denied',
      reason: 'missing-guild',
    });
  });

  it('denies unknown guilds and Discord API failures', async () => {
    await expect(provider().authorization.canAccessGuild(user, 'unknown')).resolves.toMatchObject({
      allowed: false,
      reason: 'guild-intersection-denied',
    });
    await expect(provider({ fail: true }).authorization.canAccessGuild(user, 'guild-1')).resolves.toMatchObject({
      allowed: false,
      code: 'authorization.resolution_failed',
      reason: 'discord-api-failure',
    });
  });
});

describe('GuildResolver and PermissionResolver', () => {
  it('resolves bot and user guild intersection', async () => {
    const { resolver } = provider({
      botGuilds: [{ id: 'guild-1' }, { id: 'guild-2' }],
      userGuilds: [{ id: 'guild-2', owner: true }, { id: 'guild-3', owner: true }],
    });

    await expect(resolver.resolveGuild(user, 'guild-2')).resolves.toMatchObject({
      guildId: 'guild-2',
      inBotGuild: true,
      inUserGuild: true,
    });
    await expect(resolver.resolveAccessibleGuilds(user)).resolves.toHaveLength(3);
  });

  it('resolves permission sources and denies unknown permissions', () => {
    const resolver = new PermissionResolver();

    expect(resolver.resolveGuildPermission({ id: 'guild-1', owner: true })).toEqual({
      allowed: true,
      source: 'discord:guild-owner',
      reason: 'guild-owner',
    });
    expect(resolver.resolveGuildPermission({ id: 'guild-1', permissionSources: ['discord:administrator'] })).toEqual({
      allowed: true,
      source: 'discord:administrator',
      reason: 'administrator',
    });
    expect(resolver.resolveGuildPermission({ id: 'guild-1', rawPermissions: MANAGE_GUILD })).toEqual({
      allowed: true,
      source: 'discord:manage-guild',
      reason: 'manage-guild',
    });
    expect(resolver.resolveGuildPermission({ id: 'guild-1', rawPermissions: 'not-a-number' })).toEqual({
      allowed: false,
      source: 'unknown',
      reason: 'unknown-permission',
    });
  });
});
