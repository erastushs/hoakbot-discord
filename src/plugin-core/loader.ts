import type { PluginCatalogEntry, RegisteredPlugin } from './contracts.js';
import { createPluginContext, type PluginContextServices } from './context.js';
import { PluginLifecycleCoordinator, type LifecycleResult } from './lifecycle.js';
import { validateCatalog } from './catalog-validator.js';
import { resolveDependencies } from './dependency-resolver.js';
import type { PluginRegistry, PluginRegistrySnapshot } from './registry.js';
import type { PluginMigrationRunner } from './migrations.js';

export interface PluginLoadOptions {
  readonly services?: PluginContextServices;
  readonly lifecycle?: PluginLifecycleCoordinator;
  readonly signal?: AbortSignal;
  readonly grants?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly migrationRunner?: PluginMigrationRunner;
  readonly eventMode?: 'declarative' | 'legacy';
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

type Disposer = () => void | Promise<void>;
const ownership = new WeakMap<object, ReadonlyMap<string, () => Promise<void>>>();

const cleanupOnce = (disposers: Disposer[]): (() => Promise<void>) => {
  let done: Promise<void> | undefined;
  return () => done ??= (async () => {
    const failures: unknown[] = [];
    for (const disposer of [...disposers].reverse()) {
      try { await disposer(); } catch (error) { failures.push(error); }
    }
    disposers.length = 0;
    if (failures.length) throw new AggregateError(failures, 'Plugin cleanup failed.');
  })();
};

export async function loadPluginCatalog(catalog: readonly PluginCatalogEntry[], registry: PluginRegistry, options: PluginLoadOptions = {}): Promise<PluginRegistrySnapshot> {
  const ordered = resolveDependencies(validateCatalog(catalog));
  const stage = registry.stage();
  const scopes = new Map<string, Disposer[]>();
  const cleanups = new Map<string, () => Promise<void>>();
  for (const entry of ordered) {
    const disposers: Disposer[] = [];
    scopes.set(entry.manifest.id, disposers);
    cleanups.set(entry.manifest.id, cleanupOnce(disposers));
  }
  const cleanupAll = cleanupOnce([...cleanups.values()]);
  try {
    for (const entry of ordered) {
      const instance = await entry.factory(createPluginContext(entry.manifest, options.services ?? unavailableServices, { signal: options.signal, grants: options.grants?.[entry.manifest.id], eventMode: options.eventMode, trackDisposer: (disposer) => scopes.get(entry.manifest.id)!.push(disposer) }));
      if (!instance || typeof instance !== 'object' || instance.id !== entry.manifest.id) {
        if (instance && typeof instance === 'object' && typeof instance.stop === 'function') scopes.get(entry.manifest.id)!.push(() => instance.stop!(options.signal ?? new AbortController().signal));
        throw new Error(`Factory for "${entry.manifest.id}" returned an incompatible plugin instance.`);
      }
      stage.register(Object.freeze({ manifest: entry.manifest, instance }) satisfies RegisteredPlugin);
    }
    const snapshot = stage.commit();
    ownership.set(snapshot as object, cleanups);
    return snapshot;
  } catch (error) {
    stage.rollback();
    try { await cleanupAll(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Plugin loading failed and cleanup reported failures.', { cause: error }); }
    throw error;
  }
}

export async function loadAndStartPluginCatalog(catalog: readonly PluginCatalogEntry[], registry: PluginRegistry, options: PluginLoadOptions = {}): Promise<StartedPluginCatalog> {
  const previous = registry.snapshot();
  if (options.migrationRunner) {
    for (const entry of catalog) {
      const pluginId = (entry.manifest as { id?: unknown }).id;
      for (const migration of entry.migrations ?? []) {
        if (migration.namespace !== pluginId) throw new Error(`Migration namespace "${migration.namespace}" does not match owning plugin "${String(pluginId)}".`);
      }
    }
    await options.migrationRunner.run(catalog.flatMap((entry) => entry.migrations ?? []));
  }
  const snapshot = await loadPluginCatalog(catalog, registry, options);
  const lifecycle = options.lifecycle ?? new PluginLifecycleCoordinator();
  const cleanup = ownership.get(snapshot as object);
  if (cleanup) lifecycle.own(cleanup);
  const requirements = new Map(catalog.map((entry) => [(entry.manifest as { id: string }).id, entry.requirement ?? 'required']));
  try {
    const readiness = await lifecycle.start([...snapshot.values()], requirements, options.signal);
    return Object.freeze({ snapshot, lifecycle, readiness });
  } catch (error) {
    const failures: unknown[] = [];
    try { await lifecycle.stop(options.signal); } catch (cleanupError) { failures.push(cleanupError); }
    try { registry.restore(snapshot, previous); } catch (cleanupError) { failures.push(cleanupError); }
    if (failures.length) throw new AggregateError([error, ...failures], 'Plugin startup failed and cleanup reported failures.', { cause: error });
    throw error;
  }
}
