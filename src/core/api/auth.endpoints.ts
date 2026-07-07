import { z } from 'zod';

import type { IAuthProvider, ISessionProvider, SessionConfig } from '../auth/index.js';
import { createSessionCookie } from '../auth/index.js';
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
  readonly sessionProvider?: ISessionProvider;
  readonly sessionConfig?: SessionConfig;
}

export function createAuthEndpoints({ authProvider, sessionProvider, sessionConfig }: AuthEndpointDependencies): APIEndpoint[] {
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
        return ok(await authProvider.beginLogin({ redirectPath: query.redirectPath }));
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

        const session = await sessionProvider.createSession(result.user);
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
  ];
}
