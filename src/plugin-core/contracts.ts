import type { z } from 'zod';
import type { pluginManifestSchema } from './schema.js';
import type { PluginContext } from './context.js';
import type { PluginMigration } from './migrations.js';

export const capabilityKinds = ['settings', 'commands', 'events', 'routes', 'permissions'] as const;

export type CapabilityKind = (typeof capabilityKinds)[number];
export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginFactory = (context: PluginContext) => PluginInstance | Promise<PluginInstance>;
export interface PluginInstance {
  readonly id: string;
  readonly start?: (signal: AbortSignal) => void | Promise<void>;
  readonly stop?: (signal: AbortSignal) => void | Promise<void>;
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
  readonly capability?: CapabilityKind;
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
