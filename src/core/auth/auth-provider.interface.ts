import type { AuthCallbackRequest, AuthResult, AuthenticatedUser, LoginRequest, LoginStart } from './auth.types.js';

/**
 * Platform authentication provider contract.
 *
 * Phase 1 only defines the contract. Phase 2 implements this for Discord OAuth.
 * Implementations are responsible for starting login, handling provider callbacks,
 * resolving the current authenticated user, and ending the provider-level auth flow.
 */
export interface IAuthProvider {
  /**
   * Begin an authentication flow and return the provider authorization target.
   *
   * Phase 2 supplies the Discord OAuth authorization URL and OAuth state handling.
   */
  beginLogin(request: LoginRequest): Promise<LoginStart>;

  /**
   * Handle an authentication provider callback and return a normalized auth result.
   *
   * Phase 2 performs Discord token exchange, state validation, and user identity resolution.
   */
  handleCallback(request: AuthCallbackRequest): Promise<AuthResult>;

  /**
   * Resolve the authenticated user for the active request/session context.
   *
   * Phase 3 connects this to server-side session management.
   */
  getCurrentUser(): Promise<AuthenticatedUser | undefined>;

  /**
   * End the current authentication flow for the active request/session context.
   *
   * Phase 3 connects this to session destruction and logout behavior.
   */
  logout(): Promise<void>;
}
