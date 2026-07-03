import type { IModuleManifest } from './manifest.types.js';

export type DependencyErrorType = 'missing' | 'circular' | 'version_mismatch' | 'disabled';

export interface DependencyError {
  type: DependencyErrorType;
  from: string;
  to: string;
  message: string;
  path?: string[];
}

export interface DependencyValidation {
  valid: boolean;
  errors: DependencyError[];
}

export interface IDependencyGraph {
  add(manifest: IModuleManifest): void;
  resolve(): string[];
  validate(): DependencyValidation;
  getDependents(moduleId: string): string[];
}

export class DependencyGraph implements IDependencyGraph {
  private readonly manifests = new Map<string, IModuleManifest>();

  add(manifest: IModuleManifest): void {
    if (this.manifests.has(manifest.id)) {
      throw new Error(`Duplicate module manifest id "${manifest.id}".`);
    }

    this.manifests.set(manifest.id, manifest);
  }

  resolve(): string[] {
    const validation = this.validate();

    if (!validation.valid) {
      throw new Error(
        `Dependency graph is invalid: ${validation.errors.map((error) => error.message).join('; ')}`,
      );
    }

    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    for (const moduleId of this.manifests.keys()) {
      this.visit(moduleId, visited, visiting, resolved);
    }

    return resolved;
  }

  validate(): DependencyValidation {
    const errors: DependencyError[] = [];

    for (const manifest of this.manifests.values()) {
      for (const dependency of manifest.dependencies ?? []) {
        if (!this.manifests.has(dependency)) {
          errors.push({
            type: 'missing',
            from: manifest.id,
            to: dependency,
            message: `Module "${manifest.id}" depends on missing module "${dependency}".`,
          });
        }
      }
    }

    const circularErrors = this.findCircularDependencies();

    return {
      valid: errors.length === 0 && circularErrors.length === 0,
      errors: [...errors, ...circularErrors],
    };
  }

  getDependents(moduleId: string): string[] {
    return [...this.manifests.values()]
      .filter((manifest) => manifest.dependencies?.includes(moduleId))
      .map((manifest) => manifest.id);
  }

  private visit(
    moduleId: string,
    visited: Set<string>,
    visiting: Set<string>,
    resolved: string[],
  ): void {
    if (visited.has(moduleId)) {
      return;
    }

    if (visiting.has(moduleId)) {
      throw new Error(`Circular dependency detected at module "${moduleId}".`);
    }

    visiting.add(moduleId);

    const manifest = this.manifests.get(moduleId);
    for (const dependency of manifest?.dependencies ?? []) {
      this.visit(dependency, visited, visiting, resolved);
    }

    visiting.delete(moduleId);
    visited.add(moduleId);
    resolved.push(moduleId);
  }

  private findCircularDependencies(): DependencyError[] {
    const errors: DependencyError[] = [];
    const visited = new Set<string>();
    const stack: string[] = [];

    for (const moduleId of this.manifests.keys()) {
      this.detectCycle(moduleId, visited, stack, errors);
    }

    return errors;
  }

  private detectCycle(
    moduleId: string,
    visited: Set<string>,
    stack: string[],
    errors: DependencyError[],
  ): void {
    const cycleStart = stack.indexOf(moduleId);

    if (cycleStart >= 0) {
      const path = [...stack.slice(cycleStart), moduleId];
      errors.push({
        type: 'circular',
        from: stack[stack.length - 1] ?? moduleId,
        to: moduleId,
        message: `Circular dependency detected: ${path.join(' -> ')}.`,
        path,
      });
      return;
    }

    if (visited.has(moduleId)) {
      return;
    }

    visited.add(moduleId);
    stack.push(moduleId);

    const manifest = this.manifests.get(moduleId);
    for (const dependency of manifest?.dependencies ?? []) {
      if (this.manifests.has(dependency)) {
        this.detectCycle(dependency, visited, stack, errors);
      }
    }

    stack.pop();
  }
}
