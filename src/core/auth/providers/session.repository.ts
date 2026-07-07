import type { Sql } from 'postgres';

import type { IDatabaseAdapter } from '../../database/database-adapter.js';
import type { CreateSessionRecordInput, RefreshSessionRecordInput, SessionRecord } from './session.types.js';

type SessionJsonValue =
  | null
  | string
  | number
  | boolean
  | Date
  | readonly SessionJsonValue[]
  | { readonly [key: string]: SessionJsonValue | undefined };

interface SessionRow {
  session_id: string;
  user_id: string;
  username: string | null;
  global_name: string | null;
  avatar: string | null;
  provider: string;
  created_at: Date;
  expires_at: Date;
  last_accessed_at: Date;
  revoked_at: Date | null;
  metadata: Record<string, unknown> | null;
}

export class SessionRepository {
  constructor(private readonly database: IDatabaseAdapter) {}

  async create(input: CreateSessionRecordInput): Promise<SessionRecord> {
    const sql = this.getSql();
    const rows = await sql<SessionRow[]>`
      INSERT INTO auth_sessions (
        session_id,
        user_id,
        username,
        global_name,
        avatar,
        provider,
        created_at,
        expires_at,
        last_accessed_at,
        metadata
      )
      VALUES (
        ${input.sessionId},
        ${input.user.id},
        ${input.user.username ?? null},
        ${input.user.displayName ?? null},
        ${input.user.avatarUrl ?? null},
        ${input.user.provider},
        ${input.createdAt},
        ${input.expiresAt},
        ${input.lastAccessedAt},
        ${sql.json(this.toJsonValue(input.metadata ?? {}))}
      )
      RETURNING session_id, user_id, username, global_name, avatar, provider, created_at, expires_at, last_accessed_at, revoked_at, metadata
    `;

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to create auth session.');
    }

    return this.toRecord(row);
  }

  async find(sessionId: string): Promise<SessionRecord | undefined> {
    const sql = this.getSql();
    const rows = await sql<SessionRow[]>`
      SELECT session_id, user_id, username, global_name, avatar, provider, created_at, expires_at, last_accessed_at, revoked_at, metadata
      FROM auth_sessions
      WHERE session_id = ${sessionId}
      LIMIT 1
    `;

    return rows[0] ? this.toRecord(rows[0]) : undefined;
  }

  async refresh(input: RefreshSessionRecordInput): Promise<SessionRecord | undefined> {
    const sql = this.getSql();
    const rows = await sql<SessionRow[]>`
      UPDATE auth_sessions
      SET expires_at = ${input.expiresAt},
          last_accessed_at = ${input.lastAccessedAt}
      WHERE session_id = ${input.sessionId}
        AND revoked_at IS NULL
      RETURNING session_id, user_id, username, global_name, avatar, provider, created_at, expires_at, last_accessed_at, revoked_at, metadata
    `;

    return rows[0] ? this.toRecord(rows[0]) : undefined;
  }

  async updateMetadata(sessionId: string, metadata: Record<string, unknown>): Promise<SessionRecord | undefined> {
    const sql = this.getSql();
    const rows = await sql<SessionRow[]>`
      UPDATE auth_sessions
      SET metadata = ${sql.json(this.toJsonValue(metadata))},
          last_accessed_at = ${new Date()}
      WHERE session_id = ${sessionId}
        AND revoked_at IS NULL
      RETURNING session_id, user_id, username, global_name, avatar, provider, created_at, expires_at, last_accessed_at, revoked_at, metadata
    `;

    return rows[0] ? this.toRecord(rows[0]) : undefined;
  }

  async revoke(sessionId: string, revokedAt: Date): Promise<void> {
    const sql = this.getSql();
    await sql`
      UPDATE auth_sessions
      SET revoked_at = ${revokedAt}
      WHERE session_id = ${sessionId}
    `;
  }

  async deleteExpired(now: Date): Promise<number> {
    const sql = this.getSql();
    const rows = await sql<{ session_id: string }[]>`
      DELETE FROM auth_sessions
      WHERE expires_at <= ${now}
         OR revoked_at IS NOT NULL
      RETURNING session_id
    `;

    return rows.length;
  }

  private getSql(): Sql {
    return this.database.getClient();
  }

  private toRecord(row: SessionRow): SessionRecord {
    return {
      id: row.session_id,
      userId: row.user_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastSeenAt: row.last_accessed_at,
      revokedAt: row.revoked_at ?? undefined,
      metadata: row.metadata ?? undefined,
      user: {
        id: row.user_id,
        provider: row.provider,
        username: row.username ?? undefined,
        displayName: row.global_name ?? undefined,
        avatarUrl: row.avatar ?? undefined,
      },
    };
  }

  private toJsonValue(value: unknown): SessionJsonValue {
    if (value === undefined) {
      throw new Error('Cannot persist undefined session metadata.');
    }

    return JSON.parse(JSON.stringify(value)) as SessionJsonValue;
  }
}
