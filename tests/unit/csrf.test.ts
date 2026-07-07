import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createCsrfMiddleware, createSessionAuthMiddleware, CsrfService, ok } from '../../src/core/api/index.js';
import type { APIEndpoint } from '../../src/core/api/index.js';
import type { ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';

const sessionConfig: SessionConfig = { cookieName: 'hoak_session', durationMs: 60_000, secureCookies: false };
const now = new Date('2026-07-07T00:00:00.000Z');

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'session-1',
    userId: 'user-1',
    user: { id: 'user-1', provider: 'discord', username: 'admin' },
    createdAt: now,
    expiresAt: new Date('2026-07-07T00:01:00.000Z'),
    lastSeenAt: now,
    ...overrides,
  };
}

function provider(session: SessionRecord | undefined): ISessionProvider {
  return {
    createSession: vi.fn(),
    getSession: vi.fn(async () => session),
    getSessionRecord: vi.fn(async () => session),
    refreshSession: vi.fn(),
    destroySession: vi.fn(async () => undefined),
  } as ISessionProvider & { getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> };
}

function endpoint(): APIEndpoint {
  return {
    module: 'test',
    method: 'PATCH',
    path: '/guilds/:guildId/settings',
    auth: 'guild_admin',
    metadata: { operationId: 'patchGuildSettings', tags: ['test'] },
    handler: async () => ok({ reached: true }),
  };
}

describe('CsrfService', () => {
  it('generates cryptographically random CSRF tokens with expiration metadata', () => {
    const service = new CsrfService({ now: () => now, randomBytes: () => Buffer.alloc(32, 1), tokenTtlMs: 60_000 });

    const csrf = service.generateToken();

    expect(csrf.token).toBe(Buffer.alloc(32, 1).toString('base64url'));
    expect(csrf.expiresAt).toBe('2026-07-07T00:01:00.000Z');
  });

  it('validates tokens tied to the current authenticated session', () => {
    const service = new CsrfService({ now: () => now, randomBytes: () => Buffer.alloc(32, 2), tokenTtlMs: 60_000 });
    const csrf = service.generateToken();
    const session = record({ metadata: service.attachToMetadata(undefined, csrf) });

    expect(service.validate(session, csrf.token)).toBe(true);
  });

  it('rejects invalid, expired, missing, and expired-session tokens', () => {
    const service = new CsrfService({ now: () => now, randomBytes: () => Buffer.alloc(32, 3), tokenTtlMs: 60_000 });
    const csrf = service.generateToken();
    const session = record({ metadata: service.attachToMetadata(undefined, csrf) });

    expect(service.validate(session, undefined)).toBe(false);
    expect(service.validate(session, 'invalid')).toBe(false);
    expect(service.validate(record({ metadata: service.attachToMetadata(undefined, { ...csrf, expiresAt: '2026-07-06T23:59:59.000Z' }) }), csrf.token)).toBe(false);
    expect(service.validate(record({ expiresAt: new Date('2026-07-06T23:59:59.000Z'), metadata: service.attachToMetadata(undefined, csrf) }), csrf.token)).toBe(false);
  });

  it('invalidates token metadata on logout', () => {
    const service = new CsrfService({ now: () => now });
    const metadata = service.attachToMetadata({ guilds: [] }, { token: 'token', expiresAt: '2026-07-07T00:01:00.000Z' });

    expect(service.invalidateMetadata(metadata)).toEqual({ guilds: [] });
  });
});

describe('CSRF middleware', () => {
  it('rejects missing tokens for state-changing methods', async () => {
    const service = new CsrfService({ now: () => now });
    const api = new APIRouter();
    api.use(createSessionAuthMiddleware({ sessionProvider: provider(record()), sessionConfig }));
    api.use(createCsrfMiddleware({ csrfService: service }));
    api.register(endpoint());

    await expect(api.handle({ method: 'PATCH', path: '/api/v1/guilds/guild-1/settings', headers: { cookie: 'hoak_session=session-1' } })).resolves.toMatchObject({
      success: false,
      status: 403,
      error: { code: 'INVALID_CSRF' },
    });
  });

  it('allows state-changing methods with a valid token', async () => {
    const service = new CsrfService({ now: () => now, randomBytes: () => Buffer.alloc(32, 4), tokenTtlMs: 60_000 });
    const csrf = service.generateToken();
    const api = new APIRouter();
    api.use(createSessionAuthMiddleware({ sessionProvider: provider(record({ metadata: service.attachToMetadata(undefined, csrf) })), sessionConfig }));
    api.use(createCsrfMiddleware({ csrfService: service }));
    api.register(endpoint());

    await expect(
      api.handle({
        method: 'PATCH',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=session-1', 'X-CSRF-Token': csrf.token },
      }),
    ).resolves.toMatchObject({ success: true, data: { reached: true } });
  });
});
