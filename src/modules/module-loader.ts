import type { IModule } from '../modules/module.interface.js';
import type { IContainer } from '../core/container/types.js';
import type { ILogger } from '../core/logger/logger.service.js';

export class ModuleLoader {
  private readonly modules: IModule[] = [];
  private readonly loadedModules: IModule[] = [];
  private readonly featureFlags: Record<string, boolean>;

  constructor(
    private readonly logger: ILogger,
    featureFlags: Record<string, boolean>,
  ) {
    this.featureFlags = featureFlags;
  }

  registerModule(module: IModule): void {
    this.modules.push(module);
  }

  async loadAll(container: IContainer): Promise<void> {
    for (const module of this.modules) {
      const flagEnabled = this.featureFlags[module.name] ?? false;

      if (!flagEnabled) {
        this.logger.debug({ module: module.name }, 'Module skipped — disabled by feature flag');
        continue;
      }

      this.logger.info({ module: module.name, version: module.version }, 'Loading module');
      module.register(container);
      this.loadedModules.push(module);
    }
  }

  async startAll(): Promise<void> {
    for (const module of this.loadedModules) {
      if (module.onStart) {
        this.logger.debug({ module: module.name }, 'Starting module');
        await module.onStart();
      }
    }
  }

  async shutdownAll(): Promise<void> {
    const reversed = [...this.loadedModules].reverse();
    for (const module of reversed) {
      if (module.onShutdown) {
        this.logger.debug({ module: module.name }, 'Shutting down module');
        await module.onShutdown();
      }
    }
  }

  getLoadedModules(): ReadonlyArray<IModule> {
    return this.loadedModules;
  }
}
