import type { ConfigurationAction, GuildIdentity, IAuthorizationProvider } from '../auth/index.js';
import { fail } from './responses.js';
import type { APIHttpMethod, APIMiddleware, APIRequestContext } from './types.js';

export interface AuthorizationMiddlewareDependencies {
  readonly authorizationProvider: IAuthorizationProvider;
}

export function createAuthorizationMiddleware({
  authorizationProvider,
}: AuthorizationMiddlewareDependencies): APIMiddleware {
  return async (request, context, next) => {
    const guildId = context.params['guildId'];
    if (!guildId) {
      return next();
    }

    if (!context.session) {
      return fail('AUTH_REQUIRED', 'Authentication required');
    }

    const userGuilds = readGuilds(context.session.metadata?.['guilds']);
    const requestedGuild = userGuilds.find((guild) => guild.id === guildId);
    if (!requestedGuild) {
      return fail('GUILD_NOT_FOUND', 'Guild not found');
    }

    const user = { ...context.session.user, guilds: userGuilds };
    const action = resolveAuthorizationAction(context, request.method);
    const result = action === 'module_access'
      ? await authorizationProvider.canManageModule(user, guildId, context.params['id'] ?? '*')
      : await authorizationProvider.canModifyConfiguration(user, { guildId, action });

    if (!result.allowed) {
      return fail('FORBIDDEN', 'Forbidden');
    }

    return next();
  };
}

function resolveAuthorizationAction(context: APIRequestContext, method: APIHttpMethod): ConfigurationAction {
  const operationId = context.endpoint?.metadata.operationId ?? '';
  if (operationId.toLowerCase().includes('module')) {
    return 'module_access';
  }

  if (method === 'PATCH' || method === 'POST' || method === 'PUT') {
    return 'write';
  }

  if (method === 'DELETE') {
    return 'delete';
  }

  return 'read';
}

function readGuilds(value: unknown): readonly GuildIdentity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isGuildIdentity);
}

function isGuildIdentity(value: unknown): value is GuildIdentity {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}
