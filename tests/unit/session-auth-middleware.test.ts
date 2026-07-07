import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createSessionAuthMiddleware, ok } from '../../src/core/api/index.js';
import type { ISessionProvider, SessionConfig } from '../../src/core/auth/index.js';
import type { APIEndpoint } from '../../src/core/api/index.js';

const sessionConfig: SessionConfig = {
  cookieName: 'hoak_session',
  durationMs: 60_000,
  secureCookies: false,
};

function sessionProvider(valid = true): ISessionProvider {
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

function endpoint(path: string, auth: APIEndpoint['auth'] = 'authenticated'): APIEndpoint {
  return {
    module: 'test',
    method: 'GET',
    path,
    auth,
    metadata: { operationId: path, tags: ['test'] },
    handler: async () => ok({ reached: true }),
  };
}

describe('session authentication middleware', () => {
  it('allows auth login and callback without a session', async () => {
    const router = new APIRouter();
    router.use(createSessionAuthMiddleware({ sessionProvider: sessionProvider(false), sessionConfig }));
    router.register(endpoint('/auth/login', 'public'));
    router.register(endpoint('/auth/callback', 'public'));

    await expect(router.handle({ method: 'GET', path: '/api/v1/auth/login' })).resolves.toMatchObject({ success: true });
    await expect(router.handle({ method: 'GET', path: '/api/v1/auth/callback' })).resolves.toMatchObject({ success: true });
  });

  it('returns 401 for protected dashboard API endpoints without a valid session', async () => {
    const router = new APIRouter();
    router.use(createSessionAuthMiddleware({ sessionProvider: sessionProvider(false), sessionConfig }));
    router.register(endpoint('/me', 'public'));
    router.register(endpoint('/modules', 'public'));

    await expect(router.handle({ method: 'GET', path: '/api/v1/me' })).resolves.toMatchObject({
      success: false,
      status: 401,
      error: { code: 'AUTH_REQUIRED' },
    });
    await expect(
      router.handle({ method: 'GET', path: '/api/v1/modules', headers: { cookie: 'hoak_session=invalid' } }),
    ).resolves.toMatchObject({ success: false, status: 401, error: { code: 'AUTH_REQUIRED' } });
  });

  it('allows protected endpoints with a valid session cookie', async () => {
    const router = new APIRouter();
    router.use(createSessionAuthMiddleware({ sessionProvider: sessionProvider(true), sessionConfig }));
    router.register(endpoint('/modules', 'public'));

    await expect(
      router.handle({ method: 'GET', path: '/api/v1/modules', headers: { cookie: 'hoak_session=valid-session' } }),
    ).resolves.toMatchObject({ success: true, data: { reached: true } });
  });
});
