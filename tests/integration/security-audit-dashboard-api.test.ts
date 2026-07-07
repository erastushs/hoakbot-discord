import { describe, expect, it, vi } from 'vitest';

import {
  APIRouter,
  createAuthorizationMiddleware,
  createCsrfMiddleware,
  createModuleConfigEndpoints,
  createRateLimitMiddleware,
  createSecurityAuditMiddleware,
  createSessionAuthMiddleware,
  CsrfService,
  RateLimiter,
  SecurityAuditService,
} from '../../src/core/api/index.js';
import type { IAuthorizationProvider, ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import type { AppConfig } from '../../src/core/config/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createGeneralSettings, generalManifest } from '../../src/modules/general/index.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';

const sessionConfig: SessionConfig = { cookieName: 'hoak_session', durationMs: 60_000, secureCookies: false };
const csrfService = new CsrfService({ now: () => new Date('2026-07-07T00:00:00.000Z'), randomBytes: () => Buffer.alloc(32, 7), tokenTtlMs: 60_000 });
const validCsrf = csrfService.generateToken();

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

function logger() {
  return { info: vi.fn(), warn: vi.fn() };
}

function sessionProvider(valid = true): ISessionProvider {
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

function authorizationProvider(allowed = true): IAuthorizationProvider {
  return {
    canAccessDashboard: vi.fn(),
    canAccessGuild: vi.fn(),
    canManageModule: vi.fn(),
    canModifyConfiguration: vi.fn(async (_user, request) => allowed
      ? { allowed: true, source: 'discord:manage-guild', reason: 'allowed', guildId: request.guildId, userId: 'user-1', action: request.action }
      : { allowed: false, code: 'authorization.configuration_denied', reason: 'denied', guildId: request.guildId, userId: 'user-1', action: request.action }),
  } as IAuthorizationProvider;
}

function createRouter(log = logger(), options: { validSession?: boolean; authorized?: boolean; rateLimit?: boolean } = {}): APIRouter {
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
  const audit = new SecurityAuditService(log, { now: () => new Date('2026-07-07T00:00:00.000Z') });
  const router = new APIRouter();
  router.use(createSecurityAuditMiddleware({ audit }));
  if (options.rateLimit) {
    router.use(createRateLimitMiddleware({
      limiter: new RateLimiter({ now: () => 1_000 }),
      rules: [{ name: 'config-write', method: 'PATCH', path: '/api/v1/guilds/:guildId/settings', limit: 1, windowMs: 60_000 }],
    }));
  }
  router.use(createSessionAuthMiddleware({ sessionProvider: sessionProvider(options.validSession ?? true), sessionConfig }));
  router.use(createAuthorizationMiddleware({ authorizationProvider: authorizationProvider(options.authorized ?? true) }));
  router.use(createCsrfMiddleware({ csrfService }));
  for (const endpoint of createModuleConfigEndpoints({ manifests, settings, config, audit })) {
    router.register(endpoint);
  }
  return router;
}

function patchRequest(ip = '127.0.0.1') {
  return {
    method: 'PATCH' as const,
    path: '/api/v1/guilds/guild-1/settings',
    ip,
    headers: { cookie: 'hoak_session=valid-session', 'X-CSRF-Token': validCsrf.token },
    body: { settings: { 'general.prefix': '?' } },
  };
}

describe('security audit dashboard API integration', () => {
  it('PATCH settings generates a configuration audit log', async () => {
    const log = logger();
    await createRouter(log).handle(patchRequest());

    expect(log.info).toHaveBeenCalledWith(expect.objectContaining({
      event: 'configuration_changed',
      userId: 'user-1',
      guildId: 'guild-1',
      settingKey: 'general.prefix',
      oldValue: '!',
      newValue: '?',
    }), 'Security audit event');
  });

  it('401 generates an authentication audit log', async () => {
    const log = logger();
    await createRouter(log, { validSession: false }).handle({ method: 'GET', path: '/api/v1/guilds/guild-1/settings', ip: '127.0.0.1' });

    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'authentication_required', result: 'failure' }), 'Security audit event');
  });

  it('403 generates an authorization audit log', async () => {
    const log = logger();
    await createRouter(log, { authorized: false }).handle({
      method: 'GET',
      path: '/api/v1/guilds/guild-1/settings',
      ip: '127.0.0.1',
      headers: { cookie: 'hoak_session=valid-session' },
    });

    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'authorization_denied', result: 'denied' }), 'Security audit event');
  });

  it('429 generates a rate limit audit log', async () => {
    const log = logger();
    const router = createRouter(log, { rateLimit: true });
    await router.handle(patchRequest('127.0.0.2'));
    await router.handle(patchRequest('127.0.0.2'));

    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'rate_limit_exceeded', result: 'limited' }), 'Security audit event');
  });
});
