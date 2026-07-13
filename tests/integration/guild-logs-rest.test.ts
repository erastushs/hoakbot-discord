import { describe, expect, it, vi } from 'vitest';

import { APIRouter, createAuthorizationMiddleware, createLogsEndpoints, createSessionAuthMiddleware } from '../../src/core/api/index.js';
import type { IAuthorizationProvider, ISessionProvider, SessionConfig, SessionRecord } from '../../src/core/auth/index.js';
import { LogsService } from '../../src/core/logs/logs.service.js';

const sessionConfig: SessionConfig = { cookieName: 'session', durationMs: 60_000, secureCookies: false };

function record(guildIds = ['guild-a']): SessionRecord {
  return { id: 'session-id', userId: 'user', user: { id: 'user', provider: 'discord' }, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000), metadata: { guilds: guildIds.map((id) => ({ id })) } };
}

function provider(session: SessionRecord | undefined = record()): ISessionProvider {
  return { createSession: vi.fn(), getSession: vi.fn(), getSessionRecord: vi.fn(async () => session), refreshSession: vi.fn(), destroySession: vi.fn() } as ISessionProvider & { getSessionRecord(id: string): Promise<SessionRecord | undefined> };
}

function authorization(allowed = true): IAuthorizationProvider {
  return { canAccessDashboard: vi.fn(), canAccessGuild: vi.fn(), canManageModule: vi.fn(), canModifyConfiguration: vi.fn(async () => allowed ? { allowed: true, source: 'discord:manage-guild', reason: 'ok' } : { allowed: false, code: 'authorization.configuration_denied', reason: 'no' }) } as IAuthorizationProvider;
}

function router(logs: LogsService, auth = authorization(), session = provider()): APIRouter {
  const api = new APIRouter();
  api.use(createSessionAuthMiddleware({ sessionProvider: session, sessionConfig }));
  api.use(createAuthorizationMiddleware({ authorizationProvider: auth }));
  for (const endpoint of createLogsEndpoints({ logs })) api.register(endpoint);
  return api;
}

function request(api: APIRouter, path: string) {
  const url = new URL(path, 'http://localhost');
  return api.handle({ method: 'GET', path: url.pathname, query: Object.fromEntries(url.searchParams), headers: { cookie: 'session=session-id' } });
}

describe('guild logs REST', () => {
  it('serves only the canonical authorized guild route and denies legacy unscoped access', async () => {
    const logs = new LogsService();
    logs.write('info', [{ guildId: 'guild-a', message: 'A' }]);
    logs.write('info', [{ guildId: 'guild-b', message: 'B' }]);
    logs.write('info', [{ message: 'platform' }]);
    const api = router(logs);
    await expect(request(api, '/api/v1/guilds/guild-a/logs')).resolves.toMatchObject({ success: true, data: { total: 1, logs: [{ message: 'A' }] } });
    await expect(request(api, '/api/v1/logs')).resolves.toMatchObject({ success: false, status: 404 });
  });

  it('authorizes before querying and prevents cross-guild reads', async () => {
    const logs = new LogsService();
    const query = vi.spyOn(logs, 'queryGuild');
    const auth = authorization(false);
    await expect(request(router(logs, auth), '/api/v1/guilds/guild-a/logs')).resolves.toMatchObject({ success: false, status: 403 });
    expect(query).not.toHaveBeenCalled();
    expect(auth.canModifyConfiguration).toHaveBeenCalledTimes(1);

    await expect(request(router(logs, authorization(), provider(record(['guild-a']))), '/api/v1/guilds/guild-b/logs')).resolves.toMatchObject({ success: false, status: 404 });
  });

  it('returns empty guilds and supports filters and guild-scoped pagination', async () => {
    const logs = new LogsService();
    logs.write('error', [{ guildId: 'guild-a', module: 'Security', message: 'old match' }]);
    logs.write('error', [{ guildId: 'guild-b', module: 'Security', message: 'foreign match' }]);
    logs.write('error', [{ guildId: 'guild-a', module: 'Security', message: 'new match' }]);
    const api = router(logs, authorization(), provider(record(['guild-a', 'empty'])));
    await expect(request(api, '/api/v1/guilds/empty/logs')).resolves.toMatchObject({ success: true, data: { logs: [], total: 0 } });
    const first = await request(api, '/api/v1/guilds/guild-a/logs?level=ERROR&module=Security&search=match&limit=1');
    expect(first).toMatchObject({ success: true, data: { total: 2, logs: [{ message: 'new match' }] } });
    if (!first.success) throw new Error('Expected logs');
    const cursor = (first.data as { nextCursor: string }).nextCursor;
    await expect(request(api, `/api/v1/guilds/guild-a/logs?limit=1&cursor=${encodeURIComponent(cursor)}`)).resolves.toMatchObject({ success: true, data: { logs: [{ message: 'old match' }], total: 1 } });
  });
});
