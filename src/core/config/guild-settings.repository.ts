import type { Sql, TransactionSql } from 'postgres';

import type { IDatabaseAdapter } from '../database/database-adapter.js';
import { ConfigVersionConflictError, type ConfigChangeSource, type ConfigDeleteResult, type ConfigWriteChange, type ConfigWriteResult } from './provider.types.js';

type ConfigJsonValue =
  | null
  | string
  | number
  | boolean
  | Date
  | readonly ConfigJsonValue[]
  | { readonly [key: string]: ConfigJsonValue | undefined };

export interface GuildSettingRecord {
  guildId: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

interface GuildSettingRow {
  guild_id: string;
  key: string;
  value: unknown;
  updated_at: Date;
}

export class GuildSettingsRepository {
  constructor(private readonly database: IDatabaseAdapter) {}

  async loadSetting(guildId: string, key: string): Promise<GuildSettingRecord | undefined> {
    const sql = this.getSql();
    const rows = await sql<GuildSettingRow[]>`
      SELECT guild_id, key, value, updated_at
      FROM guild_settings
      WHERE guild_id = ${guildId}
        AND key = ${key}
      LIMIT 1
    `;

    return rows[0] ? this.toRecord(rows[0]) : undefined;
  }

  saveSetting(
    guildId: string,
    key: string,
    value: unknown,
    options: { expectedVersion?: number; changedBy?: string; source?: ConfigChangeSource } = {},
  ): Promise<ConfigWriteResult> {
    return this.bulkSave(guildId, [{ key, value }], options);
  }

  async deleteSetting(
    guildId: string,
    key: string,
    options: { expectedVersion?: number; changedBy?: string; source?: ConfigChangeSource } = {},
  ): Promise<ConfigDeleteResult> {
    const sql = this.getSql();
    return sql.begin(async (transaction) => {
      const currentVersion = await this.lockVersion(transaction, guildId, options.expectedVersion);
      const rows = await transaction<{ key: string; value: unknown }[]>`
        DELETE FROM guild_settings
        WHERE guild_id = ${guildId} AND key = ${key}
        RETURNING key, value
      `;
      const row = rows[0];
      if (!row) return { deleted: false, version: currentVersion, changes: [] };
      const version = currentVersion + 1;
      await this.insertAudit(transaction, guildId, { key, oldValue: row.value, newValue: undefined }, version, options);
      await this.updateVersion(transaction, guildId, version);
      return { deleted: true, version, changes: [{ key, oldValue: row.value, newValue: undefined }] };
    });
  }

  async bulkLoad(guildId: string, keys: string[]): Promise<Map<string, GuildSettingRecord>> {
    if (keys.length === 0) {
      return new Map();
    }

    const sql = this.getSql();
    const rows = await sql<GuildSettingRow[]>`
      SELECT guild_id, key, value, updated_at
      FROM guild_settings
      WHERE guild_id = ${guildId}
        AND key = ANY(${sql.array(keys)})
    `;

    return new Map(rows.map((row) => [row.key, this.toRecord(row)]));
  }

  async getVersion(guildId: string): Promise<number> {
    const rows = await this.getSql()<{ version: number }[]>`
      SELECT version FROM guild_config_versions WHERE guild_id = ${guildId}
    `;
    return rows[0]?.version ?? 0;
  }

  async bulkSave(
    guildId: string,
    entries: Array<{ key: string; value: unknown }>,
    options: { expectedVersion?: number; changedBy?: string; source?: ConfigChangeSource } = {},
  ): Promise<ConfigWriteResult> {
    const sql = this.getSql();
    return sql.begin(async (transaction) => {
      const currentVersion = await this.lockVersion(transaction, guildId, options.expectedVersion);
      if (entries.length === 0) return { version: currentVersion, changes: [] };
      const keys = entries.map((entry) => entry.key);
      const rows = await transaction<{ key: string; value: unknown }[]>`
        SELECT key, value FROM guild_settings
        WHERE guild_id = ${guildId} AND key = ANY(${transaction.array(keys)})
        FOR UPDATE
      `;
      const oldValues = new Map(rows.map((row) => [row.key, row.value]));
      const version = currentVersion + 1;
      const changes: ConfigWriteChange[] = [];
      for (const entry of entries) {
        await transaction`
          INSERT INTO guild_settings (guild_id, key, value, updated_at)
          VALUES (${guildId}, ${entry.key}, ${transaction.json(this.toJsonValue(entry.value))}, now())
          ON CONFLICT (guild_id, key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `;
        const change = { key: entry.key, oldValue: oldValues.get(entry.key), newValue: entry.value };
        changes.push(change);
        await this.insertAudit(transaction, guildId, change, version, options);
      }
      await this.updateVersion(transaction, guildId, version);
      return { version, changes };
    });
  }

  private async lockVersion(transaction: TransactionSql, guildId: string, expectedVersion?: number): Promise<number> {
    await transaction`
      INSERT INTO guild_config_versions (guild_id, version, updated_at)
      VALUES (${guildId}, 0, now())
      ON CONFLICT (guild_id) DO NOTHING
    `;
    const rows = await transaction<{ version: number }[]>`
      SELECT version FROM guild_config_versions WHERE guild_id = ${guildId} FOR UPDATE
    `;
    const version = rows[0]?.version ?? 0;
    if (expectedVersion !== undefined && expectedVersion !== version) throw new ConfigVersionConflictError(expectedVersion, version);
    return version;
  }

  private async insertAudit(
    transaction: TransactionSql,
    guildId: string,
    change: ConfigWriteChange,
    version: number,
    options: { changedBy?: string; source?: ConfigChangeSource },
  ): Promise<void> {
    await transaction`
      INSERT INTO config_audit_log
        (guild_id, module_id, setting_key, old_value, new_value, changed_by, source, version)
      VALUES
        (${guildId}, ${change.key.split('.')[0] || 'unknown'}, ${change.key}, ${this.sqlJson(transaction, change.oldValue)}, ${this.sqlJson(transaction, change.newValue)}, ${options.changedBy ?? 'unknown'}, ${options.source ?? 'api'}, ${version})
    `;
  }

  private async updateVersion(transaction: TransactionSql, guildId: string, version: number): Promise<void> {
    await transaction`
      UPDATE guild_config_versions SET version = ${version}, updated_at = now()
      WHERE guild_id = ${guildId}
    `;
  }

  private sqlJson(sql: TransactionSql, value: unknown): ReturnType<TransactionSql['json']> | null {
    return value === undefined ? null : sql.json(this.toJsonValue(value));
  }

  private getSql(): Sql {
    return this.database.getClient();
  }

  private toRecord(row: GuildSettingRow): GuildSettingRecord {
    return {
      guildId: row.guild_id,
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at,
    };
  }

  private toJsonValue(value: unknown): ConfigJsonValue {
    if (value === undefined) {
      throw new Error('Cannot persist undefined setting values.');
    }

    return JSON.parse(JSON.stringify(value)) as ConfigJsonValue;
  }
}
