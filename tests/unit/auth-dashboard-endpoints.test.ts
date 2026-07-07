import { describe, expect, it, vi } from 'vitest';

import { createAuthEndpoints } from '../../src/core/api/auth.endpoints.js';
import { APIRouter } from '../../src/core/api/router.js';
import type { IAuthProvider, ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';

const sessionConfig: SessionConfig = {
  cookieName: 'hoak_session',
  durationMs: 60_000,
  secureCookies: true,
};

function authProvider(): IAuthProvider {
  return {
    beginLogin: vi.fn(async () => ({
      authorizationUrl: 'https://discord.com/oauth2/authorize',
      state: { value: 'state', createdAt: new Date(), expiresAt: new Date() },
    })),
    handleCallback: vi.fn(async () => ({ ok: false, code: 'auth.invalid_callback', message: 'unused' })),
    getCurrentUser: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
  };
}

function sessionProvider(record?: SessionRecord) {
  return {
    createSession: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    destroySession: vi.fn(async () => undefined),
    getSessionRecord: vi.fn(async () => record),
  } as unknown as ISessionProvider & { getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> };
}

function router(provider = sessionProvider()) {
  const api = new APIRouter();
  for (const endpoint of createAuthEndpoints({ authProvider: authProvider(), sessionProvider: provider, sessionConfig })) {
    api.register(endpoint);
  }
  return { api, provider };
}

describe('dashboard auth endpoints', () => {
  it('returns anonymous /me state when session cookie is missing', async () => {
    const { api } = router();

    await expect(api.handle({ method: 'GET', path: '/api/v1/me' })).resolves.toMatchObject({
      success: true,
      data: { authenticationState: 'anonymous', guilds: [] },
    });
  });

  it('returns authenticated user and guilds from a valid session', async () => {
    const record: SessionRecord = {
      id: 'session-1',
      userId: 'user-1',
      user: { id: 'user-1', provider: 'discord', username: 'admin', displayName: 'Admin', avatarUrl: 'avatar.png' },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      metadata: { guilds: [{ id: 'guild-1', name: 'Guild One', iconUrl: 'guild.png' }] },
    };
    const { api } = router(sessionProvider(record));

    const response = await api.handle({
      method: 'GET',
      path: '/api/v1/me',
      headers: { cookie: 'hoak_session=session-1' },
    });

    expect(response).toMatchObject({
      success: true,
      data: {
        authenticationState: 'authenticated',
        user: { id: 'user-1', username: 'admin', displayName: 'Admin', avatarUrl: 'avatar.png' },
        guilds: [{ id: 'guild-1', name: 'Guild One', iconUrl: 'guild.png' }],
        selectedGuild: { id: 'guild-1', name: 'Guild One', iconUrl: 'guild.png' },
      },
    });
  });

  it('returns invalid state for invalid or expired sessions', async () => {
    const { api } = router(sessionProvider(undefined));

    await expect(
      api.handle({ method: 'GET', path: '/api/v1/me', headers: { cookie: 'hoak_session=missing' } }),
    ).resolves.toMatchObject({ success: true, data: { authenticationState: 'invalid', guilds: [] } });
  });

  it('destroys sessions and expires the cookie on logout', async () => {
    const { api, provider } = router();

    const response = await api.handle({
      method: 'POST',
      path: '/api/v1/logout',
      headers: { cookie: 'hoak_session=session-1' },
    });

    expect(provider.destroySession).toHaveBeenCalledWith('session-1');
    expect(response).toMatchObject({ success: true, data: { authenticationState: 'anonymous' } });
    expect(response.headers?.['Set-Cookie']).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });
});
