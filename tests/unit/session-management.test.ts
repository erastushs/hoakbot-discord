import type { Sql } from 'postgres';
import { describe, expect, it, vi } from 'vitest';

import { createAuthEndpoints } from '../../src/core/api/auth.endpoints.js';
import { APIRouter } from '../../src/core/api/router.js';
import {
  createExpiredSessionCookie,
  createSessionCookie,
  DatabaseSessionProvider,
  DiscordOAuthProvider,
  OAuthStateService,
  SessionCleanupService,
  SessionRepository,
} from '../../src/core/auth/index.js';
import type { AuthenticatedUser, DiscordAPIClient, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';
import type { IDatabaseAdapter } from '../../src/core/database/database-adapter.js';

const user: AuthenticatedUser = {
  id: 'user-1',
  provider: 'discord',
  username: 'admin',
  displayName: 'Admin',
  avatarUrl: 'https://cdn.discordapp.com/avatars/user-1/avatar.png',
};

const sessionConfig: SessionConfig = {
  durationMs: 60_000,
  cookieName: 'hoak_session',
  secureCookies: true,
};

function sessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const createdAt = new Date('2026-07-07T00:00:00.000Z');
  return {
    id: 'session-1',
    userId: user.id,
    user,
    createdAt,
    expiresAt: new Date('2026-07-07T00:01:00.000Z'),
    lastSeenAt: createdAt,
    ...overrides,
  };
}

function createRepository(records = new Map<string, SessionRecord>()) {
  return {
    create: vi.fn(async (input) => {
      if (records.has(input.sessionId)) {
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }
      const record = sessionRecord({
        id: input.sessionId,
        userId: input.user.id,
        user: input.user,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
        lastSeenAt: input.lastAccessedAt,
      });
      records.set(record.id, record);
      return record;
    }),
    find: vi.fn(async (sessionId: string) => records.get(sessionId)),
    refresh: vi.fn(async (input) => {
      const record = records.get(input.sessionId);
      if (!record || record.revokedAt) {
        return undefined;
      }
      const refreshed = sessionRecord({ ...record, expiresAt: input.expiresAt, lastSeenAt: input.lastAccessedAt });
      records.set(input.sessionId, refreshed);
      return refreshed;
    }),
    revoke: vi.fn(async (sessionId: string, revokedAt: Date) => {
      const record = records.get(sessionId);
      if (record) {
        records.set(sessionId, sessionRecord({ ...record, revokedAt }));
      }
    }),
    deleteExpired: vi.fn(async () => 2),
  } as unknown as SessionRepository;
}

describe('DatabaseSessionProvider', () => {
  it('creates unpredictable server-side sessions', async () => {
    const repository = createRepository();
    const provider = new DatabaseSessionProvider(repository, sessionConfig, {
      now: () => new Date('2026-07-07T00:00:00.000Z'),
    });

    const session = await provider.createSession(user);

    expect(session.id).toHaveLength(43);
    expect(session.id).not.toBe('session-1');
    expect(session.userId).toBe('user-1');
    expect(session.expiresAt).toEqual(new Date('2026-07-07T00:01:00.000Z'));
  });

  it('retrieves active sessions and rejects expired or revoked sessions', async () => {
    const records = new Map<string, SessionRecord>([
      ['active', sessionRecord({ id: 'active' })],
      ['expired', sessionRecord({ id: 'expired', expiresAt: new Date('2026-07-06T23:59:59.000Z') })],
      ['revoked', sessionRecord({ id: 'revoked', revokedAt: new Date('2026-07-07T00:00:01.000Z') })],
    ]);
    const provider = new DatabaseSessionProvider(createRepository(records), sessionConfig, {
      now: () => new Date('2026-07-07T00:00:00.000Z'),
    });

    await expect(provider.getSession('active')).resolves.toMatchObject({ id: 'active', userId: 'user-1' });
    await expect(provider.getSession('expired')).resolves.toBeUndefined();
    await expect(provider.getSession('revoked')).resolves.toBeUndefined();
  });

  it('refreshes sessions by updating last access time and expiration', async () => {
    const records = new Map<string, SessionRecord>([['session-1', sessionRecord()]]);
    const repository = createRepository(records);
    const provider = new DatabaseSessionProvider(repository, sessionConfig, {
      now: () => new Date('2026-07-07T00:00:30.000Z'),
    });

    const refreshed = await provider.refreshSession('session-1');

    expect(refreshed?.lastSeenAt).toEqual(new Date('2026-07-07T00:00:30.000Z'));
    expect(refreshed?.expiresAt).toEqual(new Date('2026-07-07T00:01:30.000Z'));
  });

  it('revokes sessions so they cannot be reused', async () => {
    const records = new Map<string, SessionRecord>([['session-1', sessionRecord()]]);
    const provider = new DatabaseSessionProvider(createRepository(records), sessionConfig, {
      now: () => new Date('2026-07-07T00:00:30.000Z'),
    });

    await provider.destroySession('session-1');

    await expect(provider.getSession('session-1')).resolves.toBeUndefined();
  });

  it('retries duplicate generated session IDs', async () => {
    const duplicateId = Buffer.from('duplicate').toString('base64url');
    const records = new Map<string, SessionRecord>([[duplicateId, sessionRecord({ id: duplicateId })]]);
    const repository = createRepository(records);
    const ids = [Buffer.from('duplicate'), Buffer.from('unique')];
    const provider = new DatabaseSessionProvider(repository, sessionConfig, {
      randomBytes: () => ids.shift() ?? Buffer.from('fallback'),
      now: () => new Date('2026-07-07T00:00:00.000Z'),
    });

    const session = await provider.createSession(user);

    expect(session.id).toBe(Buffer.from('unique').toString('base64url'));
  });
});

