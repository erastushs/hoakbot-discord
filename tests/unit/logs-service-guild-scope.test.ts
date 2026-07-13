import { describe, expect, it, vi } from 'vitest';

import { LogsService } from '../../src/core/logs/logs.service.js';

function write(logs: LogsService, guildId: string | undefined, message: string, level: 'info' | 'error' = 'info', module = 'API') {
  logs.write(level, [{ guildId, module, message }]);
}

describe('LogsService guild scope', () => {
  it('excludes other guild and unattributed entries and handles an empty guild', () => {
    const logs = new LogsService();
    write(logs, 'guild-a', 'A');
    write(logs, 'guild-b', 'B');
    write(logs, undefined, 'platform');

    expect(logs.queryGuild('guild-a')).toMatchObject({ total: 1, logs: [{ message: 'A', guildId: 'guild-a' }] });
    expect(logs.queryGuild('empty')).toEqual({ logs: [], nextCursor: undefined, total: 0 });
  });

  it('applies guild scope before filters, pagination, cursor, and total', () => {
    const logs = new LogsService();
    write(logs, 'guild-a', 'old matching', 'error', 'Security');
    write(logs, 'guild-b', 'foreign matching', 'error', 'Security');
    write(logs, 'guild-a', 'new matching', 'error', 'Security');
    write(logs, 'guild-a', 'ignored level', 'info', 'Security');

    const first = logs.queryGuild('guild-a', { levels: ['ERROR'], modules: ['Security'], search: 'matching', limit: 1 });
    expect(first.total).toBe(2);
    expect(first.logs.map((entry) => entry.message)).toEqual(['new matching']);
    expect(first.nextCursor).toBe(first.logs[0]?.id);
    const second = logs.queryGuild('guild-a', { levels: ['ERROR'], modules: ['Security'], search: 'matching', limit: 1, cursor: first.nextCursor });
    expect(second.total).toBe(1);
    expect(second.logs.map((entry) => entry.message)).toEqual(['old matching']);
  });

  it('subscribes to exactly one guild and unsubscribes without leaking', () => {
    const logs = new LogsService();
    const listener = vi.fn();
    const unsubscribe = logs.subscribeGuild('guild-a', listener);
    write(logs, 'guild-b', 'B');
    write(logs, undefined, 'platform');
    write(logs, 'guild-a', 'A');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ guildId: 'guild-a', message: 'A' });
    unsubscribe();
    unsubscribe();
    write(logs, 'guild-a', 'after');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
