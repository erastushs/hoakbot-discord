import type { IModuleManifest } from './manifest.types.js';
import type { IModule } from './module.interface.js';

export interface ModuleIndexEntry {
  manifest: IModuleManifest;
  module?: IModule;
}

export const generatedModuleIndex: ModuleIndexEntry[] = [];

export function getGeneratedModuleIndex(): readonly ModuleIndexEntry[] {
  return generatedModuleIndex;
}
