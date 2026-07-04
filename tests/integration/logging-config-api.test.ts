import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createModuleConfigEndpoints } from '../../src/core/api/index.js';
import type { AppConfig } from '../../src/core/config/types.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createLoggingSettings, loggingManifest } from '../../src/modules/logging/index.js';
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
        enabled: true,
        voice: { enabled: true, channelId: 'voice-log' },
        member: { enabled: true, channelId: 'member-log', roles: true },
        message: {
          enabled: true,
          channelId: 'message-log',
          archiveAttachments: true,
          maxAttachmentSizeMb: 10,
        },
        moderation: { enabled: true, channelId: 'moderation-log' },
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
    featureFlags: { modules: { logging: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

function createRouter(provider: IConfigProvider): APIRouter {
  const manifests = new ManifestRegistry();
  manifests.register(loggingManifest);

  const settings = new SettingsRegistry();
  settings.register('logging', createLoggingSettings(config()));

  const router = new APIRouter();
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config: provider })) {
    router.register(endpoint);
  }

  return router;
}

describe('Logging configuration API pipeline', () => {
  it('exposes Logging manifest, metadata, and guild setting values', async () => {
    const provider: IConfigProvider = {
      get: vi.fn(),
      getMany: vi.fn(async () => ({
        'logging.message.maxAttachmentSizeMb': 20,
      })),
      getDefaults: vi.fn(),
      set: vi.fn(),
      setMany: vi.fn(),
      watch: vi.fn(() => () => undefined),
    };
    const router = createRouter(provider);

    await expect(router.handle({ method: 'GET', path: '/api/v1/modules' })).resolves.toMatchObject({
      success: true,
      data: { manifests: [expect.objectContaining({ id: 'logging' })] },
    });

    await expect(
      router.handle({ method: 'GET', path: '/api/v1/modules/logging/settings' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        settings: expect.arrayContaining([
          expect.objectContaining({
            key: 'logging.message.maxAttachmentSizeMb',
            validationSchema: expect.objectContaining({ minimum: 1 }),
          }),
          expect.objectContaining({
            key: 'logging.voice.channelId',
            type: 'channel',
          }),
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
          expect.objectContaining({ key: 'logging.message.maxAttachmentSizeMb', value: 20 }),
          expect.objectContaining({ key: 'logging.member.roles', value: true }),
        ]),
      },
    });
  });

  it('validates Logging writes through the settings registry before persisting', async () => {
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
        body: { settings: { 'logging.message.maxAttachmentSizeMb': 0 } },
      }),
    ).resolves.toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(setMany).not.toHaveBeenCalled();

    await expect(
      router.handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        body: { settings: { 'logging.message.maxAttachmentSizeMb': 25 } },
      }),
    ).resolves.toMatchObject({
      success: true,
      data: { settings: [{ key: 'logging.message.maxAttachmentSizeMb', value: 25 }] },
    });
    expect(setMany).toHaveBeenCalledWith(
      [{ key: 'logging.message.maxAttachmentSizeMb', value: 25 }],
      'guild-1',
    );
  });
});
