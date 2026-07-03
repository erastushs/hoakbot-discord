import { manifestSchema } from './manifest.schema.js';
import type { IModuleManifest } from './manifest.types.js';

export class ManifestRegistry {
  private readonly manifests = new Map<string, IModuleManifest>();

  register(manifest: IModuleManifest): void {
    const parsed = manifestSchema.safeParse(manifest);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'manifest'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid module manifest "${manifest.id || 'unknown'}": ${message}`);
    }

    if (this.manifests.has(manifest.id)) {
      throw new Error(`Duplicate module manifest id "${manifest.id}".`);
    }

    this.manifests.set(manifest.id, manifest);
    this.validateNavigationOrder();
  }

  get(moduleId: string): IModuleManifest | undefined {
    return this.manifests.get(moduleId);
  }

  getAll(): IModuleManifest[] {
    return [...this.manifests.values()];
  }

  validate(): void {
    this.validateNavigationOrder();
    this.validateDependencies();
  }

  private validateNavigationOrder(): void {
    const priorities = new Map<number, string>();

    for (const manifest of this.manifests.values()) {
      const navigation = manifest.dashboard?.navigation;

      if (!navigation || navigation.hidden === true) {
        continue;
      }

      const existingModuleId = priorities.get(navigation.sidebarPriority);
      if (existingModuleId) {
        throw new Error(
          `Duplicate navigation order ${navigation.sidebarPriority} for modules "${existingModuleId}" and "${manifest.id}".`,
        );
      }

      priorities.set(navigation.sidebarPriority, manifest.id);
    }
  }

  private validateDependencies(): void {
    for (const manifest of this.manifests.values()) {
      for (const dependency of manifest.dependencies ?? []) {
        if (dependency === manifest.id) {
          throw new Error(`Module manifest "${manifest.id}" cannot depend on itself.`);
        }

        if (!this.manifests.has(dependency)) {
          throw new Error(
            `Module manifest "${manifest.id}" depends on unknown module "${dependency}".`,
          );
        }
      }
    }
  }
}

export function loadManifestRegistry(manifests: IModuleManifest[]): ManifestRegistry {
  const registry = new ManifestRegistry();

  for (const manifest of manifests) {
    registry.register(manifest);
  }

  registry.validate();
  return registry;
}
