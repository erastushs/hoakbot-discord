import type { ILogger } from '../logger/logger.service.js';
import { fail } from './responses.js';
import type { RateLimiter, RateLimitRule, RateLimitResult } from './rate-limiter.service.js';
import type { APIHttpMethod, APIMiddleware } from './types.js';

export interface RateLimitRouteRule extends RateLimitRule {
  readonly method: APIHttpMethod;
  readonly path: string;
  readonly name: string;
}

export interface RateLimitMiddlewareDependencies {
  readonly limiter: RateLimiter;
  readonly rules: readonly RateLimitRouteRule[];
  readonly logger?: Pick<ILogger, 'warn'>;
}

const DEFAULT_CLIENT_IP = 'local';

export function createRateLimitMiddleware({ limiter, rules, logger }: RateLimitMiddlewareDependencies): APIMiddleware {
  return async (request, _context, next) => {
    const rule = rules.find((candidate) => matchesRule(candidate, request.method, request.path));
    if (!rule) {
      return next();
    }

    const clientIp = request.ip ?? DEFAULT_CLIENT_IP;
    const result = limiter.check(`${rule.name}:${clientIp}`, rule);
    if (!result.allowed) {
      logger?.warn({ method: request.method, path: request.path, rule: rule.name }, 'Dashboard API rate limit exceeded');
      return {
        ...fail('RATE_LIMITED', 'Rate limit exceeded'),
        headers: rateLimitHeaders(result),
      };
    }

    const response = await next();
    return {
      ...response,
      headers: { ...(response.headers ?? {}), ...rateLimitHeaders(result) },
    };
  };
}

export const dashboardRateLimitRules: readonly RateLimitRouteRule[] = [
  { name: 'auth-login', method: 'GET', path: '/api/v1/auth/login', limit: 20, windowMs: 60_000 },
  { name: 'auth-callback', method: 'GET', path: '/api/v1/auth/callback', limit: 20, windowMs: 60_000 },
  { name: 'csrf', method: 'GET', path: '/api/v1/csrf', limit: 120, windowMs: 60_000 },
  { name: 'me', method: 'GET', path: '/api/v1/me', limit: 120, windowMs: 60_000 },
  { name: 'logout', method: 'POST', path: '/api/v1/logout', limit: 60, windowMs: 60_000 },
  { name: 'config-write', method: 'PATCH', path: '/api/v1/guilds/:guildId/settings', limit: 30, windowMs: 60_000 },
  { name: 'module-state-write', method: 'PATCH', path: '/api/v1/guilds/:guildId/modules/:moduleId', limit: 30, windowMs: 60_000 },
  { name: 'guild-post', method: 'POST', path: '/api/v1/guilds/:guildId/*', limit: 30, windowMs: 60_000 },
  { name: 'guild-put', method: 'PUT', path: '/api/v1/guilds/:guildId/*', limit: 30, windowMs: 60_000 },
  { name: 'guild-delete', method: 'DELETE', path: '/api/v1/guilds/:guildId/*', limit: 30, windowMs: 60_000 },
];

export function rateLimitHeaders(result: Pick<RateLimitResult, 'limit' | 'remaining' | 'resetAt' | 'retryAfterSeconds'>): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (result.retryAfterSeconds > 0) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }

  return headers;
}

function matchesRule(rule: RateLimitRouteRule, method: APIHttpMethod, path: string): boolean {
  if (rule.method !== method) {
    return false;
  }

  return matchesPath(rule.path, path);
}

function matchesPath(pattern: string, path: string): boolean {
  const patternSegments = pathSegments(pattern);
  const pathParts = pathSegments(path);

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathPart = pathParts[index];

    if (patternSegment === '*') {
      return pathParts.length > index;
    }

    if (!patternSegment || !pathPart) {
      return false;
    }

    if (patternSegment.startsWith(':')) {
      continue;
    }

    if (patternSegment !== pathPart) {
      return false;
    }
  }

  return patternSegments.length === pathParts.length;
}

function pathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}