describe('session cookies and cleanup', () => {
  it('creates HttpOnly Secure SameSite=Lax cookies', () => {
    expect(
      createSessionCookie({
        name: 'hoak_session',
        value: 'opaque-session-id',
        expiresAt: new Date('2026-07-07T00:01:00.000Z'),
        secure: true,
      }),
    ).toBe('hoak_session=opaque-session-id; HttpOnly; SameSite=Lax; Path=/; Expires=Tue, 07 Jul 2026 00:01:00 GMT; Secure');
  });

  it('creates expired cookies for clearing sessions', () => {
    expect(createExpiredSessionCookie('hoak_session', false)).toBe(
      'hoak_session=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );
  });

  it('cleans expired and revoked sessions through repository helper', async () => {
    const repository = createRepository();
    const cleanup = new SessionCleanupService(repository, { now: () => new Date('2026-07-07T00:00:00.000Z') });

    await expect(cleanup.cleanupExpiredSessions()).resolves.toBe(2);
  });
});

describe('OAuth callback session creation', () => {
  it('creates a session and Set-Cookie header after successful OAuth callback', async () => {
    const discord: DiscordAPIClient = {
      exchangeCode: vi.fn(async () => ({ access_token: 'access-token', token_type: 'Bearer' })),
      getCurrentUser: vi.fn(async () => ({ id: 'user-1', username: 'admin', global_name: 'Admin', avatar: null })),
      getCurrentUserGuilds: vi.fn(async () => []),
    };
    const stateService = new OAuthStateService({ now: () => new Date('2026-07-07T00:00:00.000Z') });
    const authProvider = new DiscordOAuthProvider(
      {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://dashboard.example.test/api/v1/auth/callback',
      },
      stateService,
      discord,
    );
    const sessionProvider = new DatabaseSessionProvider(createRepository(), sessionConfig, {
      randomBytes: () => Buffer.from('session-id'),
      now: () => new Date('2026-07-07T00:00:00.000Z'),
    });
    const router = new APIRouter();
    for (const endpoint of createAuthEndpoints({ authProvider, sessionProvider, sessionConfig })) {
      router.register(endpoint);
    }

    const login = await authProvider.beginLogin({});
    const response = await router.handle({
      method: 'GET',
      path: '/api/v1/auth/callback',
      query: { code: 'auth-code', state: login.state.value },
    });

    expect(response.success).toBe(true);
    expect(response.headers?.['Set-Cookie']).toContain('HttpOnly');
    expect(response.headers?.['Set-Cookie']).toContain('Secure');
    if (response.success) {
      expect(response.data).toMatchObject({ ok: true, session: { userId: 'user-1' } });
    }
  });
});

describe('SessionRepository', () => {
  it('persists session rows without storing Discord access tokens', async () => {
    const calls: Array<{ text: string; parameters: readonly unknown[] }> = [];
    const rowDate = new Date('2026-07-07T00:00:00.000Z');
    const sqlMock = ((strings: TemplateStringsArray, ...parameters: readonly unknown[]) => {
      calls.push({ text: strings.join('?'), parameters });
      return Promise.resolve([
        {
          session_id: 'session-1',
          user_id: 'user-1',
          username: 'admin',
          global_name: 'Admin',
          avatar: null,
          provider: 'discord',
          created_at: rowDate,
          expires_at: new Date('2026-07-07T00:01:00.000Z'),
          last_accessed_at: rowDate,
          revoked_at: null,
          metadata: {},
        },
      ]);
    }) as unknown as Sql & { json: (value: unknown) => unknown };
    sqlMock.json = (value: unknown) => ({ json: value });
    const adapter: IDatabaseAdapter = {
      connect: async () => undefined,
      disconnect: async () => undefined,
      checkConnection: async () => ({ success: true, latencyMs: 1 }),
      getClient: () => sqlMock,
      isConnected: () => true,
    };
    const repository = new SessionRepository(adapter);

    await repository.create({
      sessionId: 'session-1',
      user,
      createdAt: rowDate,
      expiresAt: new Date('2026-07-07T00:01:00.000Z'),
      lastAccessedAt: rowDate,
    });

    expect(calls[0]?.text).toContain('INSERT INTO auth_sessions');
    expect(calls[0]?.text).not.toContain('access_token');
    expect(calls[0]?.parameters).not.toContain('access-token');
  });
});
