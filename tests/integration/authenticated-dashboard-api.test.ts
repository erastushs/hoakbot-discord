import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createModuleConfigEndpoints, createSessionAuthMiddleware } from '../../src/core/api/index.js';
import type { ISessionProvider, SessionConfig } from '../../src/core/auth/index.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createGeneralSettings, generalManifest } from '../../src/modules/general/index.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';
import type { AppConfig } from '../../src/core/config/types.js';

const sessionConfig: SessionConfig = { cookieName: 'hoak_session', durationMs: 60_000, secureCookies: false };

function appConfig(): Readonly<AppConfig> {
  return {
    bot: {
      prefix: 'hoak',
      guildId: 'guild-1',
      ownerIds: [],
      defaultLanguage: 'en',
      presence: { type: 'WATCHING', text: 'the Hoak Family' },
      cooldowns: { global: 1000, perUser: 3000 },
      voice: { standbyChannelId: '', joinDelayMs: 0, cooldownMs: 1, reconnectDelayMs: 1, maxReconnectRetries: 1, defaultSound: 'hoak', volume: 1 },
      logging: {
        enabled: false,
        voice: { enabled: false, channelId: '' },
        member: { enabled: false, channelId: '', roles: true },
        message: { enabled: false, channelId: '', archiveAttachments: false, maxAttachmentSizeMb: 10 },
        moderation: { enabled: false, channelId: '' },
      },
      welcome: { enabled: false, channelId: '', backgroundUrl: '', message: { title: '', body: [] }, image: { title: '', subtitle: '' } },
      goodbye: { enabled: false, channelId: '', image: { backgroundUrl: '', title: '', subtitle: '' } },
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

function sessionProvider(valid: boolean): ISessionProvider {
  return {
    createSession: vi.fn(),
    getSession: vi.fn(async (id: string) =>
      valid && id === 'valid-session'
        ? { id, userId: 'user-1', createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) }
        : undefined,
    ),
    refreshSession: vi.fn(),
    destroySession: vi.fn(),
  } as ISessionProvider;
}

function createRouter(validSession: boolean): APIRouter {
  const manifests = new ManifestRegistry();
  manifests.register(generalManifest);
  const settings = new SettingsRegistry();
  settings.register('general', createGeneralSettings(appConfig()));
  const config: IConfigProvider = {
    get: vi.fn(),
    getMany: vi.fn(async () => ({ 'general.prefix': '!' })),
    getDefaults: vi.fn(),
    set: vi.fn(),
    setMany: vi.fn(),
    watch: vi.fn(() => () => undefined),
  };
  const router = new APIRouter();
  router.use(createSessionAuthMiddleware({ sessionProvider: sessionProvider(validSession), sessionConfig }));
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config })) {
    router.register(endpoint);
  }
  return router;
}

describe('authenticated dashboard API integration', () => {
  it('returns 401 for dashboard module endpoints without a valid session', async () => {
    await expect(createRouter(false).handle({ method: 'GET', path: '/api/v1/modules' })).resolves.toMatchObject({
      success: false,
      status: 401,
      error: { code: 'AUTH_REQUIRED' },
    });
  });

  it('allows dashboard module endpoints with a valid session', async () => {
    await expect(
      createRouter(true).handle({ method: 'GET', path: '/api/v1/modules', headers: { cookie: 'hoak_session=valid-session' } }),
    ).resolves.toMatchObject({ success: true, data: { manifests: [expect.objectContaining({ id: 'general' })] } });
  });
});
