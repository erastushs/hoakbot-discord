import type { IContainer } from '../core/container/types.js';
import type { PluginManifest } from './contracts.js';
import { diagnostic, PluginCoreError } from './errors.js';
import { serializeMetadata } from './metadata-serializer.js';

export interface PluginLogger {
  log(level: string, message: string, metadata?: unknown): void;
}

export interface PluginContextServices {
  readonly logger: (scope: Readonly<{ ownerId: string; guildId?: string }>) => PluginLogger;
  readonly config: (ownerId: string, key: string, guildId?: string) => unknown | Promise<unknown>;
  readonly event: (ownerId: string, event: string, handler: (...args: unknown[]) => unknown, guildId?: string) => void | (() => void);
  readonly command: (ownerId: string, command: string, handler: (...args: unknown[]) => unknown, guildId?: string) => void | (() => void);
  readonly api: (ownerId: string, route: string, handler: (...args: unknown[]) => unknown, guildId?: string) => void | (() => void);
  readonly health: (ownerId: string, check: string, handler: () => unknown, guildId?: string) => void | (() => void);
}

export const pluginInternalCapabilities = Symbol('pluginInternalCapabilities');

export interface PluginContext {
  readonly ownerId: string;
  readonly [pluginInternalCapabilities]?: Readonly<{ container: IContainer }>;
  readonly guildId?: string;
  readonly signal: AbortSignal;
  readonly logger: PluginLogger;
  readonly config: { get(key: string): unknown | Promise<unknown> };
  readonly events: { on(event: string, handler: (...args: unknown[]) => unknown): void | (() => void) };
  readonly commands: { register(command: string, handler: (...args: unknown[]) => unknown): void | (() => void) };
  readonly api: { register(route: string, handler: (...args: unknown[]) => unknown): void | (() => void) };
  readonly health: { register(check: string, handler: () => unknown): void | (() => void) };
}

export function createPluginContext(manifest: PluginManifest, services: PluginContextServices, options: { guildId?: string; signal?: AbortSignal; container?: IContainer } = {}): PluginContext {
  const ownerId = manifest.id;
  const signal = options.signal ?? new AbortController().signal;
  const requireDeclaration = (kind: 'settings' | 'events' | 'commands' | 'routes' | 'permissions', value: string): void => {
    if (!manifest.capabilities[kind].includes(value)) throw new PluginCoreError([diagnostic('UNDECLARED_CAPABILITY', `Plugin "${ownerId}" did not declare ${kind} "${value}".`, { pluginId: ownerId, capability: kind, value })]);
  };
  const scope = options.guildId === undefined ? { ownerId } : { ownerId, guildId: options.guildId };
  return Object.freeze({
    ...scope,
    ...(options.container ? { [pluginInternalCapabilities]: Object.freeze({ container: options.container }) } : {}),
    signal,
    logger: Object.freeze({
      log: (level: string, message: string, metadata?: unknown) => services.logger(scope).log(level, message, serializeMetadata(metadata)),
    }),
    config: Object.freeze({ get: (key: string) => { requireDeclaration('settings', key); return services.config(ownerId, key, options.guildId); } }),
    events: Object.freeze({ on: (event: string, handler: (...args: unknown[]) => unknown) => { requireDeclaration('events', event); return services.event(ownerId, event, handler, options.guildId); } }),
    commands: Object.freeze({ register: (command: string, handler: (...args: unknown[]) => unknown) => { requireDeclaration('commands', command); return services.command(ownerId, command, handler, options.guildId); } }),
    api: Object.freeze({ register: (route: string, handler: (...args: unknown[]) => unknown) => { requireDeclaration('routes', route); return services.api(ownerId, route, handler, options.guildId); } }),
    health: Object.freeze({ register: (check: string, handler: () => unknown) => { requireDeclaration('permissions', check); return services.health(ownerId, check, handler, options.guildId); } }),
  });
}
