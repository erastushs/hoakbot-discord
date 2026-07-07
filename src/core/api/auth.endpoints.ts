import { z } from 'zod';

import type {
  AuthorizationResult,
  GuildIdentity,
  GuildResolver,
  IAuthProvider,
  IAuthorizationProvider,
  ISessionProvider,
  SessionConfig,
  SessionRecord,
} from '../auth/index.js';
import { createExpiredSessionCookie, createSessionCookie } from '../auth/index.js';
import type { CsrfService } from './csrf.service.js';
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
  readonly guildResolver?: GuildResolver;
  readonly dashboardUrl?: string;
  readonly csrfService?: CsrfService;
}

export interface GuildEligibilityDiagnostics {
  readonly guildId: string;
  readonly inOAuthGuildList: boolean;
  readonly botInGuild: boolean;
  readonly authorizationProviderCalled: boolean;
  readonly authorizationResult?: AuthorizationResult;
  readonly returned: boolean;
  readonly reason: string;
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
  readonly guildEligibility?: readonly GuildEligibilityDiagnostics[];
}

export interface LogoutResponse {
  readonly authenticationState: 'anonymous';
}

export function createAuthEndpoints({
  authProvider,
  sessionProvider,
  sessionConfig,
  authorizationProvider,
  guildResolver,
  dashboardUrl,
  csrfService,
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

        const sessionMetadata = csrfService?.attachToMetadata({ guilds: result.guilds ?? [] }) ?? { guilds: result.guilds ?? [] };
        const session = await sessionProvider.createSession(result.user, sessionMetadata);
        return {
          ...ok({ ...result, session }, dashboardUrl ? 303 : 200),
          headers: {
            'Set-Cookie': createSessionCookie({
              name: sessionConfig.cookieName,
              value: session.id,
              expiresAt: session.expiresAt,
              secure: sessionConfig.secureCookies,
            }),
            ...(dashboardUrl ? { Location: dashboardUrl } : {}),
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
        ok<MeResponse>(
          await resolveMe(request.headers?.['cookie'], sessionProvider, sessionConfig, authorizationProvider, guildResolver),
        ),
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
          if (csrfService && sessionProvider.getSessionRecord && 'updateSessionMetadata' in sessionProvider) {
            const record = await sessionProvider.getSessionRecord(sessionId);
            const updateSessionMetadata = sessionProvider.updateSessionMetadata;
            if (record && typeof updateSessionMetadata === 'function') {
              await updateSessionMetadata.call(sessionProvider, sessionId, csrfService.invalidateMetadata(record.metadata));
            }
          }

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
  guildResolver: GuildResolver | undefined,
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

  const eligibility = await evaluateGuildEligibility(record, authorizationProvider, guildResolver);
  const guilds = eligibility.filter((entry) => entry.returned).map((entry) => entry.guild);
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
    guildEligibility: eligibility.map(({ guild: _guild, ...entry }) => entry),
  };
}

async function evaluateGuildEligibility(
  record: SessionRecord,
  authorizationProvider: IAuthorizationProvider | undefined,
  guildResolver: GuildResolver | undefined,
): Promise<Array<GuildEligibilityDiagnostics & { guild: GuildIdentity }>> {
  const guilds = readGuilds(record.metadata?.['guilds']);
  const user = { ...record.user, guilds };
  const eligibility: Array<GuildEligibilityDiagnostics & { guild: GuildIdentity }> = [];
  for (const guild of guilds) {
    const resolution = guildResolver ? await guildResolver.resolveGuild(user, guild.id) : undefined;
    const botInGuild = resolution?.inBotGuild ?? true;
    if (!authorizationProvider) {
      eligibility.push({
        guild,
        guildId: guild.id,
        inOAuthGuildList: true,
        botInGuild,
        authorizationProviderCalled: false,
        returned: true,
        reason: 'returned: authorization provider not configured',
      });
      continue;
    }

    const authorizationResult = await authorizationProvider.canAccessGuild(user, guild.id);
    const returned = Boolean(botInGuild && authorizationResult.allowed);
    eligibility.push({
      guild,
      guildId: guild.id,
      inOAuthGuildList: true,
      botInGuild,
      authorizationProviderCalled: true,
      authorizationResult,
      returned,
      reason: returned ? `returned: ${authorizationResult.reason}` : rejectReason(botInGuild, authorizationResult),
    });
  }

  return eligibility;
}

function rejectReason(botInGuild: boolean, authorizationResult: AuthorizationResult): string {
  if (!botInGuild) {
    return 'rejected: bot is not in guild';
  }

  return authorizationResult.allowed ? 'rejected: unknown reason' : `rejected: ${authorizationResult.reason}`;
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
