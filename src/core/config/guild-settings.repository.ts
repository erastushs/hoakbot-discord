import type { Sql } from 'postgres';

import type { IDatabaseAdapter } from '../database/database-adapter.js';

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

  async saveSetting(guildId: string, key: string, value: unknown): Promise<void> {
    const sql = this.getSql();

    await sql`
      INSERT INTO guild_settings (guild_id, key, value, updated_at)
      VALUES (${guildId}, ${key}, ${sql.json(this.toJsonValue(value))}, now())
      ON CONFLICT (guild_id, key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = now()
    `;
  }

  async deleteSetting(guildId: string, key: string): Promise<boolean> {
    const sql = this.getSql();
    const rows = await sql<{ key: string }[]>`
      DELETE FROM guild_settings
      WHERE guild_id = ${guildId}
        AND key = ${key}
      RETURNING key
    `;

    return rows.length > 0;
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

  async bulkSave(guildId: string, entries: Array<{ key: string; value: unknown }>): Promise<void> {
    for (const entry of entries) {
      await this.saveSetting(guildId, entry.key, entry.value);
    }
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
