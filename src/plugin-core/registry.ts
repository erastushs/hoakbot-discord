import type { RegisteredPlugin } from './contracts.js';
import { diagnostic, PluginCoreError } from './errors.js';

export type PluginRegistrySnapshot = ReadonlyMap<string, RegisteredPlugin>;

export class PluginRegistry {
  private current: PluginRegistrySnapshot = new Map();

  snapshot(): PluginRegistrySnapshot {
    return this.current;
  }

  stage(): PluginRegistryStage {
    return new PluginRegistryStage(this, this.current);
  }

  publish(base: PluginRegistrySnapshot, next: Map<string, RegisteredPlugin>): void {
    if (this.current !== base) throw new PluginCoreError([diagnostic('REGISTRY_CONFLICT', 'Registry changed while a stage was open.')]);
    this.current = immutableMap(next);
  }

  restore(expected: PluginRegistrySnapshot, previous: PluginRegistrySnapshot): void {
    if (this.current !== expected) throw new PluginCoreError([diagnostic('REGISTRY_CONFLICT', 'Registry changed before bootstrap rollback.')]);
    this.current = previous;
  }
}

export class PluginRegistryStage {
  private readonly staged: Map<string, RegisteredPlugin>;
  private closed = false;

  constructor(private readonly registry: PluginRegistry, private readonly base: PluginRegistrySnapshot) {
    this.staged = new Map(base);
  }

  register(plugin: RegisteredPlugin): void {
    if (this.closed || this.staged.has(plugin.manifest.id)) throw new PluginCoreError([diagnostic('REGISTRY_CONFLICT', `Cannot register "${plugin.manifest.id}".`, { pluginId: plugin.manifest.id })]);
    this.staged.set(plugin.manifest.id, Object.freeze(plugin));
  }

  commit(): PluginRegistrySnapshot {
    if (this.closed) throw new PluginCoreError([diagnostic('REGISTRY_CONFLICT', 'Stage is closed.')]);
    this.registry.publish(this.base, this.staged);
    this.closed = true;
    return this.registry.snapshot();
  }

  rollback(): void {
    this.closed = true;
  }
}

const immutableMap = <K, V>(source: Map<K, V>): ReadonlyMap<K, V> => new Proxy(source, {
  get(target, property) {
    if (property === 'set' || property === 'delete' || property === 'clear') return () => { throw new TypeError('Registry snapshots are immutable.'); };
    const value = Reflect.get(target, property, target) as unknown;
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
