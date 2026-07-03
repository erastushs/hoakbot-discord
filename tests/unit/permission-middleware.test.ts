import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionMiddleware } from '../../src/shared/middleware/permission.middleware.js';
import type { AppConfig } from '../../src/core/config/types.js';

function makeConfig(overrides?: Partial<AppConfig>): Readonly<AppConfig> {
  return {
    bot: {
      prefix: '!',
      guildId: 'guild-1',
      ownerIds: [],
      defaultLanguage: 'en',
      presence: { type: 'WATCHING', text: 'test' },
      cooldowns: { global: 1000, perUser: 3000 },
      voice: {
        standbyChannelId: '',
        joinDelayMs: 2000,
        cooldownMs: 5000,
        reconnectDelayMs: 3000,
        maxReconnectRetries: 5,
        defaultSound: 'hoak',
        volume: 1.0,
      },
      logging: {
        enabled: false,
        voice: { enabled: false, channelId: '' },
      },
      welcome: {
        enabled: false,
        channelId: '',
        backgroundUrl: '',
        message: { title: '', body: [] },
        image: { title: '', subtitle: '' },
      },
    },
    permissions: { roles: { administrator: [], moderator: [], trusted: [] } },
    featureFlags: { modules: {} },
    discord: { token: 't', clientId: 'c' },
    databaseUrl: '',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
    ...overrides,
  };
}

function makeBitField(permissions: bigint[]): { has: (perm: bigint) => boolean } {
  return {
    has(perm: bigint) {
      return permissions.includes(perm);
    },
  };
}

function makeGuildMember(userId: string, permissions: bigint[] = []) {
  return {
    id: userId,
    permissions: makeBitField(permissions),
  };
}

function makeGuild(mePermissions: bigint[] = [], meId = 'bot-1') {
  return {
    id: 'guild-1',
    members: {
      me: {
        id: meId,
        permissions: makeBitField(mePermissions),
      },
    },
  };
}

function makeCtx(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user: { id: 'user-1', displayName: 'TestUser' },
    member: makeGuildMember('user-1'),
    guild: makeGuild(),
    reply: vi.fn(),
    ...overrides,
  };
}

function makeCommand(overrides: Record<string, unknown> = {}) {
  return {
    name: 'testcmd',
    description: 'test',
    category: 'general',
    ...overrides,
  };
}

