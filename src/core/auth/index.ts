export { AuthorizationProvider } from './providers/authorization.provider.js';
export { ClientGuildDataSource } from './providers/client-guild.data-source.js';
export { FetchDiscordAPIClient } from './providers/discord-api.client.js';
export { DatabaseSessionProvider } from './providers/database-session.provider.js';
export { DiscordOAuthProvider } from './providers/discord-oauth.provider.js';
export { GuildResolver } from './providers/guild-resolver.js';
export { OAuthStateService } from './providers/oauth-state.service.js';
export { ownerOverrideSource, PermissionResolver } from './providers/permission-resolver.js';
export { createExpiredSessionCookie, createSessionCookie } from './providers/session-cookie.js';
export { SessionCleanupService } from './providers/session.cleanup.js';
export { SessionCleanupScheduler } from './providers/session-cleanup.scheduler.js';
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
export type {
  AuthorizationAction,
  AuthorizationPolicy,
  GuildDataSource,
  GuildResolution,
  PermissionDecision,
} from './providers/authorization.types.js';
export type { SessionCleanupOptions } from './providers/session.cleanup.js';
export type { SessionCleanupSchedulerOptions } from './providers/session-cleanup.scheduler.js';
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
