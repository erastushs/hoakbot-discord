import { z } from 'zod';

export const capabilityKinds = ['settings', 'commands', 'events', 'routes', 'permissions'] as const;
const identifierSchema = z.string().min(1).regex(/^[a-z0-9][a-z0-9:._/-]*$/);
export const semverSchema = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
export const pluginDependencySchema = z.object({ id: identifierSchema, range: z.string().min(1) }).strict();
export const pluginCommandSchema = z.object({ id: z.string().min(1), autocomplete: z.boolean().default(false) }).strict();
export const pluginEventSchema = z.object({ id: z.string().min(1), priority: z.number().int().min(-1000).max(1000).default(0) }).strict();
export const pluginConfigSchema = z.object({ key: z.string().min(1), secret: z.boolean().default(false) }).strict();
export const pluginAssetSchema = z.object({ path: z.string().min(1).regex(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/) }).strict();
const capabilitiesSchema = z.object({ settings: z.array(z.string().min(1)).default([]), commands: z.array(z.string().min(1)).default([]), events: z.array(z.string().min(1)).default([]), routes: z.array(z.string().min(1)).default([]), permissions: z.array(z.string().min(1)).default([]) }).strict().default({});
export const pluginManifestSchema = z.object({ schemaVersion: z.literal(1), id: identifierSchema, name: z.string().min(1), description: z.string().min(1), version: semverSchema, dependencies: z.array(pluginDependencySchema).default([]), capabilities: capabilitiesSchema, contracts: z.object({ config: z.array(pluginConfigSchema).default([]), commands: z.array(pluginCommandSchema).default([]), events: z.array(pluginEventSchema).default([]), assets: z.array(pluginAssetSchema).default([]) }).strict().default({}), metadata: z.record(z.unknown()).optional() }).strict();
export type CapabilityKind = (typeof capabilityKinds)[number];
export type PluginManifest = Omit<z.output<typeof pluginManifestSchema>, 'contracts'> & { readonly contracts?: z.output<typeof pluginManifestSchema>['contracts'] };
export interface PluginLogger { log(level: string, message: string, metadata?: unknown): void }
export interface PluginContext { readonly ownerId: string; readonly guildId?: string; readonly signal: AbortSignal; readonly logger: PluginLogger; readonly config: { get(key: string): unknown | Promise<unknown> }; readonly events: { on(event: string, handler: (...args: unknown[]) => unknown): void | (() => void) }; readonly commands: { register(command: string, handler: (...args: unknown[]) => unknown): void | (() => void) }; readonly api: { register(route: string, handler: (...args: unknown[]) => unknown): void | (() => void) }; readonly health: { register(check: string, handler: () => unknown): void | (() => void) }; readonly lifecycle: { onConfigChange(handler: (...args: unknown[]) => unknown): void | (() => void) } }
export interface PluginInstance { readonly id: string; readonly start?: (signal: AbortSignal) => void | Promise<void>; readonly stop?: (signal: AbortSignal) => void | Promise<void> }
export type PluginFactory = (context: PluginContext) => PluginInstance | Promise<PluginInstance>;
export interface PluginDiagnostic { readonly code: string; readonly message: string; readonly pluginId?: string; readonly path?: readonly (string | number)[]; readonly capability?: CapabilityKind; readonly value?: string }
export const defineManifest = (value: unknown): PluginManifest => Object.freeze(pluginManifestSchema.parse(value));
export const parseManifest = (value: unknown): PluginManifest => pluginManifestSchema.parse(value);
export const definePlugin = (factory: PluginFactory): PluginFactory => factory;
