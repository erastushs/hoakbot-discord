import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createModuleConfigEndpoints } from '../../src/core/api/index.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createGeneralSettings, generalManifest } from '../../src/modules/general/index.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';
import type { AppConfig } from '../../src/core/config/types.js';

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

function createRouter(provider: IConfigProvider): APIRouter {
  const manifests = new ManifestRegistry();
  manifests.register(generalManifest);

  const settings = new SettingsRegistry();
  settings.register('general', createGeneralSettings(config()));

  const router = new APIRouter();
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config: provider })) {
    router.register(endpoint);
  }

  return router;
}

describe('General configuration API pipeline', () => {
  it('exposes General manifest, metadata, and guild setting values', async () => {
    const provider: IConfigProvider = {
      get: vi.fn(),
      getMany: vi.fn(async () => ({ 'general.prefix': '!' })),
      getDefaults: vi.fn(),
      set: vi.fn(),
      setMany: vi.fn(),
      watch: vi.fn(() => () => undefined),
    };
    const router = createRouter(provider);

    await expect(router.handle({ method: 'GET', path: '/api/v1/modules' })).resolves.toMatchObject({
      success: true,
      data: { manifests: [expect.objectContaining({ id: 'general' })] },
    });

    await expect(
      router.handle({ method: 'GET', path: '/api/v1/modules/general/settings' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        settings: [
          expect.objectContaining({
            key: 'general.prefix',
            validationSchema: expect.objectContaining({ minLength: 1 }),
          }),
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
        ],
      },
    });

    await expect(
      router.handle({ method: 'GET', path: '/api/v1/guilds/guild-1/settings' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        guildId: 'guild-1',
        settings: expect.arrayContaining([
          expect.objectContaining({ key: 'general.prefix', value: '!' }),
          expect.objectContaining({ key: 'general.defaultLanguage', value: 'en' }),
        ]),
      },
    });
  });

  it('validates writes through the settings registry before persisting', async () => {
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
        body: { settings: { 'general.prefix': '' } },
      }),
    ).resolves.toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(setMany).not.toHaveBeenCalled();

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
    expect(setMany).toHaveBeenCalledWith([{ key: 'general.prefix', value: '!' }], 'guild-1');
  });
});