describe('PermissionMiddleware', () => {
  let eventBus: { emit: ReturnType<typeof vi.fn> };
  let logger: Record<string, ReturnType<typeof vi.fn>>;
  let metrics: { counter: ReturnType<typeof vi.fn>; incrementFn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    eventBus = { emit: vi.fn() };
    logger = { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() };
    const incrementFn = vi.fn();
    metrics = { counter: vi.fn(() => ({ increment: incrementFn })), incrementFn };
  });

  function createMiddleware(
    config?: Readonly<AppConfig>,
  ): { middleware: PermissionMiddleware; eventBus: typeof eventBus; metrics: typeof metrics } {
    return {
      middleware: new PermissionMiddleware(
        config ?? makeConfig(),
        logger as never,
        eventBus as never,
        metrics as never,
      ),
      eventBus,
      metrics,
    };
  }

  it('allows owners unconditionally', async () => {
    const config = makeConfig({ ownerIds: ['user-1'] });
    const { middleware } = createMiddleware(config);
    const ctx = makeCtx();
    const cmd = makeCommand({ guildOnly: true, requiredPermissions: [1n] });

    const result = await middleware.check(cmd as never, ctx as never);

    expect(result.ok).toBe(true);
  });

  describe('guildOnly', () => {
    it('rejects when guildOnly and no guild', async () => {
      const { middleware, eventBus, metrics } = createMiddleware();
      const ctx = makeCtx({ guild: null });
      const cmd = makeCommand({ guildOnly: true });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('guildOnly');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'guildOnly',
      });
      expect(metrics.incrementFn).toHaveBeenCalled();
    });

    it('allows when guildOnly and guild present', async () => {
      const { middleware } = createMiddleware();
      const ctx = makeCtx();
      const cmd = makeCommand({ guildOnly: true });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(true);
    });
  });

  describe('required permissions — user', () => {
    it('rejects when no member object', async () => {
      const { middleware, eventBus, metrics } = createMiddleware();
      const ctx = makeCtx({ member: null });
      const cmd = makeCommand({ requiredPermissions: [1n] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('no-member');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'no-member',
      });
      expect(metrics.incrementFn).toHaveBeenCalled();
    });

    it('rejects when user permissions unresolved (string)', async () => {
      const { middleware, eventBus, metrics } = createMiddleware();
      const ctx = makeCtx({
        member: { id: 'user-1', permissions: 'unresolved' },
      });
      const cmd = makeCommand({ requiredPermissions: [1n] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('permissions-unresolved');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'permissions-unresolved',
      });
      expect(metrics.incrementFn).toHaveBeenCalled();
    });

    it('rejects when user lacks a required permission', async () => {
      const PERM_A = 1n;
      const PERM_B = 2n;
      const { middleware, eventBus, metrics } = createMiddleware();
      const ctx = makeCtx({ member: makeGuildMember('user-1', [PERM_A]) });
      const cmd = makeCommand({ requiredPermissions: [PERM_A, PERM_B] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('user-permission');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'missing:2',
      });
      expect(metrics.incrementFn).toHaveBeenCalled();
    });

    it('grants when user has all permissions', async () => {
      const PERM = 1n;
      const { middleware } = createMiddleware();
      const ctx = makeCtx({
        member: makeGuildMember('user-1', [PERM]),
        guild: makeGuild([PERM]),
      });
      const cmd = makeCommand({ requiredPermissions: [PERM] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(true);
    });
  });

  describe('required permissions — bot', () => {
    it('rejects when bot member is missing', async () => {
      const PERM = 1n;
      const { middleware, eventBus, metrics } = createMiddleware();
      const ctx = makeCtx({
        member: makeGuildMember('user-1', [PERM]),
        guild: {
          id: 'guild-1',
          members: { me: null },
        },
      });
      const cmd = makeCommand({ requiredPermissions: [PERM] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('bot-no-member');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'bot-no-member',
      });
      expect(metrics.incrementFn).toHaveBeenCalled();
    });

    it('rejects when bot permissions unresolved (string)', async () => {
      const PERM = 1n;
      const { middleware, eventBus, metrics } = createMiddleware();
      const ctx = makeCtx({
        member: makeGuildMember('user-1', [PERM]),
        guild: {
          id: 'guild-1',
          members: {
            me: { id: 'bot-1', permissions: 'unresolved' },
          },
        },
      });
      const cmd = makeCommand({ requiredPermissions: [PERM] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('bot-permissions-unresolved');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'bot-permissions-unresolved',
      });
      expect(metrics.incrementFn).toHaveBeenCalled();
    });

    it('rejects when bot lacks a required permission', async () => {
      const PERM_A = 1n;
      const PERM_B = 2n;
      const { middleware, eventBus, metrics } = createMiddleware();
      const ctx = makeCtx({
        member: makeGuildMember('user-1', [PERM_A, PERM_B]),
        guild: makeGuild([PERM_A]),
      });
      const cmd = makeCommand({ requiredPermissions: [PERM_A, PERM_B] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('bot-permission');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'bot-missing:2',
      });
      expect(metrics.incrementFn).toHaveBeenCalled();
    });

    it('grants when bot has all permissions', async () => {
      const PERM = 1n;
      const { middleware } = createMiddleware();
      const ctx = makeCtx({
        member: makeGuildMember('user-1', [PERM]),
        guild: makeGuild([PERM]),
      });
      const cmd = makeCommand({ requiredPermissions: [PERM] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(true);
    });
  });

  describe('event emission', () => {
    it('emits permission.denied event with correct payload', async () => {
      const { middleware, eventBus } = createMiddleware();
      const ctx = makeCtx({ guild: null });
      const cmd = makeCommand({ guildOnly: true });

      await middleware.check(cmd as never, ctx as never);

      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', {
        userId: 'user-1',
        command: 'testcmd',
        reason: 'guildOnly',
      });
    });

    it('increments permission_denied metric', async () => {
      const { middleware, metrics } = createMiddleware();
      const ctx = makeCtx({ guild: null });
      const cmd = makeCommand({ guildOnly: true });

      await middleware.check(cmd as never, ctx as never);

      expect(metrics.counter).toHaveBeenCalledWith('permission_denied');
      expect(metrics.incrementFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('no required permissions', () => {
    it('grants when command has no required permissions', async () => {
      const { middleware } = createMiddleware();
      const ctx = makeCtx();
      const cmd = makeCommand({ requiredPermissions: undefined });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(true);
    });

    it('grants when command has empty required permissions array', async () => {
      const { middleware } = createMiddleware();
      const ctx = makeCtx();
      const cmd = makeCommand({ requiredPermissions: [] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(true);
    });
  });

  describe('DM users', () => {
    it('rejects DM user for guildOnly command', async () => {
      const { middleware, eventBus } = createMiddleware();
      const ctx = makeCtx({ guild: null, member: null });
      const cmd = makeCommand({ guildOnly: true });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('guildOnly');
      expect(eventBus.emit).toHaveBeenCalledWith('permission.denied', expect.objectContaining({ reason: 'guildOnly' }));
    });
  });

  describe('multiple permissions — all must be present', () => {
    it('rejects if user is missing even one of many permissions', async () => {
      const PERMS = [1n, 2n, 3n, 4n];
      const { middleware } = createMiddleware();
      const ctx = makeCtx({ member: makeGuildMember('user-1', [1n, 2n, 4n]) });
      const cmd = makeCommand({ requiredPermissions: PERMS });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('user-permission');
    });
  });

  describe('bot member checks skipped when no guild', () => {
    it('grants user with permissions even without guild', async () => {
      const { middleware } = createMiddleware();
      const ctx = makeCtx({ guild: null, member: makeGuildMember('user-1', [1n]) });
      const cmd = makeCommand({ requiredPermissions: [1n] });

      const result = await middleware.check(cmd as never, ctx as never);

      expect(result.ok).toBe(true);
    });
  });
});
