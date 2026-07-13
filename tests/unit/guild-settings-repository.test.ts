import type { Sql } from 'postgres';
import { describe, expect, it } from 'vitest';

import { GuildSettingsRepository } from '../../src/core/config/guild-settings.repository.js';
import type { IDatabaseAdapter } from '../../src/core/database/database-adapter.js';

interface SqlCall {
  text: string;
  parameters: readonly unknown[];
}

interface SqlMock {
  (strings: TemplateStringsArray, ...parameters: readonly unknown[]): Promise<unknown[]>;
  json(value: unknown): unknown;
  array(values: string[]): unknown;
  begin<T>(callback: (transaction: Sql) => Promise<T>): Promise<T>;
}

function createSqlMock(responses: unknown[][] = []): { sql: Sql; calls: SqlCall[] } {
  const calls: SqlCall[] = [];
  const sqlMock: SqlMock = (strings, ...parameters) => {
    calls.push({ text: strings.join('?'), parameters });
    return Promise.resolve(responses.shift() ?? []);
  };

  sqlMock.json = (value) => ({ json: value });
  sqlMock.array = (values) => ({ array: values });
  sqlMock.begin = (callback) => callback(sqlMock as unknown as Sql);

  return { sql: sqlMock as unknown as Sql, calls };
}

function createDatabaseAdapter(sql: Sql): IDatabaseAdapter {
  return {
    connect: async () => undefined,
    disconnect: async () => undefined,
    checkConnection: async () => ({ success: true, latencyMs: 1 }),
    getClient: () => sql,
    isConnected: () => true,
  };
}

describe('GuildSettingsRepository', () => {
  it('loads a stored setting', async () => {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const { sql } = createSqlMock([
      [{ guild_id: 'guild-1', key: 'voice.volume', value: 1, updated_at: updatedAt }],
    ]);
    const repository = new GuildSettingsRepository(createDatabaseAdapter(sql));

    await expect(repository.loadSetting('guild-1', 'voice.volume')).resolves.toEqual({
      guildId: 'guild-1',
      key: 'voice.volume',
      value: 1,
      updatedAt,
    });
  });

  it('returns undefined for missing settings', async () => {
    const { sql } = createSqlMock([[]]);
    const repository = new GuildSettingsRepository(createDatabaseAdapter(sql));

    await expect(repository.loadSetting('guild-1', 'voice.volume')).resolves.toBeUndefined();
  });

  it('saves settings with an upsert', async () => {
    const { sql, calls } = createSqlMock([[], [{ version: 0 }], []]);
    const repository = new GuildSettingsRepository(createDatabaseAdapter(sql));

    await repository.saveSetting('guild-1', 'voice.volume', 1);

    expect(calls[3]?.text).toContain('ON CONFLICT (guild_id, key)');
    expect(calls[3]?.parameters[0]).toBe('guild-1');
    expect(calls[3]?.parameters[1]).toBe('voice.volume');
    expect(calls[3]?.parameters[2]).toEqual({ json: 1 });
    expect(calls[4]?.text).toContain('INSERT INTO config_audit_log');
    expect(calls[5]?.text).toContain('UPDATE guild_config_versions');
  });

  it('deletes settings', async () => {
    const { sql } = createSqlMock([[], [{ version: 3 }], [{ key: 'voice.volume', value: 1 }], [], [], [], [{ version: 4 }], []]);
    const repository = new GuildSettingsRepository(createDatabaseAdapter(sql));

    await expect(repository.deleteSetting('guild-1', 'voice.volume')).resolves.toEqual({
      deleted: true,
      version: 4,
      changes: [{ key: 'voice.volume', oldValue: 1, newValue: undefined }],
    });
    await expect(repository.deleteSetting('guild-1', 'missing')).resolves.toEqual({ deleted: false, version: 4, changes: [] });
  });

  it('bulk loads settings by key', async () => {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const { sql, calls } = createSqlMock([
      [{ guild_id: 'guild-1', key: 'voice.volume', value: 1, updated_at: updatedAt }],
    ]);
    const repository = new GuildSettingsRepository(createDatabaseAdapter(sql));

    const values = await repository.bulkLoad('guild-1', ['voice.volume', 'general.prefix']);

    expect(values.get('voice.volume')).toEqual({
      guildId: 'guild-1',
      key: 'voice.volume',
      value: 1,
      updatedAt,
    });
    expect(calls[0]?.parameters[1]).toEqual({ array: ['voice.volume', 'general.prefix'] });
  });

  it('rejects a stale expected version before settings, audit, or version writes', async () => {
    const { sql, calls } = createSqlMock([[], [{ version: 8 }]]);
    const repository = new GuildSettingsRepository(createDatabaseAdapter(sql));

    await expect(repository.bulkSave('guild-1', [{ key: 'voice.volume', value: 1 }], { expectedVersion: 7 })).rejects.toMatchObject({
      expectedVersion: 7,
      currentVersion: 8,
    });

    expect(calls).toHaveLength(2);
    expect(calls.some((call) => call.text.includes('guild_settings'))).toBe(false);
    expect(calls.some((call) => call.text.includes('config_audit_log'))).toBe(false);
    expect(calls.some((call) => call.text.includes('UPDATE guild_config_versions'))).toBe(false);
  });

  it('bulk saves settings lazily by writing only provided entries', async () => {
    const { sql, calls } = createSqlMock([[], [{ version: 6 }], [{ key: 'voice.volume', value: 0.5 }]]);
    const repository = new GuildSettingsRepository(createDatabaseAdapter(sql));

    const result = await repository.bulkSave('guild-1', [
      { key: 'voice.volume', value: 1 },
      { key: 'general.prefix', value: 'hoak' },
    ], { expectedVersion: 6, changedBy: 'user-1' });

    expect(result).toEqual({
      version: 7,
      changes: [
        { key: 'voice.volume', oldValue: 0.5, newValue: 1 },
        { key: 'general.prefix', oldValue: undefined, newValue: 'hoak' },
      ],
    });
    expect(calls).toHaveLength(8);
    expect(calls[3]?.text).toContain('ON CONFLICT (guild_id, key)');
    expect(calls[5]?.parameters[1]).toBe('general.prefix');
    expect(calls.filter((call) => call.text.includes('INSERT INTO config_audit_log'))).toHaveLength(2);
    expect(calls[7]?.text).toContain('UPDATE guild_config_versions');
  });
});
