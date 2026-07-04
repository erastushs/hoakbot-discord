import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createModuleConfigEndpoints } from '../../src/core/api/index.js';
import type { AppConfig } from '../../src/core/config/types.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createModerationSettings, moderationManifest } from '../../src/modules/moderation/index.js';
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
    permissions: {
      roles: {
        administrator: ['Admin'],
        moderator: ['Moderator', 'Admin'],
        trusted: ['Trusted Member'],
      },
    },
    featureFlags: { modules: { moderation: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

function createRouter(provider: IConfigProvider): APIRouter {
  const manifests = new ManifestRegistry();
  manifests.register(moderationManifest);

  const settings = new SettingsRegistry();
  settings.register('moderation', createModerationSettings(config()));

  const router = new APIRouter();
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config: provider })) {
    router.register(endpoint);
  }

  return router;
}

describe('Moderation configuration API pipeline', () => {
  it('exposes Moderation manifest, metadata, and guild setting values', async () => {
    const provider: IConfigProvider = {
      get: vi.fn(),
      getMany: vi.fn(async () => ({
        'moderation.roles.moderator': ['Custom Mod'],
      })),
      getDefaults: vi.fn(),
      set: vi.fn(),
      setMany: vi.fn(),
      watch: vi.fn(() => () => undefined),
    };
    const router = createRouter(provider);

    await expect(router.handle({ method: 'GET', path: '/api/v1/modules' })).resolves.toMatchObject({
      success: true,
      data: { manifests: [expect.objectContaining({ id: 'moderation' })] },
    });

    await expect(
      router.handle({ method: 'GET', path: '/api/v1/modules/moderation/settings' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        settings: expect.arrayContaining([
          expect.objectContaining({ key: 'moderation.roles.moderator', type: 'role' }),
          expect.objectContaining({ key: 'moderation.roles.trusted', multiple: true }),
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
          expect.objectContaining({ key: 'moderation.roles.moderator', value: ['Custom Mod'] }),
          expect.objectContaining({ key: 'moderation.roles.administrator', value: ['Admin'] }),
        ]),
      },
    });
  });

  it('validates Moderation writes through the settings registry before persisting', async () => {
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
        body: { settings: { 'moderation.roles.moderator': 'Moderator' } },
      }),
    ).resolves.toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(setMany).not.toHaveBeenCalled();

    await expect(
      router.handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        body: { settings: { 'moderation.roles.moderator': ['Moderator'] } },
      }),
    ).resolves.toMatchObject({
      success: true,
      data: { settings: [{ key: 'moderation.roles.moderator', value: ['Moderator'] }] },
    });
    expect(setMany).toHaveBeenCalledWith(
      [{ key: 'moderation.roles.moderator', value: ['Moderator'] }],
      'guild-1',
    );
  });
});
