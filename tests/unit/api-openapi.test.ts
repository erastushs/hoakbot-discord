import { describe, expect, it } from 'vitest';

import { OpenAPIMetadataRegistry } from '../../src/core/api/openapi.js';
import { ok } from '../../src/core/api/responses.js';
import type { APIEndpoint } from '../../src/core/api/types.js';

function endpoint(operationId = 'getModules'): APIEndpoint {
  return {
    module: 'system',
    method: 'GET',
    path: '/modules',
    auth: 'public',
    metadata: {
      operationId,
      tags: ['modules'],
      summary: 'List modules',
    },
    handler: async () => ok({ modules: [] }),
  };
}

describe('OpenAPIMetadataRegistry', () => {
  it('registers operation ids and tags for documentation generation', () => {
    const registry = new OpenAPIMetadataRegistry();

    registry.register(endpoint(), '/api/v1/modules');

    expect(registry.get('getModules')).toEqual({
      operationId: 'getModules',
      tags: ['modules'],
      summary: 'List modules',
      method: 'GET',
      path: '/api/v1/modules',
      auth: 'public',
    });
    expect(registry.getByTag('modules')).toHaveLength(1);
  });

  it('rejects duplicate operation ids', () => {
    const registry = new OpenAPIMetadataRegistry();
    registry.register(endpoint());

    expect(() => registry.register(endpoint())).toThrow('Duplicate API operation id "getModules".');
  });
});
