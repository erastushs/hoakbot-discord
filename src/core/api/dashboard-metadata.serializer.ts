import type { IModuleManifest } from '../../modules/manifest.types.js';
import type { PluginRegistrySnapshot } from '../../plugin-core/registry.js';
import type { DashboardModuleContract } from './contracts.js';

const safeManifest = (manifest: IModuleManifest): IModuleManifest => structuredClone({
  id: manifest.id,
  name: manifest.name,
  description: manifest.description,
  icon: manifest.icon,
  color: manifest.color,
  category: manifest.category,
  version: manifest.version,
  author: manifest.author,
  dependencies: manifest.dependencies ? [...manifest.dependencies] : undefined,
  dashboard: manifest.dashboard ? {
    navigation: { ...manifest.dashboard.navigation },
    homePage: { ...manifest.dashboard.homePage },
    settings: { groups: manifest.dashboard.settings.groups.map((group) => ({ ...group })) },
  } : undefined,
  supportsHotReload: manifest.supportsHotReload,
});

export function serializeDashboardModules(
  manifests: readonly IModuleManifest[],
  states: ReadonlyMap<string, boolean>,
  availableIds: ReadonlySet<string> = new Set(manifests.map((manifest) => manifest.id)),
): readonly DashboardModuleContract[] {
  return Object.freeze(manifests.map((manifest) => {
    const available = availableIds.has(manifest.id);
    const enabled = available && (states.get(manifest.id) ?? true);
    return Object.freeze({ ...safeManifest(manifest), enabled, available, health: available ? enabled ? 'available' : 'disabled' : 'unavailable' });
  }));
}

export function serializePluginSnapshot(snapshot: PluginRegistrySnapshot): readonly Readonly<{
  id: string;
  name: string;
  description: string;
  version: string;
  dependencies: readonly string[];
}>[] {
  return Object.freeze([...snapshot.values()].map(({ manifest }) => Object.freeze({
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    dependencies: Object.freeze(manifest.dependencies.map((dependency) => dependency.id)),
  })));
}
