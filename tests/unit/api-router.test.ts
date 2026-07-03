import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { APIRouter } from '../../src/core/api/router.js';
import { ok } from '../../src/core/api/responses.js';
import type { APIEndpoint, APIMiddleware } from '../../src/core/api/types.js';

function endpoint(overrides: Partial<APIEndpoint> = {}): APIEndpoint {
  return {
    module: 'test',
    method: 'GET',
    path: '/guilds/:guildId/settings',
    auth: 'public',
    metadata: { operationId: 'getGuildSettings', tags: ['settings'] },
    handler: async (request, context) =>
      ok({
        guildId: context.params.guildId,
        params: request.params,
      }),
    ...overrides,
  };
}

describe('APIRouter', () => {
  it('registers versioned routes and resolves path params', async () => {
    const router = new APIRouter();
    router.register(endpoint());

    const response = await router.handle({ method: 'GET', path: '/api/v1/guilds/guild-1/settings' });

    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data).toEqual({
        guildId: 'guild-1',
        params: { guildId: 'guild-1' },
      });
    }
    expect(router.getRoutes()[0]?.fullPath).toBe('/api/v1/guilds/:guildId/settings');
  });

  it('runs global and route middleware in order', async () => {
    const router = new APIRouter();
    const calls: string[] = [];
    const globalMiddleware: APIMiddleware = async (_request, _context, next) => {
      calls.push('global:before');
      const response = await next();
      calls.push('global:after');
      return response;
    };
    const routeMiddleware: APIMiddleware = async (_request, _context, next) => {
      calls.push('route:before');
      const response = await next();
      calls.push('route:after');
      return response;
    };

    router.use(globalMiddleware);
    router.register(
      endpoint({
        middleware: [routeMiddleware],
        handler: async () => {
          calls.push('handler');
          return ok({ done: true });
        },
      }),
    );

    await router.handle({ method: 'GET', path: '/api/v1/guilds/guild-1/settings' });

    expect(calls).toEqual(['global:before', 'route:before', 'handler', 'route:after', 'global:after']);
  });

  it('validates params, query, and body before handler execution', async () => {
    const router = new APIRouter();
    const handler = vi.fn(async () => ok({ done: true }));
    router.register(
      endpoint({
        method: 'PATCH',
        params: z.object({ guildId: z.string().min(1) }),
        query: z.object({ dryRun: z.boolean().optional() }),
        body: z.object({ settings: z.record(z.string(), z.unknown()) }),
        handler,
      }),
    );

    const response = await router.handle({
      method: 'PATCH',
      path: '/api/v1/guilds/guild-1/settings',
      query: { dryRun: 'nope' },
      body: {},
    });

    expect(response.success).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    if (!response.success) {
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(422);
    }
  });

  it('returns standardized errors for missing routes and duplicate routes', async () => {
    const router = new APIRouter();
    router.register(endpoint());

    expect(() => router.register(endpoint())).toThrow(
      'Duplicate API route "GET /api/v1/guilds/:guildId/settings".',
    );

    const response = await router.handle({ method: 'GET', path: '/api/v1/missing' });

    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    }
  });
});
