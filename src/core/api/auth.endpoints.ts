import { z } from 'zod';

import type { GuildIdentity, IAuthProvider, IAuthorizationProvider, ISessionProvider, SessionConfig, SessionRecord } from '../auth/index.js';
import { createExpiredSessionCookie, createSessionCookie } from '../auth/index.js';
import { ok } from './responses.js';
import type { APIEndpoint } from './types.js';

const loginQuerySchema = z.object({
  redirectPath: z.string().optional(),
});

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export interface AuthEndpointDependencies {
  readonly authProvider: IAuthProvider;
  readonly sessionProvider?: ISessionProvider & { getSessionRecord?(sessionId: string): Promise<SessionRecord | undefined> };
  readonly sessionConfig?: SessionConfig;
  readonly authorizationProvider?: IAuthorizationProvider;
}

export interface MeResponse {
  readonly authenticationState: 'anonymous' | 'authenticated' | 'expired' | 'invalid';
  readonly user?: {
    readonly id: string;
    readonly username?: string;
    readonly displayName?: string;
    readonly avatarUrl?: string;
  };
  readonly guilds: readonly GuildIdentity[];
  readonly selectedGuild?: GuildIdentity;
}

export interface LogoutResponse {
  readonly authenticationState: 'anonymous';
}

export function createAuthEndpoints({
  authProvider,
  sessionProvider,
  sessionConfig,
  authorizationProvider,
}: AuthEndpointDependencies): APIEndpoint[] {
  return [
    {
      module: 'platform',
      method: 'GET',
      path: '/auth/login',
      auth: 'public',
      query: loginQuerySchema,
      metadata: { operationId: 'beginDiscordOAuthLogin', tags: ['auth'] },
      handler: async (request) => {
        const query = request.query as z.infer<typeof loginQuerySchema>;
        const login = await authProvider.beginLogin({ redirectPath: query.redirectPath });
        return {
          ...ok(login, 302),
          headers: { Location: login.authorizationUrl },
        };
      },
    },
    {
      module: 'platform',
      method: 'GET',
      path: '/auth/callback',
      auth: 'public',
      query: callbackQuerySchema,
      metadata: { operationId: 'handleDiscordOAuthCallback', tags: ['auth'] },
      handler: async (request) => {
        const query = request.query as z.infer<typeof callbackQuerySchema>;
        const result = await authProvider.handleCallback({
          code: query.code,
          state: query.state,
          error: query.error,
          errorDescription: query.error_description,
        });

        if (!result.ok || !sessionProvider || !sessionConfig) {
          return ok(result);
        }

        const session = await sessionProvider.createSession(result.user, { guilds: result.guilds ?? [] });
        return {
          ...ok({ ...result, session }),
          headers: {
            'Set-Cookie': createSessionCookie({
              name: sessionConfig.cookieName,
              value: session.id,
              expiresAt: session.expiresAt,
              secure: sessionConfig.secureCookies,
            }),
          },
        };
      },
    },
    {
      module: 'platform',
      method: 'GET',
      path: '/me',
      auth: 'public',
      metadata: { operationId: 'getCurrentDashboardSession', tags: ['auth'] },
      handler: async (request) =>
        ok<MeResponse>(await resolveMe(request.headers?.['cookie'], sessionProvider, sessionConfig, authorizationProvider)),
    },
    {
      module: 'platform',
      method: 'POST',
      path: '/logout',
      auth: 'public',
      metadata: { operationId: 'logoutDashboardSession', tags: ['auth'] },
      handler: async (request) => {
        const sessionId = readSessionCookie(request.headers?.['cookie'], sessionConfig?.cookieName);
        if (sessionId && sessionProvider) {
          await sessionProvider.destroySession(sessionId);
        }

        return {
          ...ok<LogoutResponse>({ authenticationState: 'anonymous' }),
          headers: sessionConfig
            ? {
                'Set-Cookie': createExpiredSessionCookie(sessionConfig.cookieName, sessionConfig.secureCookies),
              }
            : undefined,
        };
      },
    },
  ];
}

async function resolveMe(
  cookieHeader: string | undefined,
  sessionProvider: AuthEndpointDependencies['sessionProvider'],
  sessionConfig: SessionConfig | undefined,
  authorizationProvider: IAuthorizationProvider | undefined,
): Promise<MeResponse> {
  const sessionId = readSessionCookie(cookieHeader, sessionConfig?.cookieName);
  if (!sessionId || !sessionProvider) {
    return { authenticationState: 'anonymous', guilds: [] };
  }

  const record = sessionProvider.getSessionRecord
    ? await sessionProvider.getSessionRecord(sessionId)
    : await sessionProvider.getSession(sessionId).then((session) => (session ? undefined : undefined));

  if (!record) {
    return { authenticationState: 'invalid', guilds: [] };
  }

  const guilds = await filterAuthorizedGuilds(record, authorizationProvider);
  return {
    authenticationState: 'authenticated',
    user: {
      id: record.user.id,
      username: record.user.username,
      displayName: record.user.displayName,
      avatarUrl: record.user.avatarUrl,
    },
    guilds,
    selectedGuild: guilds[0],
  };
}

async function filterAuthorizedGuilds(
  record: SessionRecord,
  authorizationProvider: IAuthorizationProvider | undefined,
): Promise<readonly GuildIdentity[]> {
  const guilds = readGuilds(record.metadata?.['guilds']);
  if (!authorizationProvider) {
    return guilds;
  }

  const user = { ...record.user, guilds };
  const authorized: GuildIdentity[] = [];
  for (const guild of guilds) {
    const result = await authorizationProvider.canAccessGuild(user, guild.id);
    if (result.allowed) {
      authorized.push(guild);
    }
  }

  return authorized;
}

function readSessionCookie(cookieHeader: string | undefined, cookieName: string | undefined): string | undefined {
  if (!cookieHeader || !cookieName) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return undefined;
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
