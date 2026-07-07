import { describe, expect, it, vi } from 'vitest';

import {
  APIRouter,
  createAuthEndpoints,
  createAuthorizationMiddleware,
  createCsrfEndpoints,
  createCsrfMiddleware,
  createModuleConfigEndpoints,
  createRateLimitMiddleware,
  createSessionAuthMiddleware,
  CsrfService,
  RateLimiter,
} from '../../src/core/api/index.js';
import type { RateLimitRouteRule } from '../../src/core/api/index.js';
import type { GuildResolver, IAuthProvider, IAuthorizationProvider, ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import type { AppConfig } from '../../src/core/config/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createGeneralSettings, generalManifest } from '../../src/modules/general/index.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';

const sessionConfig: SessionConfig = { cookieName: 'hoak_session', durationMs: 60_000, secureCookies: false };
const csrfService = new CsrfService({
  now: () => new Date('2026-07-07T00:00:00.000Z'),
  randomBytes: () => Buffer.alloc(32, 6),
  tokenTtlMs: 60_000,
});
const validCsrf = csrfService.generateToken();

const testRules: readonly RateLimitRouteRule[] = [
  { name: 'auth-login', method: 'GET', path: '/api/v1/auth/login', limit: 2, windowMs: 60_000 },
  { name: 'auth-callback', method: 'GET', path: '/api/v1/auth/callback', limit: 2, windowMs: 60_000 },
  { name: 'me', method: 'GET', path: '/api/v1/me', limit: 2, windowMs: 60_000 },
  { name: 'config-write', method: 'PATCH', path: '/api/v1/guilds/:guildId/settings', limit: 2, windowMs: 60_000 },
];

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

function authProvider(): IAuthProvider {
  return {
    beginLogin: vi.fn(async () => ({
      authorizationUrl: 'https://discord.com/oauth2/authorize',
      state: { value: 'state', createdAt: new Date(), expiresAt: new Date() },
    })),
    handleCallback: vi.fn(async () => ({ ok: false, code: 'auth.cancelled', message: 'cancelled' })),
    getCurrentUser: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
  };
}

function sessionProvider(): ISessionProvider {
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
    getSession: vi.fn(async (id: string) => (id === 'valid-session' ? record : undefined)),
    getSessionRecord: vi.fn(async (id: string) => (id === 'valid-session' ? record : undefined)),
    refreshSession: vi.fn(),
    destroySession: vi.fn(),
  } as ISessionProvider & { getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> };
}

function authorizationProvider(): IAuthorizationProvider {
  return {
    canAccessDashboard: vi.fn(),
    canAccessGuild: vi.fn(async () => ({ allowed: true, source: 'discord:manage-guild', reason: 'allowed', guildId: 'guild-1', userId: 'user-1', action: 'guild' })),
    canManageModule: vi.fn(),
    canModifyConfiguration: vi.fn(async (_user, request) => ({
      allowed: true,
      source: 'discord:manage-guild',
      reason: 'allowed',
      guildId: request.guildId,
      userId: 'user-1',
      action: request.action,
    })),
  } as IAuthorizationProvider;
}

function guildResolver(): GuildResolver {
  return {
    resolveGuild: vi.fn(async (_user, guildId: string) => ({ guildId, botGuild: { id: guildId }, userGuild: { id: guildId }, inBotGuild: true, inUserGuild: true })),
    resolveAccessibleGuilds: vi.fn(),
  } as unknown as GuildResolver;
}

function createRouter(): APIRouter {
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

  const sessions = sessionProvider();
  const authz = authorizationProvider();
  const router = new APIRouter();
  router.use(createRateLimitMiddleware({ limiter: new RateLimiter({ now: () => 1_000 }), rules: testRules }));
  router.use(createSessionAuthMiddleware({ sessionProvider: sessions, sessionConfig }));
  router.use(createAuthorizationMiddleware({ authorizationProvider: authz }));
  router.use(createCsrfMiddleware({ csrfService }));
  for (const endpoint of createAuthEndpoints({ authProvider: authProvider(), sessionProvider: sessions, sessionConfig, authorizationProvider: authz, guildResolver: guildResolver(), csrfService })) {
    router.register(endpoint);
  }
  for (const endpoint of createCsrfEndpoints({ csrfService, sessionProvider: sessions })) {
    router.register(endpoint);
  }
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config })) {
    router.register(endpoint);
  }

  return router;
}

async function exhaust(router: APIRouter, request: Parameters<APIRouter['handle']>[0]) {
  await expect(router.handle(request)).resolves.toMatchObject({ success: true });
  await expect(router.handle(request)).resolves.toMatchObject({ success: true });
  return router.handle(request);
}

describe('rate-limited dashboard API integration', () => {
  it('allows login requests below limit and rejects repeated login endpoint requests', async () => {
    await expect(await exhaust(createRouter(), { method: 'GET', path: '/api/v1/auth/login', ip: '10.0.0.1' })).toMatchObject({
      success: false,
      status: 429,
      error: { code: 'RATE_LIMITED' },
      headers: { 'Retry-After': '60', 'X-RateLimit-Limit': '2', 'X-RateLimit-Remaining': '0' },
    });
  });

  it('rejects repeated callback endpoint requests', async () => {
    await expect(await exhaust(createRouter(), { method: 'GET', path: '/api/v1/auth/callback', ip: '10.0.0.2' })).toMatchObject({
      success: false,
      status: 429,
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('rejects repeated /me requests', async () => {
    await expect(await exhaust(createRouter(), { method: 'GET', path: '/api/v1/me', headers: { cookie: 'hoak_session=valid-session' }, ip: '10.0.0.3' })).toMatchObject({
      success: false,
      status: 429,
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('rejects repeated PATCH settings requests', async () => {
    const request = {
      method: 'PATCH' as const,
      path: '/api/v1/guilds/guild-1/settings',
      headers: { cookie: 'hoak_session=valid-session', 'X-CSRF-Token': validCsrf.token },
      body: { settings: { 'general.prefix': '?' } },
      ip: '10.0.0.4',
    };

    await expect(await exhaust(createRouter(), request)).toMatchObject({
      success: false,
      status: 429,
      error: { code: 'RATE_LIMITED' },
    });
  });
});
