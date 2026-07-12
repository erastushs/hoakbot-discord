import { generatedBuiltInPluginCatalog } from './built-in-plugin-catalog.js';
import type { IModuleManifest } from './manifest.types.js';
import type { IModule } from './module.interface.js';

export interface ModuleIndexEntry {
  manifest: IModuleManifest;
  module?: IModule;
}

export const generatedModuleIndex: readonly ModuleIndexEntry[] = Object.freeze(
  generatedBuiltInPluginCatalog.map(({ legacyManifest }) => Object.freeze({ manifest: legacyManifest })),
);

export function getGeneratedModuleIndex(): readonly ModuleIndexEntry[] {
  return generatedModuleIndex;
}

export { generatedBuiltInPluginCatalog, getGeneratedBuiltInPluginCatalog } from './built-in-plugin-catalog.js';
export { createLegacyModulePluginEntry, projectLegacyManifest, projectPluginModules } from './plugin-compatibility.js';
