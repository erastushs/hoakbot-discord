import { describe, expect, it, vi } from 'vitest';
import { loadPluginCatalog, PluginRegistry } from '../../src/plugin-core/index.js';
import { generatedBuiltInPluginCatalog } from '../../src/modules/built-in-plugin-catalog.js';
import { createLegacyModulePluginEntry, projectLegacyManifest, projectPluginModules } from '../../src/modules/plugin-compatibility.js';
import { generalManifest } from '../../src/modules/general/manifest.js';
import type { IModule } from '../../src/modules/module.interface.js';

const moduleStub = (): IModule => ({ name: 'general', version: generalManifest.version, enabled: true, manifest: generalManifest, register: vi.fn() });

describe('built-in plugin compatibility', () => {
  it('projects the complete 3.2.3 module contract without renaming capabilities', () => {
    const plugin = projectLegacyManifest(generalManifest);
    expect(plugin.id).toBe(generalManifest.id);
    expect(plugin.capabilities).toEqual({ settings: generalManifest.settings, commands: generalManifest.commands, events: generalManifest.events, routes: generalManifest.routes, permissions: generalManifest.permissions });
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

  it('diagnoses an incompatible adapter result', async () => {
    const bad = { ...moduleStub(), name: 'renamed' };
    await expect(loadPluginCatalog([createLegacyModulePluginEntry(generalManifest, async () => bad)], new PluginRegistry())).rejects.toThrow('incompatible module');
  });
});
