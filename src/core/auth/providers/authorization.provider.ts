import type { IAuthorizationProvider } from '../authorization-provider.interface.js';
import type { AuthenticatedUser, AuthorizationResult, ConfigurationPermissionRequest, PermissionSource } from '../auth.types.js';
import type { AuthorizationAction, AuthorizationPolicy, GuildResolution } from './authorization.types.js';
import { REQUIRED_ADMIN_SOURCES } from './authorization.types.js';
import type { GuildResolver } from './guild-resolver.js';
import { ownerOverrideSource, PermissionResolver } from './permission-resolver.js';

export class AuthorizationProvider implements IAuthorizationProvider {
  constructor(
    private readonly policy: AuthorizationPolicy,
    private readonly guildResolver: GuildResolver,
    private readonly permissionResolver = new PermissionResolver(),
  ) {}

  async canAccessDashboard(user: AuthenticatedUser): Promise<AuthorizationResult> {
    const ownerOverride = ownerOverrideSource(user.id, this.policy.ownerIds);
    if (ownerOverride) {
      return this.allow(user, undefined, 'dashboard', ownerOverride, 'owner-ids-dashboard-access');
    }

    try {
      const guilds = await this.guildResolver.resolveAccessibleGuilds(user);
      const allowedGuild = guilds.find((guild) => this.hasGuildAuthority(guild));
      if (allowedGuild) {
        const decision = this.permissionResolver.resolveGuildPermission(allowedGuild.userGuild);
        return this.allow(user, allowedGuild.guildId, 'dashboard', decision.source, decision.reason);
      }

      return this.deny(user, undefined, 'dashboard', 'authorization.dashboard_denied', 'dashboard-access-denied');
    } catch {
      return this.deny(user, undefined, 'dashboard', 'authorization.resolution_failed', 'discord-api-failure');
    }
  }

  async canAccessGuild(user: AuthenticatedUser, guildId: string): Promise<AuthorizationResult> {
    return this.evaluateGuild(user, guildId, 'guild', 'authorization.guild_denied');
  }

  async canManageModule(user: AuthenticatedUser, guildId: string, _moduleId: string): Promise<AuthorizationResult> {
    return this.evaluateGuild(user, guildId, 'module', 'authorization.module_denied');
  }

  async canModifyConfiguration(
    user: AuthenticatedUser,
    request: ConfigurationPermissionRequest,
  ): Promise<AuthorizationResult> {
    return this.evaluateGuild(user, request.guildId, request.action, 'authorization.configuration_denied');
  }

  private async evaluateGuild(
    user: AuthenticatedUser,
    guildId: string,
    action: AuthorizationAction,
    deniedCode: 'authorization.guild_denied' | 'authorization.module_denied' | 'authorization.configuration_denied',
  ): Promise<AuthorizationResult> {
    const ownerOverride = ownerOverrideSource(user.id, this.policy.ownerIds);
    if (ownerOverride) {
      return this.allow(user, guildId, action, ownerOverride, 'owner-ids-full-access');
    }

    if (!guildId) {
      return this.deny(user, guildId, action, deniedCode, 'missing-guild', REQUIRED_ADMIN_SOURCES);
    }

    try {
      const resolution = await this.guildResolver.resolveGuild(user, guildId);
      if (!resolution.inBotGuild || !resolution.inUserGuild) {
        return this.deny(user, guildId, action, deniedCode, 'guild-intersection-denied', REQUIRED_ADMIN_SOURCES);
      }

      const decision = this.permissionResolver.resolveGuildPermission(resolution.userGuild);
      if (!decision.allowed) {
        return this.deny(user, guildId, action, deniedCode, decision.reason, REQUIRED_ADMIN_SOURCES, decision.source);
      }

      return this.allow(user, guildId, action, decision.source, decision.reason);
    } catch {
      return this.deny(user, guildId, action, 'authorization.resolution_failed', 'discord-api-failure', REQUIRED_ADMIN_SOURCES);
    }
  }

  private hasGuildAuthority(resolution: GuildResolution): boolean {
    if (!resolution.inBotGuild || !resolution.inUserGuild) {
      return false;
    }

    return this.permissionResolver.resolveGuildPermission(resolution.userGuild).allowed;
  }

  private allow(
    user: AuthenticatedUser,
    guildId: string | undefined,
    action: AuthorizationAction,
    source: PermissionSource,
    reason: string,
  ): AuthorizationResult {
    return {
      allowed: true,
      source,
      reason,
      userId: user.id,
      guildId,
      action,
    };
  }

  private deny(
    user: AuthenticatedUser,
    guildId: string | undefined,
    action: AuthorizationAction,
    code: 'authorization.dashboard_denied' | 'authorization.guild_denied' | 'authorization.module_denied' | 'authorization.configuration_denied' | 'authorization.resolution_failed',
    reason: string,
    required = REQUIRED_ADMIN_SOURCES,
    source: PermissionSource = 'unknown',
  ): AuthorizationResult {
    return {
      allowed: false,
      code,
      reason,
      source,
      userId: user.id,
      guildId,
      action,
      required,
    };
  }
}
