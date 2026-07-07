import type {
  AuthenticatedUser,
  AuthenticationState,
  AuthorizationResult,
  AuthorizationState,
  GuildIdentity,
  SessionIdentity,
} from './auth.types.js';

/**
 * Request/dashboard authentication context model.
 *
 * Phase 1 only defines this reusable shape. Phase 3 populates user/session state,
 * Phase 4 populates authorization state, and Phase 5 consumes it in the dashboard.
 */
export interface AuthContext {
  readonly authenticationState: AuthenticationState;
  readonly authorizationState: AuthorizationState;
  readonly currentUser?: AuthenticatedUser;
  readonly currentSession?: SessionIdentity;
  readonly selectedGuild?: GuildIdentity;
  readonly authorization?: AuthorizationResult;
}

export type AnonymousAuthContext = AuthContext & {
  readonly authenticationState: 'anonymous' | 'expired' | 'invalid';
  readonly authorizationState: 'unknown' | 'denied';
  readonly currentUser?: undefined;
  readonly currentSession?: undefined;
};

export type AuthenticatedAuthContext = AuthContext & {
  readonly authenticationState: 'authenticated';
  readonly currentUser: AuthenticatedUser;
  readonly currentSession: SessionIdentity;
};
