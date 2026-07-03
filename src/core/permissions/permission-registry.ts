import type { IPermissionAction, IPermissionRegistry } from './types.js';

export class PermissionRegistry implements IPermissionRegistry {
  private readonly actions = new Map<string, IPermissionAction>();

  register(action: IPermissionAction): void {
    this.validateAction(action);

    if (this.actions.has(action.key)) {
      throw new Error(`Duplicate permission action "${action.key}".`);
    }

    this.actions.set(action.key, action);
  }

  registerMany(actions: IPermissionAction[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }

  get(action: string): IPermissionAction | undefined {
    return this.actions.get(action);
  }

  getAll(): IPermissionAction[] {
    return [...this.actions.values()];
  }

  getByModule(moduleId: string): IPermissionAction[] {
    return this.getAll().filter((action) => action.module === moduleId);
  }

  exists(action: string): boolean {
    return this.actions.has(action);
  }

  has(action: string): boolean {
    return this.exists(action);
  }

  private validateAction(action: IPermissionAction): void {
    if (!action.key) {
      throw new Error('Permission action key is required.');
    }

    if (!action.module) {
      throw new Error(`Permission action "${action.key}" requires a module.`);
    }

    if (!action.key.startsWith(`${action.module}.`)) {
      throw new Error(
        `Permission action "${action.key}" must be namespaced with module "${action.module}".`,
      );
    }
  }
}
