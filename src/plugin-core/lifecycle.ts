import type { PluginDiagnostic, RegisteredPlugin } from './contracts.js';
import { diagnostic, PluginCoreError } from './errors.js';

export interface LifecycleResult {
  readonly ready: boolean;
  readonly diagnostics: readonly PluginDiagnostic[];
  readonly started: readonly string[];
}

export class PluginLifecycleCoordinator {
  private started: RegisteredPlugin[] = [];
  private stopped = false;
  private diagnostics: PluginDiagnostic[] = [];

  constructor(private readonly timeoutMs = 10_000) {}

  async start(plugins: readonly RegisteredPlugin[], requirements: ReadonlyMap<string, 'required' | 'optional'> = new Map(), signal?: AbortSignal): Promise<LifecycleResult> {
    if (this.started.length) throw new PluginCoreError([diagnostic('LIFECYCLE_FAILURE', 'Lifecycle is already started.')]);
    this.stopped = false;
    this.diagnostics = [];
    for (const plugin of plugins) {
      try {
        await this.invoke(plugin, 'start', signal);
        this.started.push(plugin);
      } catch (error) {
        this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error));
        if ((requirements.get(plugin.manifest.id) ?? 'required') === 'required') {
          await this.stop(signal);
          throw new PluginCoreError(this.diagnostics);
        }
      }
    }
    return Object.freeze({ ready: true, diagnostics: Object.freeze([...this.diagnostics]), started: Object.freeze(this.started.map(({ manifest }) => manifest.id)) });
  }

  async stop(signal?: AbortSignal): Promise<LifecycleResult> {
    if (!this.stopped) {
      this.stopped = true;
      for (const plugin of [...this.started].reverse()) {
        try { await this.invoke(plugin, 'stop', signal); } catch (error) { this.diagnostics.push(this.toDiagnostic(plugin.manifest.id, error)); }
      }
      this.started = [];
    }
    return Object.freeze({ ready: false, diagnostics: Object.freeze([...this.diagnostics]), started: Object.freeze([]) });
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
