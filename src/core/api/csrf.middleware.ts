import { fail } from './responses.js';
import type { CsrfService } from './csrf.service.js';
import type { APIHttpMethod, APIMiddleware } from './types.js';

const SAFE_METHODS = new Set<APIHttpMethod>(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';

export interface CsrfMiddlewareDependencies {
  readonly csrfService: CsrfService;
}

export function createCsrfMiddleware({ csrfService }: CsrfMiddlewareDependencies): APIMiddleware {
  return async (request, context, next) => {
    if (SAFE_METHODS.has(request.method)) {
      return next();
    }

    if (!context.session) {
      return next();
    }

    const token = readHeader(request.headers, CSRF_HEADER);
    if (!csrfService.validate(context.session, token)) {
      return fail('INVALID_CSRF', 'Invalid CSRF token');
    }

    return next();
  };
}

function readHeader(headers: Record<string, string | undefined> | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const requested = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === requested) {
      return value;
    }
  }

  return undefined;
}
