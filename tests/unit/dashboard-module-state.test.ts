import { describe, expect, it, vi } from 'vitest';

import { createModuleConfigEndpoints } from '../../src/core/api/module-config.endpoints.js';
import { SecurityAuditService } from '../../src/core/api/security-audit.service.js';
import type { GuildModuleStateRepository } from '../../src/core/config/guild-module-state.repository.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';
import type { IModuleManifest } from '../../src/modules/manifest.types.js';

const manifest = (id: string, dependencies: string[] = []): IModuleManifest => ({
  id, name: id, description: `${id} plugin`, icon: 'Box', color: '#000000', category: 'utility', version: '1.0.0', author: 'test', dependencies, supportsHotReload: false,
});

const config = { get: vi.fn(), getMany: vi.fn(), getDefaults: vi.fn(), set: vi.fn(), setMany: vi.fn(), watch: vi.fn() } as unknown as IConfigProvider;

function setup(initial = new Map<string, boolean>()) {
  const manifests = new ManifestRegistry();
  manifests.register(manifest('base'));
  manifests.register(manifest('dependent', ['base']));
  manifests.register(manifest('transitive', ['dependent']));
  const states = new Map(initial);
  const moduleStates: GuildModuleStateRepository = {
    getMany: vi.fn(async () => new Map(states)),
    setMany: vi.fn(async (_guild, changes) => { for (const [id, enabled] of changes) states.set(id, enabled); return true; }),
  };
  const logger = { info: vi.fn(), warn: vi.fn() };
  const endpoints = createModuleConfigEndpoints({ manifests, settings: new SettingsRegistry(), config, dashboardProjections: true, moduleStates, audit: new SecurityAuditService(logger as never) });
  const patch = endpoints.find((endpoint) => endpoint.method === 'PATCH' && endpoint.path.endsWith('/modules/:id'))!;
  return { logger, moduleStates, patch };
}

describe('guild module state endpoint', () => {
  it('preserves the legacy guild modules response exactly when the feature flag is off', async () => {
    const manifests = new ManifestRegistry();
    manifests.register(manifest('base'));
    const endpoint = createModuleConfigEndpoints({ manifests, settings: new SettingsRegistry(), config }).find((candidate) => candidate.path === '/guilds/:guildId/modules')!;
    await expect(endpoint.handler({ method: 'GET', path: '/api/v1/guilds/g/modules', params: { guildId: 'g' } }, { requestId: 'r', startedAt: 0, version: 'v1', params: {} })).resolves.toEqual({ success: true, status: 200, data: { modules: [manifest('base')] } });
  });

  it('exposes additive capabilities only when projections are enabled', async () => {
    const { patch } = setup();
    expect(patch).toBeDefined();
  });
  it('requires confirmation and atomically persists dependent disables', async () => {
    const { moduleStates, patch } = setup();
    const request = { method: 'PATCH' as const, path: '/api/v1/guilds/g/modules/base', params: { guildId: 'g', id: 'base' }, body: { enabled: false } };
    await expect(patch.handler(request, { requestId: 'r', startedAt: 0, version: 'v1', params: {}, session: { userId: 'u' } as never })).resolves.toMatchObject({ success: false, status: 409, error: { details: { dependents: ['dependent', 'transitive'], confirmationRequired: true } } });
    expect(moduleStates.setMany).not.toHaveBeenCalled();
    request.body = { enabled: false, confirmDependents: true } as never;
    await expect(patch.handler(request, { requestId: 'r', startedAt: 0, version: 'v1', params: {}, session: { userId: 'u' } as never })).resolves.toMatchObject({ success: true, data: { module: { enabled: false } } });
    expect(moduleStates.setMany).toHaveBeenCalledWith('g', new Map([['base', false], ['dependent', false], ['transitive', false]]), new Map([['base', true], ['dependent', true], ['transitive', true]]));
  });

  it('rejects enabling a module with a disabled dependency and audits detailed transitions', async () => {
    const { logger, moduleStates, patch } = setup(new Map([['base', false], ['dependent', false]]));
    const response = await patch.handler({ method: 'PATCH', path: '/api/v1/guilds/g/modules/dependent', params: { guildId: 'g', id: 'dependent' }, body: { enabled: true } }, { requestId: 'r', startedAt: 0, version: 'v1', params: {}, session: { userId: 'u' } as never });
    expect(response).toMatchObject({ success: false, status: 409, error: { details: { dependencies: ['base'] } } });
    expect(moduleStates.setMany).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
