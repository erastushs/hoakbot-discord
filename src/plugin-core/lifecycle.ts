import type { PluginDiagnostic, RegisteredPlugin } from './contracts.js';
import { diagnostic, PluginCoreError } from './errors.js';
import type { EventCoordinator } from '../core/event-bus/event-registry.js';
import type { EventSourceCoordinator } from '../core/event-bus/source-adapters.js';

export type PluginEventMode = 'declarative' | 'legacy';
export interface PluginLifecycleOptions { readonly timeoutMs?: number; readonly events?: EventCoordinator; readonly sources?: EventSourceCoordinator; readonly eventMode?: PluginEventMode }

export interface LifecycleResult {
  readonly ready: boolean;
  readonly diagnostics: readonly PluginDiagnostic[];
  readonly started: readonly string[];
}

export class PluginLifecycleCoordinator {
  private started: RegisteredPlugin[] = [];
  private stopped = false;
  private diagnostics: PluginDiagnostic[] = [];
  private readonly eventStops = new Map<string, () => void>();
  private cleanup: ReadonlyMap<string, () => Promise<void>> | undefined;
  private readonly timeoutMs: number;
  private readonly events?: EventCoordinator;
  private readonly sources?: EventSourceCoordinator;
  private readonly eventMode: PluginEventMode;

  constructor(options: number | PluginLifecycleOptions = 10_000) {
    this.timeoutMs = typeof options === 'number' ? options : options.timeoutMs ?? 10_000;
    this.events = typeof options === 'number' ? undefined : options.events;
    this.sources = typeof options === 'number' ? undefined : options.sources;
    this.eventMode = typeof options === 'number' ? 'legacy' : options.eventMode ?? 'legacy';
  }


  async start(plugins: readonly RegisteredPlugin[], requirements: ReadonlyMap<string, 'required' | 'optional'> = new Map(), signal?: AbortSignal): Promise<LifecycleResult> {
    if (this.started.length) throw new PluginCoreError([diagnostic('LIFECYCLE_FAILURE', 'Lifecycle is already started.')]);
    this.stopped = false;
    this.diagnostics = [];
    const available = new Set(plugins.map(({ manifest }) => manifest.id));
    for (const plugin of plugins) for (const definition of plugin.instance.events ?? []) for (const dependency of definition.dependencies) if (!available.has(dependency)) throw new PluginCoreError([diagnostic('MISSING_DEPENDENCY', `Event "${definition.id}" requires missing "${dependency}".`, { pluginId: plugin.manifest.id })]);
    for (const plugin of plugins) {
      try {
        let installation: ReturnType<EventCoordinator['install']> | undefined;
        let stopSources: (() => void) | undefined;
        if (this.eventMode === 'declarative' && plugin.instance.events?.length) {
          if (!this.events) throw new Error('Declarative event coordinator is unavailable.');
          if (plugin.instance.events.some(({ owner }) => owner !== plugin.manifest.id)) throw new Error(`Plugin "${plugin.manifest.id}" declared event ownership for another owner.`);
          installation = this.events.install(plugin.instance.events);
          try { stopSources = this.sources?.start(plugin.instance.events); } catch (error) { installation.stop(); throw error; }
        }
        try { await this.invoke(plugin, 'start', signal); } catch (error) {
          await this.cleanupFailedPlugin(plugin, stopSources, installation);
          throw error;
        }
        installation?.activate();
        if (installation) this.eventStops.set(plugin.manifest.id, () => { stopSources?.(); installation.stop(); });
        this.started.push(plugin);
      } catch (error) {
        this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error));
        if ((requirements.get(plugin.manifest.id) ?? 'required') === 'optional') {
          await this.cleanupOwner(plugin.manifest.id);
          continue;
        }
        if ((requirements.get(plugin.manifest.id) ?? 'required') === 'required') {
          await this.stop(signal);
          throw new PluginCoreError(this.diagnostics);
        }
      }
    }
    return Object.freeze({ ready: true, diagnostics: Object.freeze([...this.diagnostics]), started: Object.freeze(this.started.map(({ manifest }) => manifest.id)) });
  }

  own(cleanup: ReadonlyMap<string, () => Promise<void>>): void {
    this.cleanup = cleanup;
  }

  async stop(signal?: AbortSignal): Promise<LifecycleResult> {
    if (!this.stopped) {
      this.stopped = true;
      for (const plugin of [...this.started].reverse()) {
        const eventStop = this.eventStops.get(plugin.manifest.id);
        this.eventStops.delete(plugin.manifest.id);
        try { eventStop?.(); } catch (error) { this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error)); }
        try { await this.invoke(plugin, 'stop', signal); } catch (error) { this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error)); }
      }
      this.started = [];
      for (const ownerId of [...(this.cleanup?.keys() ?? [])].reverse()) await this.cleanupOwner(ownerId);
      this.cleanup = undefined;
    }
    return Object.freeze({ ready: false, diagnostics: Object.freeze([...this.diagnostics]), started: Object.freeze([]) });
  }

  private async cleanupFailedPlugin(plugin: RegisteredPlugin, stopSources?: () => void, installation?: ReturnType<EventCoordinator['install']>): Promise<void> {
    try { await this.invoke(plugin, 'stop'); } catch (error) { this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error)); }
    try { stopSources?.(); } catch (error) { this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error)); }
    try { installation?.stop(); } catch (error) { this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error)); }
  }

  private async cleanupOwner(ownerId: string): Promise<void> {
    const cleanup = this.cleanup?.get(ownerId);
    if (!cleanup) return;
    try { await cleanup(); } catch (error) { this.diagnostics.push(this.toDiagnostic(ownerId, error)); }
  }

  private async invoke(plugin: RegisteredPlugin, hook: 'start' | 'stop', parentSignal?: AbortSignal): Promise<void> {
    const fn = plugin.instance[hook];
    if (!fn) return;
    if (parentSignal?.aborted) throw abortError();
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    parentSignal?.addEventListener('abort', onAbort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve(fn(controller.signal)),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new LifecycleTimeoutError()); }, this.timeoutMs); }),
        ...(parentSignal ? [new Promise<never>((_, reject) => parentSignal.addEventListener('abort', () => reject(abortError()), { once: true }))] : []),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onAbort);
    }
  }

  private toDiagnostic(pluginId: string, error: unknown): PluginDiagnostic {
    const code = error instanceof LifecycleTimeoutError ? 'LIFECYCLE_TIMEOUT' : error instanceof DOMException && error.name === 'AbortError' ? 'LIFECYCLE_ABORTED' : 'LIFECYCLE_FAILURE';
    return diagnostic(code, `Plugin "${pluginId}" lifecycle failed: ${error instanceof Error ? error.message : String(error)}`, { pluginId });
  }
}

class LifecycleTimeoutError extends Error { constructor() { super('Lifecycle hook timed out.'); } }
const abortError = (): DOMException => new DOMException('Lifecycle hook aborted.', 'AbortError');
