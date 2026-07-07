import type { AuthenticatedUser, SessionIdentity } from './auth.types.js';

/**
 * Server-side session provider contract.
 *
 * Phase 1 only defines the contract. Phase 3 implements session persistence,
 * expiration, refresh, rotation, and destruction. This contract intentionally
 * does not prescribe cookies, storage tables, or middleware behavior.
 */
export interface ISessionProvider {
  /**
   * Create a new server-side session for an authenticated user.
   */
  createSession(user: AuthenticatedUser): Promise<SessionIdentity>;

  /**
   * Resolve an existing server-side session by opaque session identifier.
   */
  getSession(sessionId: string): Promise<SessionIdentity | undefined>;

  /**
   * Refresh or rotate an existing server-side session.
   */
  refreshSession(sessionId: string): Promise<SessionIdentity | undefined>;

  /**
   * Destroy an existing server-side session.
   */
  destroySession(sessionId: string): Promise<void>;
}
