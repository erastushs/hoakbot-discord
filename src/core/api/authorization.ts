import { APIError } from './errors.js';
import type { GuildMembership, UserContext } from './auth.types.js';
import type { APIAuthLevel, APIMiddleware } from './types.js';
import type { IPermissionService } from '../permissions/types.js';

export interface APIAuthorizationRequest {
  auth: APIAuthLevel;
  user?: UserContext;
  guildId?: string;
  permission?: string;
}

export interface GuildOwnershipChecker {
  isGuildOwner(user: UserContext, guildId: string): boolean;
}

export class UserGuildOwnershipChecker implements GuildOwnershipChecker {
  isGuildOwner(user: UserContext, guildId: string): boolean {
    return user.guilds.some((guild) => guild.guildId === guildId && guild.owner);
  }
}

export class APIAuthorizationService {
  constructor(
    private readonly permissionService?: IPermissionService,
    private readonly ownershipChecker: GuildOwnershipChecker = new UserGuildOwnershipChecker(),
  ) {}

  authorize(request: APIAuthorizationRequest): void {
    if (request.auth === 'public') {
      return;
    }

    if (!request.user) {
      throw new APIError('AUTH_REQUIRED', 'Authentication required');
    }

    if (request.user.session.expiresAt <= Date.now()) {
      throw new APIError('AUTH_EXPIRED', 'Session expired');
    }

    if (request.auth === 'authenticated') {
      return;
    }

    if (request.auth === 'bot_owner') {
      this.requireBotOwner(request.user);
      return;
    }

    const guild = this.requireGuild(request.user, request.guildId);

    if (request.auth === 'guild_member') {
      return;
    }

    if (request.auth === 'guild_admin') {
      this.requireGuildAdmin(request.user, guild, request.permission);
    }
  }

  middleware(auth: APIAuthLevel, getUser: () => UserContext | undefined, getPermission?: () => string | undefined): APIMiddleware {
    return async (request, context, next) => {
      this.authorize({
        auth,
        user: getUser(),
        guildId: context.params.guildId ?? context.params.id,
        permission: getPermission?.(),
      });

      return next();
    };
  }

  private requireBotOwner(user: UserContext): void {
    if (!user.isBotOwner) {
      throw new APIError('FORBIDDEN', 'Bot owner access required');
    }
  }

  private requireGuild(user: UserContext, guildId?: string): GuildMembership {
    if (!guildId) {
      throw new APIError('FORBIDDEN', 'Guild context required');
    }

    const guild = user.guilds.find((entry) => entry.guildId === guildId);
    if (!guild) {
      throw new APIError('FORBIDDEN', 'Guild membership required');
    }

    return guild;
  }

  private requireGuildAdmin(user: UserContext, guild: GuildMembership, permission?: string): void {
    if (this.ownershipChecker.isGuildOwner(user, guild.guildId)) {
      return;
    }

    if (guild.permissions.includes('ADMINISTRATOR')) {
      return;
    }

    if (permission && this.permissionService) {
      const result = this.permissionService.check({
        guildId: guild.guildId,
        userId: user.identity.id,
        roleIds: guild.roles,
        action: permission,
      });

      if (result.allowed) {
        return;
      }
    }

    throw new APIError('FORBIDDEN', 'Guild administrator access required');
  }
}
