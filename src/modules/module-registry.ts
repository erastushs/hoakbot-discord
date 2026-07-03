import type { IModuleManifest } from './manifest.types.js';
import type { IModule } from './module.interface.js';
import { ModuleState } from './module.interface.js';

export interface RegisteredModule {
  module: IModule;
  manifest: IModuleManifest;
  state: ModuleState;
}

export interface IModuleRegistry {
  register(module: IModule): void;
  unregister(moduleId: string): boolean;
  get(moduleId: string): RegisteredModule | undefined;
  getAll(): RegisteredModule[];
  isEnabled(moduleId: string): boolean;
}

const allowedTransitions: Record<ModuleState, ModuleState[]> = {
  [ModuleState.REGISTERED]: [ModuleState.INITIALIZED, ModuleState.SHUTDOWN],
  [ModuleState.INITIALIZED]: [ModuleState.STARTED, ModuleState.SHUTDOWN],
  [ModuleState.STARTED]: [ModuleState.STOPPED, ModuleState.SHUTDOWN],
  [ModuleState.STOPPED]: [ModuleState.STARTED, ModuleState.SHUTDOWN],
  [ModuleState.SHUTDOWN]: [],
};

export class ModuleRegistry implements IModuleRegistry {
  private readonly modules = new Map<string, RegisteredModule>();

  register(module: IModule): void {
    if (!module.manifest) {
      throw new Error(`Module "${module.name}" cannot be registered without a v3 manifest.`);
    }

    if (this.modules.has(module.manifest.id)) {
      throw new Error(`Duplicate module id "${module.manifest.id}".`);
    }

    this.modules.set(module.manifest.id, {
      module,
      manifest: module.manifest,
      state: ModuleState.REGISTERED,
    });
  }

  unregister(moduleId: string): boolean {
    return this.modules.delete(moduleId);
  }

  get(moduleId: string): RegisteredModule | undefined {
    return this.modules.get(moduleId);
  }

  getAll(): RegisteredModule[] {
    return [...this.modules.values()];
  }

  isEnabled(moduleId: string): boolean {
    return this.modules.get(moduleId)?.module.enabled ?? false;
  }

  transition(moduleId: string, nextState: ModuleState): void {
    const registered = this.modules.get(moduleId);

    if (!registered) {
      throw new Error(`Unknown module "${moduleId}".`);
    }

    if (!allowedTransitions[registered.state].includes(nextState)) {
      throw new Error(
        `Invalid module state transition for "${moduleId}": ${registered.state} -> ${nextState}.`,
      );
    }

    registered.state = nextState;
  }
}
