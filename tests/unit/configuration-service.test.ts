import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ConfigurationService } from '../../src/core/config/configuration.service.js';
import type { AppConfig } from '../../src/core/config/types.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import type { EventName, IEventBus, Subscription } from '../../src/core/event-bus/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';

function config(): Readonly<AppConfig> {
  return {
    bot: {
      prefix: 'hoak',
      guildId: 'guild-1',
      ownerIds: [],
      defaultLanguage: 'en',
      presence: { type: 'WATCHING', text: 'the Hoak Family' },
      cooldowns: { global: 1000, perUser: 3000 },
      voice: {
        standbyChannelId: '',
        joinDelayMs: 2000,
        cooldownMs: 5000,
        reconnectDelayMs: 3000,
        maxReconnectRetries: 5,
        defaultSound: 'hoak',
        volume: 1,
      },
      logging: {
        enabled: false,
        voice: { enabled: false, channelId: '' },
        member: { enabled: false, channelId: '', roles: true },
        message: { enabled: false, channelId: '', archiveAttachments: false, maxAttachmentSizeMb: 10 },
        moderation: { enabled: false, channelId: '' },
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
    permissions: { roles: { administrator: ['Admin'], moderator: ['Mod'], trusted: ['Trusted'] } },
    featureFlags: { modules: { general: true, voice: true, moderation: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

function provider(values: Record<string, unknown>): IConfigProvider {
  return {
    get: vi.fn(async <T>(key: string) => values[key] as T | undefined),
    getMany: vi.fn(async <T>(keys: string[]) =>
      Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key] as T])),
    ),
    getDefaults: vi.fn(async () => values),
    set: vi.fn(async (key: string, value: unknown) => {
      values[key] = value;
    }),
    setMany: vi.fn(async (entries) => {
      for (const entry of entries) {
        values[entry.key] = entry.value;
      }
    }),
    watch: vi.fn(() => () => undefined),
  };
}

function settings(): SettingsRegistry {
  const registry = new SettingsRegistry();
  registry.register('general', [
    {
      key: 'general.prefix',
      label: 'Prefix',
      description: 'Prefix',
      group: 'general',
      category: 'General',
      type: 'string',
      defaultValue: 'hoak',
      validation: z.string().min(1),
    },
  ]);
  registry.register('voice', [
    {
      key: 'voice.volume',
      label: 'Volume',
      description: 'Volume',
      group: 'voice',
      category: 'Voice',
      type: 'number',
      defaultValue: 1,
      validation: z.number().min(0).max(2),
    },
  ]);
  registry.register('moderation', [
    {
      key: 'moderation.roles.moderator',
      label: 'Moderator Roles',
      description: 'Moderator Roles',
      group: 'roles',
      category: 'Moderation',
      type: 'role',
      defaultValue: ['Mod'],
      validation: z.array(z.string()),
    },
  ]);
  return registry;
}

function bus(): IEventBus {
  const handlers = new Map<EventName, Array<(payload: unknown) => void>>();

  return {
    subscribe: vi.fn((event: EventName, handler: (payload: unknown) => void): Subscription => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return { unsubscribe: vi.fn() };
    }),
    once: vi.fn((event: EventName, handler: (payload: unknown) => void): Subscription => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return { unsubscribe: vi.fn() };
    }),
    emit: vi.fn((event: EventName, payload?: unknown) => {
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    }),
    subscriberCount: vi.fn((event: EventName) => handlers.get(event)?.length ?? 0),
    removeAllListeners: vi.fn(() => handlers.clear()),
  };
}

describe('ConfigurationService', () => {
  it('caches provider reads and invalidates cache on writes', async () => {
    const backing = provider({ 'voice.volume': 1 });
    const service = new ConfigurationService(backing, settings(), bus(), config());

    await expect(service.get('voice.volume', 'guild-1')).resolves.toBe(1);
    await expect(service.get('voice.volume', 'guild-1')).resolves.toBe(1);
    expect(backing.get).toHaveBeenCalledTimes(1);

    await service.set('voice.volume', 0.5, { guildId: 'guild-1' });
    await expect(service.get('voice.volume', 'guild-1')).resolves.toBe(0.5);
    expect(backing.set).toHaveBeenCalledWith('voice.volume', 0.5, { guildId: 'guild-1' });
  });

  it('validates settings before writes', async () => {
    const service = new ConfigurationService(provider({}), settings(), bus(), config());

    expect(service.validate('general.prefix', '')).toMatchObject({ success: false });
    await expect(service.set('general.prefix', '')).rejects.toThrow();
  });

  it('uses authoritative transactional changes for post-commit events', async () => {
    const eventBus = bus();
    const onChanged = vi.fn();
    eventBus.subscribe('configuration.changed', onChanged);
    const backing = provider({ 'general.prefix': 'stale' });
    backing.setMany = vi.fn(async () => ({
      version: 4,
      changes: [{ key: 'general.prefix', oldValue: 'authoritative', newValue: '!' }],
    }));
    const service = new ConfigurationService(backing, settings(), eventBus, config());

    await service.setMany([{ key: 'general.prefix', value: '!' }], 'guild-1');

    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ oldValue: 'authoritative', newValue: '!' }));
  });

  it('produces no post-commit side effects when persistence fails', async () => {
    const eventBus = bus();
    const onChanged = vi.fn();
    eventBus.subscribe('configuration.changed', onChanged);
    const backing = provider({ 'general.prefix': 'hoak' });
    backing.setMany = vi.fn(async () => { throw new Error('rollback'); });
    const appConfig = config();
    const service = new ConfigurationService(backing, settings(), eventBus, appConfig);

    await expect(service.setMany([{ key: 'general.prefix', value: '!' }], 'guild-1')).rejects.toThrow('rollback');

    expect(onChanged).not.toHaveBeenCalled();
    expect(appConfig.bot.prefix).toBe('hoak');
  });

  it('emits configuration.changed and updates the live runtime snapshot', async () => {
    const eventBus = bus();
    const onChanged = vi.fn();
    eventBus.subscribe('configuration.changed', onChanged);
    const appConfig = config();
    const service = new ConfigurationService(provider({ 'general.prefix': 'hoak' }), settings(), eventBus, appConfig);

    await service.set('general.prefix', '!', { guildId: 'guild-1', source: 'api' });
    await service.set('moderation.roles.moderator', ['Helper'], { guildId: 'guild-1', source: 'api' });

    expect(appConfig.bot.prefix).toBe('!');
    expect(appConfig.permissions.roles.moderator).toEqual(['Helper']);
    expect(onChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'general.prefix',
        oldValue: 'hoak',
        newValue: '!',
        guildId: 'guild-1',
        source: 'api',
      }),
    );
  });
});
