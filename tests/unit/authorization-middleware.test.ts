import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createAuthorizationMiddleware, createSessionAuthMiddleware, ok } from '../../src/core/api/index.js';
import type { APIEndpoint } from '../../src/core/api/index.js';
import type { IAuthorizationProvider, ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';

const sessionConfig: SessionConfig = { cookieName: 'hoak_session', durationMs: 60_000, secureCookies: false };

function record(guildIds = ['guild-1']): SessionRecord {
  return {
    id: 'valid-session',
    userId: 'user-1',
    user: { id: 'user-1', provider: 'discord', username: 'admin' },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    metadata: { guilds: guildIds.map((id) => ({ id, name: id })) },
  };
}

function sessionProvider(sessionRecord: SessionRecord | undefined = record()): ISessionProvider {
  return {
    createSession: vi.fn(),
    getSession: vi.fn(async () => sessionRecord),
    getSessionRecord: vi.fn(async () => sessionRecord),
    refreshSession: vi.fn(),
    destroySession: vi.fn(),
  } as ISessionProvider & { getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> };
}

function authz(allowed = true): IAuthorizationProvider {
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

function endpoint(method: APIEndpoint['method'], path: string, operationId: string): APIEndpoint {
  return {
    module: 'test',
    method,
    path,
    auth: 'guild_member',
    metadata: { operationId, tags: ['test'] },
    handler: async () => ok({ reached: true }),
  };
}

function router(provider: ISessionProvider, authorization: IAuthorizationProvider): APIRouter {
  const api = new APIRouter();
  api.use(createSessionAuthMiddleware({ sessionProvider: provider, sessionConfig }));
  api.use(createAuthorizationMiddleware({ authorizationProvider: authorization }));
  api.register(endpoint('GET', '/guilds/:guildId/settings', 'getGuildSettings'));
  api.register(endpoint('PATCH', '/guilds/:guildId/settings', 'patchGuildSettings'));
  api.register(endpoint('DELETE', '/guilds/:guildId/settings', 'deleteGuildSettings'));
  api.register(endpoint('GET', '/guilds/:guildId/modules', 'getGuildModules'));
  return api;
}

describe('authorization middleware', () => {
  it('runs after authentication and returns 401 before authorization when anonymous', async () => {
    const authorization = authz(true);
    const response = await router(sessionProvider(undefined), authorization).handle({
      method: 'GET',
      path: '/api/v1/guilds/guild-1/settings',
    });

    expect(response).toMatchObject({ success: false, status: 401, error: { code: 'AUTH_REQUIRED' } });
    expect(authorization.canModifyConfiguration).not.toHaveBeenCalled();
  });

  it('allows owner, administrator, and manage guild decisions returned by AuthorizationProvider', async () => {
    const authorization = authz(true);
    await expect(
      router(sessionProvider(), authorization).handle({
        method: 'GET',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=valid-session' },
      }),
    ).resolves.toMatchObject({ success: true });
    expect(authorization.canModifyConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', guilds: [expect.objectContaining({ id: 'guild-1' })] }),
      { guildId: 'guild-1', action: 'read' },
    );
  });

  it('maps PATCH to write and DELETE to delete', async () => {
    const authorization = authz(true);
    const api = router(sessionProvider(), authorization);

    await api.handle({ method: 'PATCH', path: '/api/v1/guilds/guild-1/settings', headers: { cookie: 'hoak_session=valid-session' } });
    await api.handle({ method: 'DELETE', path: '/api/v1/guilds/guild-1/settings', headers: { cookie: 'hoak_session=valid-session' } });

    expect(authorization.canModifyConfiguration).toHaveBeenCalledWith(expect.any(Object), { guildId: 'guild-1', action: 'write' });
    expect(authorization.canModifyConfiguration).toHaveBeenCalledWith(expect.any(Object), { guildId: 'guild-1', action: 'delete' });
  });

  it('maps module endpoints to module authorization', async () => {
    const authorization = authz(true);
    await router(sessionProvider(), authorization).handle({
      method: 'GET',
      path: '/api/v1/guilds/guild-1/modules',
      headers: { cookie: 'hoak_session=valid-session' },
    });

    expect(authorization.canManageModule).toHaveBeenCalledWith(expect.any(Object), 'guild-1', '*');
  });

  it('returns 403 for authenticated unauthorized members', async () => {
    await expect(
      router(sessionProvider(), authz(false)).handle({
        method: 'GET',
        path: '/api/v1/guilds/guild-1/settings',
        headers: { cookie: 'hoak_session=valid-session' },
      }),
    ).resolves.toMatchObject({ success: false, status: 403, error: { code: 'FORBIDDEN' } });
  });

  it('prevents IDOR attempts for different, invalid, missing, or unknown guilds', async () => {
    const api = router(sessionProvider(record(['guild-1'])), authz(true));

    await expect(
      api.handle({ method: 'GET', path: '/api/v1/guilds/guild-2/settings', headers: { cookie: 'hoak_session=valid-session' } }),
    ).resolves.toMatchObject({ success: false, status: 404, error: { code: 'GUILD_NOT_FOUND' } });
    await expect(
      api.handle({ method: 'GET', path: '/api/v1/guilds/%20/settings', headers: { cookie: 'hoak_session=valid-session' } }),
    ).resolves.toMatchObject({ success: false, status: 404, error: { code: 'GUILD_NOT_FOUND' } });
  });
});
