import type { PluginCatalogEntry, PluginInstance, PluginManifest } from '../plugin-core/index.js';
import type { IModuleManifest } from './manifest.types.js';
import type { IModule } from './module.interface.js';

export interface LegacyModulePluginInstance extends PluginInstance {
  readonly module: IModule;
}

export interface BuiltInPluginCatalogEntry extends PluginCatalogEntry {
  readonly legacyManifest: IModuleManifest;
}

export function projectLegacyManifest(manifest: IModuleManifest): PluginManifest {
  return {
    schemaVersion: 1,
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    dependencies: (manifest.dependencies ?? []).map((id) => ({ id, range: '*' })),
    capabilities: {
      settings: [...(manifest.settings ?? [])],
      commands: [...(manifest.commands ?? [])],
      events: [...(manifest.events ?? [])],
      routes: [...(manifest.routes ?? [])],
      permissions: [...(manifest.permissions ?? [])],
    },
    metadata: { legacyManifest: manifest },
  };
}

export function createLegacyModulePluginEntry(
  manifest: IModuleManifest,
  factory: () => Promise<IModule>,
): BuiltInPluginCatalogEntry {
  return Object.freeze({
    manifest: projectLegacyManifest(manifest),
    legacyManifest: manifest,
    factory: async (): Promise<LegacyModulePluginInstance> => {
      const module = await factory();
      if (module.name !== manifest.id || module.manifest?.id !== manifest.id) {
        throw new Error(`Built-in plugin "${manifest.id}" factory returned incompatible module "${module.name}".`);
      }
      return Object.freeze({ id: manifest.id, module });
    },
  });
}

export function projectPluginModules(snapshot: ReadonlyMap<string, { instance: PluginInstance }>): IModule[] {
  return [...snapshot.values()].map(({ instance }) => {
    if (!('module' in instance)) throw new Error(`Plugin "${instance.id}" has no legacy module projection.`);
    return (instance as LegacyModulePluginInstance).module;
  });
}
