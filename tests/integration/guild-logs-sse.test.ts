import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { handleLogsStream, type APILogsStreamOptions } from '../../src/core/api/server.js';
import type { IAuthorizationProvider, ISessionProvider, SessionRecord } from '../../src/core/auth/index.js';
import { LogsService } from '../../src/core/logs/logs.service.js';

function session(): SessionRecord {
  return { id: 'sid', userId: 'user', user: { id: 'user', provider: 'discord' }, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000), metadata: { guilds: [{ id: 'guild-a' }] } };
}

function options(logs: LogsService, current: SessionRecord | undefined = session(), allowed = true): APILogsStreamOptions {
  const sessions = { getSessionRecord: vi.fn(async () => current) } as unknown as ISessionProvider;
  const authorization = { canModifyConfiguration: vi.fn(async () => allowed ? { allowed: true, source: 'discord:manage-guild', reason: 'ok' } : { allowed: false, code: 'authorization.configuration_denied', reason: 'no' }) } as unknown as IAuthorizationProvider;
  return { path: '/api/v1/guilds/:guildId/logs/stream', logs, sessionProvider: sessions, sessionConfig: { cookieName: 'session', durationMs: 60_000, secureCookies: false }, authorizationProvider: authorization };
}

function transport(cookie = 'session=sid') {
  const request = new EventEmitter() as IncomingMessage;
  Object.assign(request, { method: 'GET', url: '/api/v1/guilds/guild-a/logs/stream', headers: { host: 'localhost', cookie } });
  const response = new EventEmitter() as ServerResponse;
  const writes: string[] = [];
  Object.assign(response, { writeHead: vi.fn(), write: vi.fn((value: string) => { writes.push(value); return true; }), end: vi.fn() });
  return { request, response, writes };
}

describe('guild logs SSE', () => {
  it('does not subscribe before authentication and authorization', async () => {
    for (const [config, cookie] of [[options(new LogsService(), undefined), ''], [options(new LogsService(), session(), false), 'session=sid']] as const) {
      const subscribe = vi.spyOn(config.logs, 'subscribeGuild');
      const { request, response } = transport(cookie);
      await handleLogsStream(request, response, config);
      expect(subscribe).not.toHaveBeenCalled();
    }
  });

  it('streams only its guild and cleans up idempotently on disconnect', async () => {
    const logs = new LogsService();
    const subscribe = vi.spyOn(logs, 'subscribeGuild');
    const connection = transport();
    await handleLogsStream(connection.request, connection.response, options(logs));
    expect(subscribe).toHaveBeenCalledWith('guild-a', expect.any(Function));
    logs.write('info', [{ guildId: 'guild-b', message: 'B' }]);
    logs.write('info', [{ message: 'platform' }]);
    logs.write('info', [{ guildId: 'guild-a', message: 'A' }]);
    expect(connection.writes.join('')).toContain('"message":"A"');
    expect(connection.writes.join('')).not.toContain('"message":"B"');
    expect(connection.writes.join('')).not.toContain('platform');
    connection.request.emit('close');
    connection.response.emit('close');
    const count = connection.writes.length;
    logs.write('info', [{ guildId: 'guild-a', message: 'after' }]);
    expect(connection.writes).toHaveLength(count);
  });

  it('reauthorizes and creates exactly one scoped subscription per reconnect', async () => {
    const logs = new LogsService();
    const config = options(logs);
    const subscribe = vi.spyOn(logs, 'subscribeGuild');
    const authorize = vi.mocked(config.authorizationProvider.canModifyConfiguration);
    const first = transport();
    await handleLogsStream(first.request, first.response, config);
    first.request.emit('close');
    const second = transport();
    await handleLogsStream(second.request, second.response, config);
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledTimes(2);
    logs.write('info', [{ guildId: 'guild-a', message: 'once' }]);
    expect(second.writes.filter((write) => write.startsWith('data: ') && write.includes('"message":"once"'))).toHaveLength(1);
    expect(first.writes.join('')).not.toContain('once');
    second.request.emit('close');
  });
});
