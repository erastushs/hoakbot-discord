import type { PluginCatalogEntry, RegisteredPlugin } from './contracts.js';
import { createPluginContext, type PluginContextServices } from './context.js';
import { PluginLifecycleCoordinator, type LifecycleResult } from './lifecycle.js';
import { validateCatalog } from './catalog-validator.js';
import { resolveDependencies } from './dependency-resolver.js';
import type { IContainer } from '../core/container/types.js';
import type { PluginRegistry, PluginRegistrySnapshot } from './registry.js';

export interface PluginLoadOptions {
  readonly services?: PluginContextServices;
  readonly lifecycle?: PluginLifecycleCoordinator;
  readonly signal?: AbortSignal;
  readonly container?: IContainer;
}

export interface StartedPluginCatalog {
  readonly snapshot: PluginRegistrySnapshot;
  readonly lifecycle: PluginLifecycleCoordinator;
  readonly readiness: LifecycleResult;
}

const unavailableServices: PluginContextServices = {
  logger: () => Object.freeze({ log: () => undefined }),
  config: () => { throw new Error('Config capability is unavailable.'); },
  event: () => { throw new Error('Event capability is unavailable.'); },
  command: () => { throw new Error('Command capability is unavailable.'); },
  api: () => { throw new Error('API capability is unavailable.'); },
  health: () => { throw new Error('Health capability is unavailable.'); },
};

export async function loadPluginCatalog(catalog: readonly PluginCatalogEntry[], registry: PluginRegistry, options: PluginLoadOptions = {}): Promise<PluginRegistrySnapshot> {
  const ordered = resolveDependencies(validateCatalog(catalog));
  const stage = registry.stage();
  try {
    for (const entry of ordered) {
      const instance = await entry.factory(createPluginContext(entry.manifest, options.services ?? unavailableServices, { signal: options.signal, container: options.container }));
      if (instance.id !== entry.manifest.id) throw new Error(`Factory for "${entry.manifest.id}" returned "${instance.id}".`);
      stage.register(Object.freeze({ manifest: entry.manifest, instance }) satisfies RegisteredPlugin);
    }
    return stage.commit();
  } catch (error) {
    stage.rollback();
    throw error;
  }
}

export async function loadAndStartPluginCatalog(catalog: readonly PluginCatalogEntry[], registry: PluginRegistry, options: PluginLoadOptions = {}): Promise<StartedPluginCatalog> {
  const previous = registry.snapshot();
  const snapshot = await loadPluginCatalog(catalog, registry, options);
  const lifecycle = options.lifecycle ?? new PluginLifecycleCoordinator();
  const requirements = new Map(catalog.map((entry) => [(entry.manifest as { id: string }).id, entry.requirement ?? 'required']));
  try {
    const readiness = await lifecycle.start([...snapshot.values()], requirements, options.signal);
    return Object.freeze({ snapshot, lifecycle, readiness });
  } catch (error) {
    registry.restore(snapshot, previous);
    throw error;
  }
}
