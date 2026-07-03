import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRouter } from '../../src/adapters/command-router.js';
import { CommandRegistry } from '../../src/shared/command-registry.js';
import type { ICommand } from '../../src/shared/types/command.js';
import type { AppConfig } from '../../src/core/config/types.js';

function makeCommand(overrides: Partial<ICommand> = {}): ICommand {
  return {
    name: 'test',
    description: 'test command',
    category: 'general',
    execute: vi.fn(),
    ...overrides,
  };
}

function makeConfig(ownerIds: string[] = []): Readonly<AppConfig> {
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
        member: { enabled: false, channelId: '' },
        message: { enabled: false, channelId: '', archiveAttachments: false, maxAttachmentSizeMb: 1 },
      },
      welcome: {
        enabled: false,
        channelId: '',
        backgroundUrl: '',
        message: { title: '', body: [] },
        image: { title: '', subtitle: '' },
      },
      goodbye: {
        enabled: false,
        channelId: '',
        image: { backgroundUrl: '', title: '', subtitle: '' },
      },
    },
    permissions: { roles: { administrator: [], moderator: [], trusted: [] } },
    featureFlags: { modules: {} },
    discord: { token: 't', clientId: 'c' },
    databaseUrl: '',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds,
  };
}

describe('CommandRouter', () => {
  let registry: CommandRegistry;
  let logger: { debug: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let eventBus: { emit: ReturnType<typeof vi.fn> };
  let metrics: { counter: ReturnType<typeof vi.fn>; gauge: ReturnType<typeof vi.fn>; incrementFn: ReturnType<typeof vi.fn> };
  let router: CommandRouter;

  beforeEach(() => {
    registry = new CommandRegistry();
    logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    eventBus = { emit: vi.fn() };
    const incrementFn = vi.fn();
    metrics = { counter: vi.fn(() => ({ increment: incrementFn })), gauge: vi.fn(() => ({ set: vi.fn() })), incrementFn };
    router = new CommandRouter(registry, makeConfig(), logger as never, eventBus as never, metrics as never);
  });

  function makeInteraction(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      commandName: 'ping',
      user: { id: 'user-1', displayName: 'TestUser' },
      member: { id: 'user-1', permissions: { has: vi.fn(() => true) }, roles: { highest: { position: 10 } } },
      guild: {
        id: 'guild-1',
        ownerId: 'owner-1',
        members: {
          me: { id: 'bot-1', permissions: { has: vi.fn(() => true) }, roles: { highest: { position: 50 } } },
        },
      },
      channel: { id: 'ch-1' },
      options: { data: [] },
      createdAt: new Date(),
      deferred: false,
      replied: false,
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue({}),
      ...overrides,
    };
  }

  function makeMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      content: '!ping',
      author: { id: 'user-1', displayName: 'TestUser' },
      member: { id: 'user-1', permissions: { has: vi.fn(() => true) }, roles: { highest: { position: 10 } } },
      guild: {
        id: 'guild-1',
        ownerId: 'owner-1',
        members: {
          me: { id: 'bot-1', permissions: { has: vi.fn(() => true) }, roles: { highest: { position: 50 } } },
        },
      },
      channel: { id: 'ch-1' },
      mentions: { users: { get: vi.fn(() => null) } },
      createdAt: new Date(),
      reply: vi.fn().mockResolvedValue({}),
      ...overrides,
    };
  }

  describe('handleSlash', () => {
    it('executes known command', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'ping', execute });
      registry.register(cmd);

      const interaction = makeInteraction({ commandName: 'ping' });

      await router.handleSlash(interaction as never);

      expect(interaction.deferReply).toHaveBeenCalled();
      expect(execute).toHaveBeenCalledOnce();
      expect(eventBus.emit).toHaveBeenCalledWith('command.executed', expect.objectContaining({
        command: 'ping',
        source: 'slash',
        userId: 'user-1',
      }));
    });

    it('logs warning for unknown slash command', async () => {
      const interaction = makeInteraction({ commandName: 'nonexistent' });

      await router.handleSlash(interaction as never);

      expect(logger.warn).toHaveBeenCalledWith(
        { command: 'nonexistent' },
        'Unknown slash command',
      );
      expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it('skips deferReply if already deferred', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'ping', execute });
      registry.register(cmd);

      const interaction = makeInteraction({ commandName: 'ping', deferred: true });

      await router.handleSlash(interaction as never);

      expect(interaction.deferReply).not.toHaveBeenCalled();
      expect(execute).toHaveBeenCalledOnce();
    });

    it('case insensitive lookup', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'Ping', execute });
      registry.register(cmd);

      const interaction = makeInteraction({ commandName: 'ping' });

      await router.handleSlash(interaction as never);

      expect(execute).toHaveBeenCalledOnce();
    });
  });

  describe('handlePrefix', () => {
    it('executes known prefix command', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'ping', execute });
      registry.register(cmd);

      const message = makeMessage({ content: '!ping' });

      await router.handlePrefix(message as never);

      expect(execute).toHaveBeenCalledOnce();
      expect(eventBus.emit).toHaveBeenCalledWith('command.executed', expect.objectContaining({
        command: 'ping',
        source: 'prefix',
        userId: 'user-1',
      }));
    });

    it('ignores unknown command', async () => {
      const message = makeMessage({ content: '!unknowncmd' });

      await router.handlePrefix(message as never);

      expect(metrics.incrementFn).not.toHaveBeenCalled();
    });

    it('resolves by alias', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'help', prefixAliases: ['h'], execute });
      registry.register(cmd);

      const message = makeMessage({ content: '!h' });

      await router.handlePrefix(message as never);

      expect(execute).toHaveBeenCalledOnce();
    });

    it('case insensitive prefix', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'Ping', execute });
      registry.register(cmd);

      const message = makeMessage({ content: '!PING' });

      await router.handlePrefix(message as never);

      expect(execute).toHaveBeenCalledOnce();
    });

    it('ignores message without prefix', async () => {
      const message = makeMessage({ content: 'hello world' });

      await router.handlePrefix(message as never);

      expect(metrics.incrementFn).not.toHaveBeenCalled();
    });

    it('ignores message with only prefix and no command', async () => {
      const message = makeMessage({ content: '!' });

      await router.handlePrefix(message as never);

      expect(metrics.incrementFn).not.toHaveBeenCalled();
    });

    it('ignores empty command name', async () => {
      const message = makeMessage({ content: '!   ' });

      await router.handlePrefix(message as never);

      expect(metrics.incrementFn).not.toHaveBeenCalled();
    });

    it('case insensitive alias lookup', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'help', prefixAliases: ['H'], execute });
      registry.register(cmd);

      const message = makeMessage({ content: '!h' });

      await router.handlePrefix(message as never);

      expect(execute).toHaveBeenCalledOnce();
    });
  });

  describe('permission denial', () => {
    it('does not execute when permission check fails', async () => {
      const execute = vi.fn();
      const cmd = makeCommand({ name: 'kick', guildOnly: true, execute });
      registry.register(cmd);

      const interaction = makeInteraction({
        commandName: 'kick',
        guild: null,
        member: null,
      });

      await router.handleSlash(interaction as never);

      expect(execute).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalledWith('command.executed', expect.anything());
    });
  });

  describe('error handling', () => {
    it('emits command.failed when execute throws', async () => {
      const error = new Error('boom');
      const execute = vi.fn().mockRejectedValue(error);
      const cmd = makeCommand({ name: 'ping', execute });
      registry.register(cmd);

      const message = makeMessage({ content: '!ping' });

      await router.handlePrefix(message as never);

      expect(eventBus.emit).toHaveBeenCalledWith('command.failed', {
        command: 'ping',
        source: 'prefix',
        userId: 'user-1',
        guildId: 'guild-1',
        error,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('wraps non-Error thrown values', async () => {
      const execute = vi.fn().mockRejectedValue('string error');
      const cmd = makeCommand({ name: 'ping', execute });
      registry.register(cmd);

      const message = makeMessage({ content: '!ping' });

      await router.handlePrefix(message as never);

      const call = eventBus.emit.mock.calls.find((c: unknown[]) => c[0] === 'command.failed');
      expect(call[1].error).toBeInstanceOf(Error);
      expect(call[1].error.message).toBe('string error');
    });
  });
});
