import type { ISessionProvider, SessionConfig, SessionRecord } from '../auth/index.js';
import { fail } from './responses.js';
import type { APIMiddleware } from './types.js';

const PUBLIC_AUTH_PATHS = new Set(['/auth/login', '/auth/callback', '/system/health']);

export interface SessionAuthMiddlewareDependencies {
  readonly sessionProvider: ISessionProvider;
  readonly sessionConfig: SessionConfig;
}

export function createSessionAuthMiddleware({
  sessionProvider,
  sessionConfig,
}: SessionAuthMiddlewareDependencies): APIMiddleware {
  return async (request, context, next) => {
    if (context.endpoint?.auth === 'public' && PUBLIC_AUTH_PATHS.has(context.endpoint.path)) {
      return next();
    }

    const sessionId = readCookie(request.headers?.['cookie'], sessionConfig.cookieName);
    if (!sessionId) {
      return fail('AUTH_REQUIRED', 'Authentication required');
    }

    const recordProvider = sessionProvider as ISessionProvider & {
      getSessionRecord?(sessionId: string): Promise<SessionRecord | undefined>;
    };
    const record = recordProvider.getSessionRecord ? await recordProvider.getSessionRecord(sessionId) : undefined;
    const session = record ?? (await sessionProvider.getSession(sessionId));
    if (!session) {
      return fail('AUTH_REQUIRED', 'Authentication required');
    }

    if (record) {
      context.session = record;
    }

    return next();
  };
}

export function readCookie(cookieHeader: string | undefined, cookieName: string): string | undefined {
  if (!cookieHeader) {
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
