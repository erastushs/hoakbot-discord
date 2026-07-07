import type { AuthenticatedUser, SessionIdentity } from '../auth.types.js';

export interface SessionConfig {
  readonly durationMs: number;
  readonly cookieName: string;
  readonly secureCookies: boolean;
}

export interface SessionRecord extends SessionIdentity {
  readonly user: AuthenticatedUser;
  readonly revokedAt?: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateSessionRecordInput {
  readonly sessionId: string;
  readonly user: AuthenticatedUser;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly lastAccessedAt: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface RefreshSessionRecordInput {
  readonly sessionId: string;
  readonly expiresAt: Date;
  readonly lastAccessedAt: Date;
}

export interface SessionCookieOptions {
  readonly name: string;
  readonly value: string;
  readonly expiresAt: Date;
  readonly secure: boolean;
  readonly sameSite?: 'Lax' | 'Strict' | 'None';
  readonly path?: string;
}
