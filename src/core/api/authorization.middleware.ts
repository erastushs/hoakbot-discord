import type { ConfigurationAction, GuildIdentity, IAuthorizationProvider } from '../auth/index.js';
import { fail } from './responses.js';
import type { APIHttpMethod, APIMiddleware, APIRequestContext, APIResponse } from './types.js';

export interface AuthorizationMiddlewareDependencies {
  readonly authorizationProvider: IAuthorizationProvider;
}

export async function authorizeGuildRequest(
  authorizationProvider: IAuthorizationProvider,
  session: APIRequestContext['session'],
  guildId: string,
  action: ConfigurationAction = 'read',
  moduleId = '*',
): Promise<APIResponse | undefined> {
  if (!session) return fail('AUTH_REQUIRED', 'Authentication required');
  const userGuilds = readGuilds(session.metadata?.['guilds']);
  if (!userGuilds.some((guild) => guild.id === guildId)) return fail('GUILD_NOT_FOUND', 'Guild not found');
  const user = { ...session.user, guilds: userGuilds };
  const result = action === 'module_access'
    ? await authorizationProvider.canManageModule(user, guildId, moduleId)
    : await authorizationProvider.canModifyConfiguration(user, { guildId, action });
  return result.allowed ? undefined : fail('FORBIDDEN', 'Forbidden');
}

export function createAuthorizationMiddleware({ authorizationProvider }: AuthorizationMiddlewareDependencies): APIMiddleware {
  return async (request, context, next) => {
    const guildId = context.params['guildId'];
    if (!guildId) return next();
    const action = resolveAuthorizationAction(context, request.method);
    const denied = await authorizeGuildRequest(authorizationProvider, context.session, guildId, action, context.params['id']);
    return denied ?? next();
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
