import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createModuleConfigEndpoints } from '../../src/core/api/index.js';
import type { AppConfig } from '../../src/core/config/types.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createWelcomeSettings, welcomeManifest } from '../../src/modules/welcome/index.js';
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
        enabled: true,
        channelId: 'welcome-channel',
        backgroundUrl: 'https://example.com/welcome.png',
        message: { title: 'Welcome to {server}', body: ['Hello {mention}'] },
        image: { title: 'WELCOME', subtitle: 'TO {server}' },
      },
      goodbye: {
        enabled: false,
        channelId: '',
        image: { backgroundUrl: '', title: '', subtitle: '' },
      },
    },
    permissions: { roles: { administrator: [], moderator: [], trusted: [] } },
    featureFlags: { modules: { welcome: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

function createRouter(provider: IConfigProvider): APIRouter {
  const manifests = new ManifestRegistry();
  manifests.register(welcomeManifest);

  const settings = new SettingsRegistry();
  settings.register('welcome', createWelcomeSettings(config()));

  const router = new APIRouter();
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config: provider })) {
    router.register(endpoint);
  }

  return router;
}

describe('Welcome configuration API pipeline', () => {
  it('exposes Welcome manifest, metadata, and guild setting values', async () => {
    const provider: IConfigProvider = {
      get: vi.fn(),
      getMany: vi.fn(async () => ({
        'welcome.channelId': 'custom-welcome',
      })),
      getDefaults: vi.fn(),
      set: vi.fn(),
      setMany: vi.fn(),
      watch: vi.fn(() => () => undefined),
    };
    const router = createRouter(provider);

    await expect(router.handle({ method: 'GET', path: '/api/v1/modules' })).resolves.toMatchObject({
      success: true,
      data: { manifests: [expect.objectContaining({ id: 'welcome' })] },
    });

    await expect(
      router.handle({ method: 'GET', path: '/api/v1/modules/welcome/settings' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        settings: expect.arrayContaining([
          expect.objectContaining({ key: 'welcome.channelId', type: 'channel' }),
          expect.objectContaining({ key: 'welcome.message.body', type: 'json' }),
        ]),
      },
    });

    await expect(
      router.handle({ method: 'GET', path: '/api/v1/guilds/guild-1/settings' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        guildId: 'guild-1',
        settings: expect.arrayContaining([
          expect.objectContaining({ key: 'welcome.channelId', value: 'custom-welcome' }),
          expect.objectContaining({ key: 'welcome.image.title', value: 'WELCOME' }),
        ]),
      },
    });
  });

  it('validates Welcome writes through the settings registry before persisting', async () => {
    const setMany = vi.fn();
    const router = createRouter({
      get: vi.fn(),
      getMany: vi.fn(),
      getDefaults: vi.fn(),
      set: vi.fn(),
      setMany,
      watch: vi.fn(() => () => undefined),
    });

    await expect(
      router.handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        body: { settings: { 'welcome.message.body': 'Hello' } },
      }),
    ).resolves.toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(setMany).not.toHaveBeenCalled();

    await expect(
      router.handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        body: { settings: { 'welcome.message.body': ['Hello'] } },
      }),
    ).resolves.toMatchObject({
      success: true,
      data: { settings: [{ key: 'welcome.message.body', value: ['Hello'] }] },
    });
    expect(setMany).toHaveBeenCalledWith(
      [{ key: 'welcome.message.body', value: ['Hello'] }],
      'guild-1',
    );
  });
});
