import type { EventDefinition, PluginManifest as CanonicalPluginManifest } from '@hoakbot/plugin-contracts';
import type { PluginContext } from './context.js';
import type { PluginMigration } from './migrations.js';

export const capabilityKinds = ['settings', 'commands', 'events', 'routes', 'permissions'] as const;
export const exclusiveCapabilityKinds = ['settings', 'commands', 'permissions', 'routes', 'events', 'schedulers', 'assets'] as const;

export type CapabilityKind = (typeof capabilityKinds)[number];
export type ExclusiveCapabilityKind = (typeof exclusiveCapabilityKinds)[number];
export type PluginManifest = CanonicalPluginManifest;
export type PluginFactory = (context: PluginContext) => PluginInstance | Promise<PluginInstance>;
export interface PluginInstance {
  readonly id: string;
  readonly start?: (signal: AbortSignal) => void | Promise<void>;
  readonly stop?: (signal: AbortSignal) => void | Promise<void>;
  readonly events?: readonly EventDefinition<any>[];
  readonly publications?: readonly string[];
}
export type PluginRequirement = 'required' | 'optional';
export interface PluginCatalogEntry {
  readonly manifest: unknown;
  readonly factory: PluginFactory;
  readonly requirement?: PluginRequirement;
  readonly migrations?: readonly PluginMigration[];
}
export interface ValidatedPluginEntry {
  readonly manifest: PluginManifest;
  readonly factory: PluginFactory;
}
export interface RegisteredPlugin {
  readonly manifest: PluginManifest;
  readonly instance: PluginInstance;
}
export interface PluginDiagnostic {
  readonly code: PluginErrorCode;
  readonly message: string;
  readonly pluginId?: string;
  readonly path?: readonly string[];
  readonly capability?: CapabilityKind | ExclusiveCapabilityKind;
  readonly value?: string;
}
export type PluginErrorCode =
  | 'INVALID_MANIFEST'
  | 'DUPLICATE_PLUGIN_ID'
  | 'MISSING_DEPENDENCY'
  | 'DEPENDENCY_RANGE_MISMATCH'
  | 'DEPENDENCY_CYCLE'
  | 'CAPABILITY_COLLISION'
  | 'UNDECLARED_CAPABILITY'
  | 'LIFECYCLE_FAILURE'
  | 'LIFECYCLE_TIMEOUT'
  | 'LIFECYCLE_ABORTED'
  | 'REGISTRY_CONFLICT';
