import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createModuleConfigEndpoints } from '../../src/core/api/index.js';
import { ConfigurationService } from '../../src/core/config/configuration.service.js';
import type { AppConfig } from '../../src/core/config/types.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import type { EventName, IEventBus, Subscription } from '../../src/core/event-bus/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createGeneralSettings, generalManifest } from '../../src/modules/general/index.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';

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
    permissions: { roles: { administrator: [], moderator: [], trusted: [] } },
    featureFlags: { modules: { general: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

describe('Live configuration API pipeline', () => {
  it('writes through ConfigurationService, invalidates cache, and emits runtime change events', async () => {
    const appConfig = config();
    const backingValues: Record<string, unknown> = { 'general.prefix': 'hoak' };
    const provider: IConfigProvider = {
      get: vi.fn(async <T>(key: string) => backingValues[key] as T | undefined),
      getMany: vi.fn(async <T>(keys: string[]) =>
        Object.fromEntries(keys.filter((key) => key in backingValues).map((key) => [key, backingValues[key] as T])),
      ),
      getDefaults: vi.fn(async () => backingValues),
      set: vi.fn(),
      setMany: vi.fn(async (entries) => {
        for (const entry of entries) {
          backingValues[entry.key] = entry.value;
        }
      }),
      watch: vi.fn(() => () => undefined),
    };
    const settings = new SettingsRegistry();
    settings.register('general', createGeneralSettings(appConfig));
    const manifests = new ManifestRegistry();
    manifests.register(generalManifest);
    const handlers = new Map<EventName, Array<(payload: unknown) => void>>();
    const eventBus: IEventBus = {
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
    const onChanged = vi.fn();
    eventBus.subscribe('configuration.changed', onChanged);
    const configuration = new ConfigurationService(provider, settings, eventBus, appConfig);

    const router = new APIRouter();
    for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config: configuration })) {
      router.register(endpoint);
    }

    await expect(configuration.get('general.prefix', 'guild-1')).resolves.toBe('hoak');
    await expect(
      router.handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        body: { settings: { 'general.prefix': '!' } },
      }),
    ).resolves.toMatchObject({
      success: true,
      data: { settings: [{ key: 'general.prefix', value: '!' }] },
    });

    await expect(configuration.get('general.prefix', 'guild-1')).resolves.toBe('!');
    expect(appConfig.bot.prefix).toBe('!');
    expect(onChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'general.prefix',
        oldValue: 'hoak',
        newValue: '!',
        guildId: 'guild-1',
      }),
    );
  });
});
