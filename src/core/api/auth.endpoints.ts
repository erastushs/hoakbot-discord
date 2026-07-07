import { z } from 'zod';

import type { IAuthProvider } from '../auth/index.js';
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
}

export function createAuthEndpoints({ authProvider }: AuthEndpointDependencies): APIEndpoint[] {
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
        return ok(
          await authProvider.handleCallback({
            code: query.code,
            state: query.state,
            error: query.error,
            errorDescription: query.error_description,
          }),
        );
      },
    },
  ];
}
