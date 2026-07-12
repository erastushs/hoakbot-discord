import type { IDatabaseAdapter } from '../database/database-adapter.js';

export interface GuildModuleStateRepository {
  getMany(guildId: string, moduleIds: readonly string[]): Promise<ReadonlyMap<string, boolean>>;
  setMany(guildId: string, states: ReadonlyMap<string, boolean>, expected?: ReadonlyMap<string, boolean>): Promise<boolean>;
}

interface StateRow {
  key: string;
  value: unknown;
}

const keyFor = (moduleId: string) => `module-state.${moduleId}.enabled`;

export class DatabaseGuildModuleStateRepository implements GuildModuleStateRepository {
  constructor(private readonly database: IDatabaseAdapter) {}

  async getMany(guildId: string, moduleIds: readonly string[]): Promise<ReadonlyMap<string, boolean>> {
    if (moduleIds.length === 0) return new Map();
    const sql = this.database.getClient();
    const keys = moduleIds.map(keyFor);
    const rows = await sql<StateRow[]>`
      SELECT key, value FROM guild_settings
      WHERE guild_id = ${guildId} AND key = ANY(${sql.array(keys)})
    `;
    return new Map(rows.map((row) => [row.key.slice('module-state.'.length, -'.enabled'.length), row.value === true]));
  }

  async setMany(guildId: string, states: ReadonlyMap<string, boolean>, expected = new Map()): Promise<boolean> {
    if (states.size === 0) return true;
    const sql = this.database.getClient();
    return sql.begin(async (transaction) => {
      const moduleIds = [...new Set([...states.keys(), ...expected.keys()])];
      const keys = moduleIds.map(keyFor);
      const rows = await transaction<StateRow[]>`
        SELECT key, value FROM guild_settings
        WHERE guild_id = ${guildId} AND key = ANY(${transaction.array(keys)})
        FOR UPDATE
      `;
      const current = new Map(rows.map((row) => [row.key.slice('module-state.'.length, -'.enabled'.length), row.value === true]));
      if ([...expected].some(([id, enabled]) => (current.get(id) ?? true) !== enabled)) return false;
      for (const [moduleId, enabled] of states) {
        const key = keyFor(moduleId);
        await transaction`
          INSERT INTO guild_settings (guild_id, key, value, updated_at)
          VALUES (${guildId}, ${key}, ${transaction.json(enabled)}, now())
          ON CONFLICT (guild_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `;
      }
      return true;
    });
  }
}
