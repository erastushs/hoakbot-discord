/**
 * Platform-level authentication and authorization types for the dashboard auth foundation.
 *
 * Phase 1 defines these contracts only. Discord OAuth, session persistence, middleware,
 * cookies, and dashboard flows are implemented by later v3.1 phases.
 */

export type AuthProviderName = 'discord' | string;

export type AuthenticationState = 'anonymous' | 'authenticated' | 'expired' | 'invalid';

export type AuthorizationState = 'unknown' | 'allowed' | 'denied';

export type AuthFailureCode =
  | 'auth.cancelled'
  | 'auth.invalid_callback'
  | 'auth.invalid_state'
  | 'auth.provider_error'
  | 'auth.session_expired'
  | 'auth.unauthenticated';

export type AuthorizationFailureCode =
  | 'authorization.unauthenticated'
  | 'authorization.dashboard_denied'
  | 'authorization.guild_denied'
  | 'authorization.module_denied'
  | 'authorization.configuration_denied'
  | 'authorization.permission_unavailable'
  | 'authorization.resolution_failed';

export type PermissionSource =
  | 'discord:guild-owner'
  | 'discord:administrator'
  | 'discord:manage-guild'
  | 'owner-ids'
  | 'system'
  | 'unknown';

export type ConfigurationAction = 'read' | 'write' | 'delete' | 'module_access';

export interface AuthenticatedUser {
  readonly id: string;
  readonly provider: AuthProviderName;
  readonly username?: string;
  readonly displayName?: string;
  readonly avatarUrl?: string;
}

export interface GuildIdentity {
  readonly id: string;
  readonly name?: string;
  readonly iconUrl?: string;
  readonly owner?: boolean;
  readonly permissionSources?: readonly PermissionSource[];
  readonly rawPermissions?: string;
}

export interface SessionIdentity {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly lastSeenAt?: Date;
}

export interface OAuthState {
  readonly value: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly redirectPath?: string;
}

export interface AuthSuccessResult {
  readonly ok: true;
  readonly user: AuthenticatedUser;
  readonly guilds?: readonly GuildIdentity[];
  readonly session?: SessionIdentity;
}

export interface AuthFailureResult {
  readonly ok: false;
  readonly code: AuthFailureCode;
  readonly message: string;
}

export type AuthResult = AuthSuccessResult | AuthFailureResult;

export interface AuthorizationSuccessResult {
  readonly allowed: true;
  readonly source: PermissionSource;
  readonly reason: string;
  readonly userId?: string;
  readonly guildId?: string;
  readonly action?: ConfigurationAction | 'dashboard' | 'guild' | 'module';
}

export interface AuthorizationFailureResult {
  readonly allowed: false;
  readonly code: AuthorizationFailureCode;
  readonly reason: string;
  readonly source?: PermissionSource;
  readonly userId?: string;
  readonly guildId?: string;
  readonly action?: ConfigurationAction | 'dashboard' | 'guild' | 'module';
  readonly required?: readonly PermissionSource[];
}

export type AuthorizationResult = AuthorizationSuccessResult | AuthorizationFailureResult;

export interface LoginRequest {
  readonly redirectPath?: string;
}

export interface LoginStart {
  readonly authorizationUrl: string;
  readonly state: OAuthState;
}

export interface AuthCallbackRequest {
  readonly code?: string;
  readonly state?: string;
  readonly error?: string;
  readonly errorDescription?: string;
}

export interface ConfigurationPermissionRequest {
  readonly guildId: string;
  readonly moduleId?: string;
  readonly settingKey?: string;
  readonly action: ConfigurationAction;
}
