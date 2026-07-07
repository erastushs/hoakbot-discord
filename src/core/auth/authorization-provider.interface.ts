import type { AuthenticatedUser, AuthorizationResult, ConfigurationPermissionRequest } from './auth.types.js';

/**
 * Dashboard authorization provider contract.
 *
 * Phase 1 only defines the contract. Phase 4 implements Discord guild ownership,
 * Administrator, Manage Guild, bot guild intersection, and OWNER_IDS override checks.
 */
export interface IAuthorizationProvider {
  /**
   * Determine whether a user may access the dashboard application shell.
   */
  canAccessDashboard(user: AuthenticatedUser): Promise<AuthorizationResult>;

  /**
   * Determine whether a user may access a guild in the dashboard.
   */
  canAccessGuild(user: AuthenticatedUser, guildId: string): Promise<AuthorizationResult>;

  /**
   * Determine whether a user may manage a module for a guild.
   */
  canManageModule(user: AuthenticatedUser, guildId: string, moduleId: string): Promise<AuthorizationResult>;

  /**
   * Determine whether a user may read or write dashboard-managed configuration.
   */
  canModifyConfiguration(
    user: AuthenticatedUser,
    request: ConfigurationPermissionRequest,
  ): Promise<AuthorizationResult>;
}
