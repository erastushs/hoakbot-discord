import { randomBytes } from 'node:crypto';

import type { ISessionProvider } from '../session-provider.interface.js';
import type { AuthenticatedUser, SessionIdentity } from '../auth.types.js';
import type { SessionRepository } from './session.repository.js';
import type { SessionConfig, SessionRecord } from './session.types.js';

export interface DatabaseSessionProviderOptions {
  readonly now?: () => Date;
  readonly randomBytes?: (size: number) => Buffer;
  readonly maxCreateAttempts?: number;
}

const SESSION_ID_BYTES = 32;
const DEFAULT_MAX_CREATE_ATTEMPTS = 3;

export class DatabaseSessionProvider implements ISessionProvider {
  private readonly now: () => Date;
  private readonly randomBytes: (size: number) => Buffer;
  private readonly maxCreateAttempts: number;

  constructor(
    private readonly repository: SessionRepository,
    private readonly config: SessionConfig,
    options: DatabaseSessionProviderOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.randomBytes = options.randomBytes ?? randomBytes;
    this.maxCreateAttempts = options.maxCreateAttempts ?? DEFAULT_MAX_CREATE_ATTEMPTS;
  }

  async createSession(user: AuthenticatedUser, metadata?: Record<string, unknown>): Promise<SessionIdentity> {
    for (let attempt = 0; attempt < this.maxCreateAttempts; attempt += 1) {
      const now = this.now();
      const sessionId = this.generateSessionId();

      try {
        const record = await this.repository.create({
          sessionId,
          user,
          createdAt: now,
          expiresAt: this.expiresAt(now),
          lastAccessedAt: now,
          metadata,
        });
        return this.toIdentity(record);
      } catch (error) {
        if (!isDuplicateSessionError(error) || attempt === this.maxCreateAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error('Failed to create a unique auth session.');
  }

  async getSession(sessionId: string): Promise<SessionIdentity | undefined> {
    const record = await this.getSessionRecord(sessionId);
    return record ? this.toIdentity(record) : undefined;
  }

  async getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> {
    const record = await this.repository.find(sessionId);
    if (!record || record.revokedAt || this.isExpired(record)) {
      return undefined;
    }

    return record;
  }

  async refreshSession(sessionId: string): Promise<SessionIdentity | undefined> {
    const existing = await this.repository.find(sessionId);
    if (!existing || existing.revokedAt || this.isExpired(existing)) {
      return undefined;
    }

    const now = this.now();
    const refreshed = await this.repository.refresh({
      sessionId,
      lastAccessedAt: now,
      expiresAt: this.expiresAt(now),
    });

    return refreshed && !refreshed.revokedAt ? this.toIdentity(refreshed) : undefined;
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.repository.revoke(sessionId, this.now());
  }

  async updateSessionMetadata(sessionId: string, metadata: Record<string, unknown>): Promise<SessionRecord | undefined> {
    const updated = await this.repository.updateMetadata(sessionId, metadata);
    if (!updated || updated.revokedAt || this.isExpired(updated)) {
      return undefined;
    }

    return updated;
  }

  isExpired(session: Pick<SessionIdentity, 'expiresAt'>): boolean {
    return session.expiresAt.getTime() <= this.now().getTime();
  }

  private generateSessionId(): string {
    return this.randomBytes(SESSION_ID_BYTES).toString('base64url');
  }

  private expiresAt(now: Date): Date {
    return new Date(now.getTime() + this.config.durationMs);
  }

  private toIdentity(record: SessionRecord): SessionIdentity {
    return {
      id: record.id,
      userId: record.userId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastSeenAt: record.lastSeenAt,
    };
  }
}

function isDuplicateSessionError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
