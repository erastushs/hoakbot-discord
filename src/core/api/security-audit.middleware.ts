import { contextFromRequest, type SecurityAuditEventName, type SecurityAuditService } from './security-audit.service.js';
import type { APIMiddleware, APIResponse } from './types.js';

export interface SecurityAuditMiddlewareDependencies {
  readonly audit: SecurityAuditService;
}

export function createSecurityAuditMiddleware({ audit }: SecurityAuditMiddlewareDependencies): APIMiddleware {
  return async (request, context, next) => {
    const response = await next();
    const event = auditEventForResponse(response);
    if (!event) {
      return response;
    }

    audit.record(event, contextFromRequest(request, {
      userId: context.session?.userId,
      guildId: context.params['guildId'],
      result: event === 'rate_limit_exceeded' ? 'limited' : event === 'authentication_required' || event === 'csrf_validation_failure' ? 'failure' : 'denied',
      reason: response.success ? undefined : response.error.code,
    }));

    return response;
  };
}

function auditEventForResponse(response: APIResponse): SecurityAuditEventName | undefined {
  if (response.success) {
    return undefined;
  }

  if (response.error.code === 'AUTH_REQUIRED') {
    return 'authentication_required';
  }

  if (response.error.code === 'INVALID_CSRF') {
    return 'csrf_validation_failure';
  }

  if (response.error.code === 'RATE_LIMITED') {
    return 'rate_limit_exceeded';
  }

  if (response.error.code === 'GUILD_NOT_FOUND') {
    return 'unknown_guild_access_attempt';
  }

  if (response.error.code === 'FORBIDDEN') {
    return 'authorization_denied';
  }

  return undefined;
}
