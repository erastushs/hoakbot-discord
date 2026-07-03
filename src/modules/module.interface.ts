import type { IContainer } from '../core/container/types.js';
import type { ConfigChangeEvent } from '../core/config/provider.types.js';
import type { IEventBus } from '../core/event-bus/types.js';
import type { ILogger } from '../core/logger/logger.service.js';
import type { ISettingsRegistry } from '../core/settings/types.js';
import type { IModuleManifest } from './manifest.types.js';

export enum ModuleState {
  REGISTERED = 'REGISTERED',
  INITIALIZED = 'INITIALIZED',
  STARTED = 'STARTED',
  STOPPED = 'STOPPED',
  SHUTDOWN = 'SHUTDOWN',
}

export interface IModuleContext {
  container: IContainer;
  logger?: ILogger;
  eventBus?: IEventBus;
  settings?: ISettingsRegistry;
}

export interface IModule {
  readonly manifest?: IModuleManifest;
  readonly name: string;
  readonly version: string;
  readonly enabled: boolean;
  register(container: IContainer): void;
  onPreRegister?(ctx: IModuleContext): Promise<void>;
  onRegister?(ctx: IModuleContext): Promise<void>;
  onPostRegister?(ctx: IModuleContext): Promise<void>;
  onPreStart?(ctx: IModuleContext): Promise<void>;
  onStart?(ctx?: IModuleContext): Promise<void>;
  onPostStart?(ctx: IModuleContext): Promise<void>;
  onConfigChange?(changes: ConfigChangeEvent[], ctx: IModuleContext): Promise<void>;
  onPreStop?(ctx: IModuleContext): Promise<void>;
  onStop?(ctx: IModuleContext): Promise<void>;
  onPostStop?(ctx: IModuleContext): Promise<void>;
  onShutdown?(): Promise<void>;
}
