export { DependencyGraph } from './dependency-graph.js';
export { loadManifestRegistry, ManifestRegistry } from './manifest-registry.js';
export { manifestSchema, moduleCategorySchema } from './manifest.schema.js';
export { generatedModuleIndex, getGeneratedModuleIndex } from './module-index.js';
export { ModuleRegistry } from './module-registry.js';
export { ModuleState } from './module.interface.js';
export type {
  DependencyError,
  DependencyErrorType,
  DependencyValidation,
  IDependencyGraph,
} from './dependency-graph.js';
export type { ModuleIndexEntry } from './module-index.js';
export type { IModule } from './module.interface.js';
export type { IModuleContext } from './module.interface.js';
export type { IModuleRegistry, RegisteredModule } from './module-registry.js';
export type {
  DashboardConfig,
  DashboardHomePageConfig,
  DashboardNavigationConfig,
  DashboardSettingGroup,
  DashboardSettingsConfig,
  IModuleManifest,
  ModuleCategory,
} from './manifest.types.js';
