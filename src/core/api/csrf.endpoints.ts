import type { ISessionProvider, SessionRecord } from '../auth/index.js';
import { fail, ok } from './responses.js';
import type { CsrfService } from './csrf.service.js';
import type { APIEndpoint } from './types.js';

export interface CsrfEndpointDependencies {
  readonly csrfService: CsrfService;
  readonly sessionProvider?: ISessionProvider & {
    updateSessionMetadata?(sessionId: string, metadata: Record<string, unknown>): Promise<SessionRecord | undefined>;
  };
}

export interface CsrfResponse {
  readonly csrfToken: string;
}

export function createCsrfEndpoints({ csrfService, sessionProvider }: CsrfEndpointDependencies): APIEndpoint[] {
  return [
    {
      module: 'platform',
      method: 'GET',
      path: '/csrf',
      auth: 'authenticated',
      metadata: { operationId: 'getCsrfToken', tags: ['auth'] },
      handler: async (_request, context) => {
        const session = context.session;
        if (!session) {
          return fail('AUTH_REQUIRED', 'Authentication required');
        }

        const currentToken = csrfService.readToken(session);
        if (currentToken) {
          return ok<CsrfResponse>({ csrfToken: currentToken });
        }

        const metadata = csrfService.attachToMetadata(session.metadata);
        const updated = sessionProvider?.updateSessionMetadata
          ? await sessionProvider.updateSessionMetadata(session.id, metadata)
          : { ...session, metadata };
        const token = updated ? csrfService.readToken(updated) : undefined;

        if (!token) {
          return fail('AUTH_REQUIRED', 'Authentication required');
        }

        return ok<CsrfResponse>({ csrfToken: token });
      },
    },
  ];
}
