import { describe, expect, it, vi } from 'vitest';

import {
  APIRouter,
  createCsrfMiddleware,
  createRateLimitMiddleware,
  createSecurityAuditMiddleware,
  createSessionAuthMiddleware,
  CsrfService,
  fail,
  ok,
  RateLimiter,
  SecurityAuditService,
} from '../../src/core/api/index.js';
import type { APIEndpoint } from '../../src/core/api/index.js';
import type { ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';

const sessionConfig: SessionConfig = { cookieName: 'hoak_session', durationMs: 60_000, secureCookies: false };
const now = new Date('2026-07-07T00:00:00.000Z');

function logger() {
  return { info: vi.fn(), warn: vi.fn() };
}

function audit(log = logger()): SecurityAuditService {
  return new SecurityAuditService(log, { now: () => now });
}

function endpoint(overrides: Partial<APIEndpoint> = {}): APIEndpoint {
  return {
    module: 'test',
    method: 'GET',
    path: '/audit',
    auth: 'public',
    metadata: { operationId: 'audit', tags: ['test'] },
    handler: async () => ok({ reached: true }),
    ...overrides,
  };
}

function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'session-1',
    userId: 'user-1',
    user: { id: 'user-1', provider: 'discord', username: 'admin' },
    createdAt: now,
    expiresAt: new Date('2026-07-07T00:01:00.000Z'),
    lastSeenAt: now,
    metadata: {},
    ...overrides,
  };
}

function sessionProvider(record?: SessionRecord): ISessionProvider {
  return {
    createSession: vi.fn(),
    getSession: vi.fn(async () => record),
    getSessionRecord: vi.fn(async () => record),
    refreshSession: vi.fn(),
    destroySession: vi.fn(),
  } as ISessionProvider & { getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> };
}

describe('SecurityAuditService', () => {
  it('logs successful login events as structured JSON fields', () => {
    const log = logger();
    audit(log).record('successful_login', {
      userId: 'user-1',
      ip: '127.0.0.1',
      path: '/api/v1/auth/callback',
      method: 'GET',
      result: 'success',
    });

    expect(log.info).toHaveBeenCalledWith(expect.objectContaining({
      timestamp: '2026-07-07T00:00:00.000Z',
      event: 'successful_login',
      userId: 'user-1',
      ip: '127.0.0.1',
      path: '/api/v1/auth/callback',
      method: 'GET',
      result: 'success',
    }), 'Security audit event');
  });

  it('logs failed login, logout, session expiration, and session revocation events', () => {
    const log = logger();
    const service = audit(log);

    service.record('failed_login', { path: '/api/v1/auth/callback', method: 'GET', result: 'failure', reason: 'auth.cancelled' });
    service.record('logout', { userId: 'user-1', path: '/api/v1/logout', method: 'POST', result: 'success' });
    service.record('session_expired', { path: '/api/v1/me', method: 'GET', result: 'failure', reason: 'invalid_or_expired_session' });
    service.record('session_revoked', { userId: 'user-1', path: '/api/v1/me', method: 'GET', result: 'failure', reason: 'revoked_session' });

    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'failed_login', reason: 'auth.cancelled' }), 'Security audit event');
    expect(log.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'logout', userId: 'user-1' }), 'Security audit event');
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'session_expired' }), 'Security audit event');
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'session_revoked' }), 'Security audit event');
  });

  it('masks secret configuration values', () => {
    const log = logger();
    audit(log).recordConfigurationChange({
      guildId: 'guild-1',
      module: 'general',
      key: 'general.apiKey',
      oldValue: 'old-secret',
      newValue: 'new-secret',
      userId: 'user-1',
      metadata: { key: 'general.apiKey', label: 'API Key', description: '', group: '', category: '', type: 'string', defaultValue: '', secret: true },
    }, { method: 'PATCH', path: '/api/v1/guilds/guild-1/settings', ip: '127.0.0.1' });

    expect(log.info).toHaveBeenCalledWith(expect.objectContaining({
      event: 'configuration_changed',
      oldValue: '********',
      newValue: '********',
      settingKey: 'general.apiKey',
    }), 'Security audit event');
  });

  it('logs non-secret configuration updates with old and new values', () => {
    const log = logger();
    audit(log).recordConfigurationChange({
      guildId: 'guild-1',
      module: 'general',
      key: 'general.prefix',
      oldValue: '!',
      newValue: '?',
      userId: 'user-1',
      metadata: { key: 'general.prefix', label: 'Prefix', description: '', group: '', category: '', type: 'string', defaultValue: '!' },
    });

    expect(log.info).toHaveBeenCalledWith(expect.objectContaining({ oldValue: '!', newValue: '?' }), 'Security audit event');
  });
});

describe('security audit middleware', () => {
  it('logs csrf failure, authorization denied, and rate limit exceeded responses', async () => {
    const log = logger();
    const service = audit(log);
    const router = new APIRouter();
    router.use(createSecurityAuditMiddleware({ audit: service }));
    router.register(endpoint({ path: '/csrf', method: 'POST', handler: async () => fail('INVALID_CSRF', 'Invalid CSRF token') }));
    router.register(endpoint({ path: '/forbidden', handler: async () => fail('FORBIDDEN', 'Forbidden') }));
    router.register(endpoint({ path: '/limited', handler: async () => fail('RATE_LIMITED', 'Rate limit exceeded') }));

    await router.handle({ method: 'POST', path: '/api/v1/csrf', ip: '127.0.0.1' });
    await router.handle({ method: 'GET', path: '/api/v1/forbidden', ip: '127.0.0.1' });
    await router.handle({ method: 'GET', path: '/api/v1/limited', ip: '127.0.0.1' });

    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'csrf_validation_failure' }), 'Security audit event');
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'authorization_denied' }), 'Security audit event');
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'rate_limit_exceeded' }), 'Security audit event');
  });

  it('logs authentication required responses from session middleware', async () => {
    const log = logger();
    const router = new APIRouter();
    router.use(createSecurityAuditMiddleware({ audit: audit(log) }));
    router.use(createSessionAuthMiddleware({ sessionProvider: sessionProvider(undefined), sessionConfig }));
    router.register(endpoint({ auth: 'authenticated' }));

    await router.handle({ method: 'GET', path: '/api/v1/audit', ip: '127.0.0.1' });

    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'authentication_required' }), 'Security audit event');
  });

  it('works alongside CSRF and rate limit middleware without logging protected values', async () => {
    const log = logger();
    const service = audit(log);
    const csrf = new CsrfService({ now: () => now });
    const router = new APIRouter();
    router.use(createRateLimitMiddleware({ limiter: new RateLimiter({ now: () => 1_000 }), rules: [{ name: 'limited', method: 'POST', path: '/api/v1/audit', limit: 10, windowMs: 60_000 }] }));
    router.use(createSecurityAuditMiddleware({ audit: service }));
    router.use(createSessionAuthMiddleware({ sessionProvider: sessionProvider(session()), sessionConfig }));
    router.use(createCsrfMiddleware({ csrfService: csrf }));
    router.register(endpoint({ method: 'POST', auth: 'authenticated' }));

    await router.handle({
      method: 'POST',
      path: '/api/v1/audit',
      ip: '127.0.0.1',
      headers: { cookie: 'hoak_session=session-1', 'X-CSRF-Token': 'secret-csrf', authorization: 'Bearer secret' },
      body: { password: 'secret' },
    });

    const entry = log.warn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(JSON.stringify(entry)).not.toContain('secret-csrf');
    expect(JSON.stringify(entry)).not.toContain('Bearer secret');
    expect(JSON.stringify(entry)).not.toContain('password');
  });
});
