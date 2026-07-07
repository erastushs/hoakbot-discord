import type { ServerResponse } from 'node:http';

import type { APIMiddleware } from './types.js';

export interface SecurityHeadersOptions {
  readonly nodeEnv?: string;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self' https://discord.com https://discordapp.com",
  "font-src 'self' data:",
].join('; ');

const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
].join(', ');

export function createSecurityHeadersMiddleware(options: SecurityHeadersOptions = {}): APIMiddleware {
  return async (_request, _context, next) => {
    const response = await next();
    return {
      ...response,
      headers: withSecurityHeaders(response.headers, options),
    };
  };
}

export function withSecurityHeaders(
  headers: Record<string, string> | undefined,
  options: SecurityHeadersOptions = {},
): Record<string, string> {
  const next = { ...(headers ?? {}) };
  const requiredHeaders = securityHeaders(options);

  for (const [name, value] of Object.entries(requiredHeaders)) {
    if (!hasHeader(next, name)) {
      next[name] = value;
    }
  }

  return next;
}

export function applySecurityHeaders(response: ServerResponse, options: SecurityHeadersOptions = {}): void {
  for (const [name, value] of Object.entries(securityHeaders(options))) {
    if (!response.hasHeader(name)) {
      response.setHeader(name, value);
    }
  }
}

export function securityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  };

  if ((options.nodeEnv ?? process.env.NODE_ENV) === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const requested = name.toLowerCase();
  return Object.keys(headers).some((header) => header.toLowerCase() === requested);
}
