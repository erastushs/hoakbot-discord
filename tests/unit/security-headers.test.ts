import { ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import {
  APIRouter,
  applySecurityHeaders,
  createSecurityHeadersMiddleware,
  ok,
  securityHeaders,
} from '../../src/core/api/index.js';
import type { APIEndpoint } from '../../src/core/api/index.js';

function endpoint(method: APIEndpoint['method'] = 'GET'): APIEndpoint {
  return {
    module: 'test',
    method,
    path: '/headers',
    auth: 'public',
    metadata: { operationId: 'getHeaders', tags: ['test'] },
    handler: async () => ok({ reached: true }),
  };
}

describe('security headers middleware', () => {
  it('adds all required headers to GET responses without HSTS in development', async () => {
    const router = new APIRouter();
    router.use(createSecurityHeadersMiddleware({ nodeEnv: 'development' }));
    router.register(endpoint());

    const response = await router.handle({ method: 'GET', path: '/api/v1/headers' });

    expect(response.headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': expect.stringContaining('camera=()'),
      'Content-Security-Policy': expect.stringContaining("default-src 'self'"),
    });
    expect(response.headers?.['Permissions-Policy']).toContain('microphone=()');
    expect(response.headers?.['Permissions-Policy']).toContain('geolocation=()');
    expect(response.headers?.['Permissions-Policy']).toContain('payment=()');
    expect(response.headers?.['Strict-Transport-Security']).toBeUndefined();
  });

  it('adds HSTS in production', () => {
    expect(securityHeaders({ nodeEnv: 'production' })['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });

  it('sets a production-safe CSP with required directives and no wildcard or unsafe-eval', () => {
    const csp = securityHeaders({ nodeEnv: 'production' })['Content-Security-Policy'];

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("img-src 'self' https: data:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self' https://discord.com https://discordapp.com");
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('*');
  });

  it('does not overwrite downstream headers', async () => {
    const router = new APIRouter();
    router.use(createSecurityHeadersMiddleware({ nodeEnv: 'production' }));
    router.register({
      ...endpoint(),
      handler: async () => ({
        ...ok({ reached: true }),
        headers: { 'X-Frame-Options': 'SAMEORIGIN' },
      }),
    });

    const response = await router.handle({ method: 'GET', path: '/api/v1/headers' });

    expect(response.headers?.['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(response.headers?.['X-Content-Type-Options']).toBe('nosniff');
  });

  it('keeps OPTIONS responses valid with security headers', () => {
    const response = new ServerResponse({ method: 'OPTIONS' } as never);
    const writeHead = vi.spyOn(response, 'writeHead');
    const end = vi.spyOn(response, 'end').mockImplementation(() => response);

    applySecurityHeaders(response, { nodeEnv: 'development' });
    response.writeHead(204);
    response.end();

    expect(writeHead).toHaveBeenCalledWith(204);
    expect(response.getHeader('X-Content-Type-Options')).toBe('nosniff');
    expect(response.getHeader('Content-Security-Policy')).toContain("default-src 'self'");
    expect(response.getHeader('Strict-Transport-Security')).toBeUndefined();
    end.mockRestore();
  });
});
