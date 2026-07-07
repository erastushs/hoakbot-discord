export { FetchDiscordAPIClient } from './providers/discord-api.client.js';
export { DatabaseSessionProvider } from './providers/database-session.provider.js';
export { DiscordOAuthProvider } from './providers/discord-oauth.provider.js';
export { OAuthStateService } from './providers/oauth-state.service.js';
export { createExpiredSessionCookie, createSessionCookie } from './providers/session-cookie.js';
export { SessionCleanupService } from './providers/session.cleanup.js';
export { SessionRepository } from './providers/session.repository.js';
export type { IAuthProvider } from './auth-provider.interface.js';
export type { IAuthorizationProvider } from './authorization-provider.interface.js';
export type { ISessionProvider } from './session-provider.interface.js';
export type { AnonymousAuthContext, AuthContext, AuthenticatedAuthContext } from './auth.context.js';
export type {
  DiscordAPIClient,
  DiscordGuildResponse,
  DiscordOAuthConfig,
  DiscordOAuthIdentity,
  DiscordTokenResponse,
  DiscordUserResponse,
} from './providers/oauth.types.js';
export type { DatabaseSessionProviderOptions } from './providers/database-session.provider.js';
export type { SessionCleanupOptions } from './providers/session.cleanup.js';
export type {
  CreateSessionRecordInput,
  RefreshSessionRecordInput,
  SessionConfig,
  SessionCookieOptions,
  SessionRecord,
} from './providers/session.types.js';
export type {
  AuthCallbackRequest,
  AuthFailureCode,
  AuthFailureResult,
  AuthProviderName,
  AuthResult,
  AuthSuccessResult,
  AuthenticatedUser,
  AuthenticationState,
  AuthorizationFailureCode,
  AuthorizationFailureResult,
  AuthorizationResult,
  AuthorizationState,
  AuthorizationSuccessResult,
  ConfigurationAction,
  ConfigurationPermissionRequest,
  GuildIdentity,
  LoginRequest,
  LoginStart,
  OAuthState,
  PermissionSource,
  SessionIdentity,
} from './auth.types.js';
