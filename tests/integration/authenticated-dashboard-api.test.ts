import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createAuthorizationMiddleware, createCsrfMiddleware, createModuleConfigEndpoints, createSessionAuthMiddleware, CsrfService } from '../../src/core/api/index.js';
import type { IAuthorizationProvider, ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';
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

const csrfService = new CsrfService({
  now: () => new Date('2026-07-07T00:00:00.000Z'),
  randomBytes: () => Buffer.alloc(32, 5),
  tokenTtlMs: 60_000,
});
const validCsrf = csrfService.generateToken();

function sessionProvider(valid: boolean): ISessionProvider {
  const record: SessionRecord = {
    id: 'valid-session',
    userId: 'user-1',
    user: { id: 'user-1', provider: 'discord', username: 'admin' },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    metadata: csrfService.attachToMetadata({ guilds: [{ id: 'guild-1', name: 'Guild One' }] }, validCsrf),
  };
  return {
    createSession: vi.fn(),
    getSession: vi.fn(async (id: string) => (valid && id === 'valid-session' ? record : undefined)),
    getSessionRecord: vi.fn(async (id: string) => (valid && id === 'valid-session' ? record : undefined)),
    refreshSession: vi.fn(),
    destroySession: vi.fn(),
  } as ISessionProvider & { getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> };
}

function authorizationProvider(allowed: boolean): IAuthorizationProvider {
  return {
    canAccessDashboard: vi.fn(),
    canAccessGuild: vi.fn(),
    canManageModule: vi.fn(async (_user, guildId) =>
      allowed
        ? { allowed: true, source: 'discord:manage-guild', reason: 'allowed', guildId, userId: 'user-1', action: 'module' }
        : { allowed: false, code: 'authorization.module_denied', reason: 'denied', guildId, userId: 'user-1', action: 'module' },
    ),
    canModifyConfiguration: vi.fn(async (_user, request) =>
      allowed
        ? { allowed: true, source: 'discord:manage-guild', reason: 'allowed', guildId: request.guildId, userId: 'user-1', action: request.action }
        : { allowed: false, code: 'authorization.configuration_denied', reason: 'denied', guildId: request.guildId, userId: 'user-1', action: request.action },
    ),
  } as IAuthorizationProvider;
}

function createRouter(validSession: boolean, authorized: boolean): APIRouter {
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
  router.use(createAuthorizationMiddleware({ authorizationProvider: authorizationProvider(authorized) }));
  router.use(createCsrfMiddleware({ csrfService }));
  const moduleStates = {
    getMany: vi.fn(async () => new Map<string, boolean>()),
    setMany: vi.fn(async () => true),
  };
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config, dashboardProjections: true, moduleStates })) {
    router.register(endpoint);
  }
  return router;
}

describe('authenticated dashboard API integration', () => {
  it('returns 401 for dashboard module endpoints without a valid session', async () => {
    await expect(createRouter(false, false).handle({ method: 'GET', path: '/api/v1/modules' })).resolves.toMatchObject({
      success: false,
      status: 401,
      error: { code: 'AUTH_REQUIRED' },
    });
  });

  it('returns 403 for guild settings endpoints when authenticated but unauthorized', async () => {
    await expect(
      createRouter(true, false).handle({
        method: 'GET',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=valid-session' },
      }),
    ).resolves.toMatchObject({ success: false, status: 403, error: { code: 'FORBIDDEN' } });
  });

  it('allows dashboard module endpoints with a valid session', async () => {
    await expect(
      createRouter(true, true).handle({ method: 'GET', path: '/api/v1/modules', headers: { cookie: 'hoak_session=valid-session' } }),
    ).resolves.toMatchObject({ success: true, data: { manifests: [expect.objectContaining({ id: 'general' })] } });
  });

  it('allows guild settings endpoints when authenticated and authorized', async () => {
    await expect(
      createRouter(true, true).handle({
        method: 'GET',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=valid-session' },
      }),
    ).resolves.toMatchObject({ success: true, data: { guildId: 'guild-1' } });
  });

  it('returns 403 for module state PATCH without CSRF', async () => {
    await expect(createRouter(true, true).handle({
      method: 'PATCH', path: '/api/v1/guilds/guild-1/modules/general', headers: { cookie: 'hoak_session=valid-session' }, body: { enabled: false },
    })).resolves.toMatchObject({ success: false, status: 403, error: { code: 'INVALID_CSRF' } });
  });

  it('returns 403 for module state PATCH by a non-admin', async () => {
    await expect(createRouter(true, false).handle({
      method: 'PATCH', path: '/api/v1/guilds/guild-1/modules/general', headers: { cookie: 'hoak_session=valid-session', 'X-CSRF-Token': validCsrf.token }, body: { enabled: false },
    })).resolves.toMatchObject({ success: false, status: 403, error: { code: 'FORBIDDEN' } });
  });

  it('rejects cross-guild module state writes', async () => {
    await expect(createRouter(true, true).handle({
      method: 'PATCH', path: '/api/v1/guilds/guild-2/modules/general', headers: { cookie: 'hoak_session=valid-session', 'X-CSRF-Token': validCsrf.token }, body: { enabled: false },
    })).resolves.toMatchObject({ success: false, status: 404, error: { code: 'GUILD_NOT_FOUND' } });
  });

  it('returns 403 for PATCH without CSRF', async () => {
    await expect(
      createRouter(true, true).handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=valid-session' },
        body: { settings: { 'general.prefix': '?' } },
      }),
    ).resolves.toMatchObject({ success: false, status: 403, error: { code: 'INVALID_CSRF' } });
  });

  it('returns 403 for PATCH with invalid CSRF', async () => {
    await expect(
      createRouter(true, true).handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=valid-session', 'X-CSRF-Token': 'invalid' },
        body: { settings: { 'general.prefix': '?' } },
      }),
    ).resolves.toMatchObject({ success: false, status: 403, error: { code: 'INVALID_CSRF' } });
  });

  it('returns 200 for PATCH with valid CSRF', async () => {
    await expect(
      createRouter(true, true).handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=valid-session', 'X-CSRF-Token': validCsrf.token },
        body: { settings: { 'general.prefix': '?' } },
      }),
    ).resolves.toMatchObject({ success: true, status: 200, data: { guildId: 'guild-1' } });
  });
});
