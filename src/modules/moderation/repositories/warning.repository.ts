import type { Sql } from 'postgres';
import type { IDatabaseAdapter } from '../../../core/database/database-adapter.js';

export interface WarningRow {
  id: string;
  guild_id: string;
  user_id: string;
  moderator_id: string;
  reason: string;
  created_at: Date;
}

export interface CreateWarningInput {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
}

export class WarningRepository {
  private readonly sql: Sql;

  constructor(databaseAdapter: IDatabaseAdapter) {
    this.sql = databaseAdapter.getClient();
  }

  async createWarning(input: CreateWarningInput): Promise<WarningRow> {
    const [row] = await this.sql<WarningRow[]>`
      INSERT INTO warnings (guild_id, user_id, moderator_id, reason)
      VALUES (${input.guildId}, ${input.userId}, ${input.moderatorId}, ${input.reason})
      RETURNING id, guild_id, user_id, moderator_id, reason, created_at
    `;
    return row!;
  }

  async getWarnings(guildId: string, userId: string, limit = 50): Promise<WarningRow[]> {
    return this.sql<WarningRow[]>`
      SELECT id, guild_id, user_id, moderator_id, reason, created_at
      FROM warnings
      WHERE guild_id = ${guildId} AND user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  async countWarnings(guildId: string, userId: string): Promise<number> {
    const [row] = await this.sql<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM warnings
      WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
    return row?.count ?? 0;
  }

  async deleteWarning(id: string): Promise<boolean> {
    const [row] = await this.sql<[{ deleted: boolean }]>`
      WITH deleted AS (
        DELETE FROM warnings
        WHERE id = ${id}
        RETURNING id
      )
      SELECT EXISTS (SELECT 1 FROM deleted) AS deleted
    `;
    return row?.deleted ?? false;
  }

  async clearWarnings(guildId: string, userId: string): Promise<number> {
    const [row] = await this.sql<[{ cleared: number }]>`
      WITH cleared AS (
        DELETE FROM warnings
        WHERE guild_id = ${guildId} AND user_id = ${userId}
        RETURNING id
      )
      SELECT COUNT(*)::int AS cleared FROM cleared
    `;
    return row?.cleared ?? 0;
  }
}
