import { describe, expect, it } from 'vitest';

import { serializeDashboardModules, serializePluginSnapshot } from '../../src/core/api/dashboard-metadata.serializer.js';
import { generalManifest } from '../../src/modules/general/index.js';
import type { PluginRegistrySnapshot } from '../../src/plugin-core/registry.js';

describe('dashboard metadata serializer', () => {
  it('returns immutable safe module projections with normalized state', () => {
    const modules = serializeDashboardModules([generalManifest], new Map([['general', false]]));
    expect(modules[0]).toMatchObject({ id: 'general', enabled: false, health: 'disabled', available: true });
    expect(modules[0]).not.toHaveProperty('routes');
    expect(Object.isFrozen(modules)).toBe(true);
    expect(Object.isFrozen(modules[0])).toBe(true);
  });

  it('projects immutable plugin snapshots without metadata or executable instances', () => {
    const snapshot = new Map([['safe', {
      manifest: {
        schemaVersion: 1 as const,
        id: 'safe',
        name: 'Safe',
        description: 'Safe plugin',
        version: '1.0.0',
        dependencies: [{ id: 'core', range: '*' }],
        capabilities: { settings: [], commands: [], events: [], routes: [], permissions: [] },
        metadata: { token: 'secret', handler: () => undefined },
      },
      instance: { id: 'safe', start: () => undefined },
    }]]) as PluginRegistrySnapshot;
    const result = serializePluginSnapshot(snapshot);
    expect(result).toEqual([{ id: 'safe', name: 'Safe', description: 'Safe plugin', version: '1.0.0', dependencies: ['core'] }]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });
});
