import { describe, expect, it, vi } from 'vitest';
import { loadPluginCatalog, PluginLifecycleCoordinator, PluginRegistry } from '../../src/plugin-core/index.js';
import { createBuiltInRuntimeCatalog, generatedBuiltInPluginCatalog } from '../../src/modules/built-in-plugin-catalog.js';
import { createLegacyModulePluginEntry, projectLegacyManifest, projectPluginModules } from '../../src/modules/plugin-compatibility.js';
import { generalManifest } from '../../src/modules/general/manifest.js';
import type { IModule } from '../../src/modules/module.interface.js';

const moduleStub = (): IModule => ({ name: 'general', version: generalManifest.version, enabled: true, manifest: generalManifest, register: vi.fn() });
const flatCapabilities = (manifest: typeof generalManifest) => ({ settings: manifest.settings ?? [], commands: manifest.commands ?? [], events: manifest.events ?? [], routes: manifest.routes ?? [], permissions: manifest.permissions ?? [] });

describe('built-in plugin compatibility', () => {
  it('projects the complete 3.2.3 module contract without renaming capabilities', () => {
    const plugin = projectLegacyManifest(generalManifest);
    expect(plugin.id).toBe(generalManifest.id);
    expect(plugin.capabilities).toMatchObject(flatCapabilities(generalManifest));
    expect(plugin.capabilities.ownership).toMatchObject({
      commands: generalManifest.commands,
      events: { subscribers: generalManifest.events, publishers: [] },
      routes: { owners: ['/modules/general/settings'], contributors: ['/guilds/:guildId/settings'] },
      schedulers: [],
      assets: [],
    });
    expect(plugin.metadata?.['legacyManifest']).toBe(generalManifest);
  });

  it('keeps factories static and lazy', async () => {
    const factory = vi.fn(async () => moduleStub());
    const entry = createLegacyModulePluginEntry(generalManifest, factory);
    expect(factory).not.toHaveBeenCalled();
    const snapshot = await loadPluginCatalog([entry], new PluginRegistry());
    expect(factory).toHaveBeenCalledOnce();
    expect(projectPluginModules(snapshot)).toEqual([expect.objectContaining({ name: 'general' })]);
  });

  it('catalogs every current built-in in legacy bootstrap order', () => {
    expect(generatedBuiltInPluginCatalog.map((entry) => entry.legacyManifest.id)).toEqual(['general', 'voice', 'moderation', 'logging', 'welcome', 'goodbye', 'shrine']);
  });

  it('projects every built-in API and dashboard contract completely', () => {
    for (const entry of generatedBuiltInPluginCatalog) {
      const projected = projectLegacyManifest(entry.legacyManifest);
      expect(projected.capabilities).toMatchObject(flatCapabilities(entry.legacyManifest));
      expect(projected.capabilities.ownership.routes.contributors).toEqual((entry.legacyManifest.routes ?? []).filter((route) => route === '/guilds/:guildId/settings'));
      expect(projected.metadata?.['legacyManifest']).toBe(entry.legacyManifest);
      expect(entry.legacyManifest.dashboard).toBeDefined();
    }
  });

  it('rolls independent migration flags back without changing order or other selections', () => {
    const enabled = { modules: {}, pluginCoreBootstrap: false, generalPlugin: true, loggingPlugin: true, welcomePlugin: true, goodbyePlugin: true, voicePlugin: true, moderationPlugin: true, shrinePlugin: true };
    const ids = ['general', 'logging', 'welcome', 'goodbye', 'voice', 'moderation', 'shrine'] as const;
    const flags = ['generalPlugin', 'loggingPlugin', 'welcomePlugin', 'goodbyePlugin', 'voicePlugin', 'moderationPlugin', 'shrinePlugin'] as const;
    for (const flag of [...flags].reverse()) {
      const rolledBack = { ...enabled, [flag]: false };
      const catalog = createBuiltInRuntimeCatalog(rolledBack);
      expect(catalog.map(({ manifest }) => manifest.id)).toEqual(ids);
      for (let index = 0; index < flags.length; index++) {
        expect('legacyManifest' in catalog[index]!).toBe(flags[index] === flag);
      }
    }
  });

  it('stops plugins in reverse startup order exactly once', async () => {
    const calls: string[] = [];
    const plugins = ['general', 'logging', 'welcome', 'goodbye', 'voice', 'moderation', 'shrine'].map((id) => ({
      manifest: { schemaVersion: 1 as const, id, name: id, version: '1.0.0', capabilities: {} },
      instance: { id, start: () => calls.push(`start:${id}`), stop: () => calls.push(`stop:${id}`) },
    }));
    const lifecycle = new PluginLifecycleCoordinator();
    await lifecycle.start(plugins);
    await lifecycle.stop();
    await lifecycle.stop();
    expect(calls).toEqual([...plugins.map(({ manifest }) => `start:${manifest.id}`), ...plugins.map(({ manifest }) => `stop:${manifest.id}`).reverse()]);
  });

  it('diagnoses an incompatible adapter result', async () => {
    const bad = { ...moduleStub(), name: 'renamed' };
    await expect(loadPluginCatalog([createLegacyModulePluginEntry(generalManifest, async () => bad)], new PluginRegistry())).rejects.toThrow('incompatible module');
  });
});
