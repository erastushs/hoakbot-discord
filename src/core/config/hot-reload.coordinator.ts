import type { ConfigChangeSource } from './provider.types.js';
import type { HealthCheck, SubsystemHealth } from '../health/types.js';

export interface HotReloadChange {
  ownerId: string;
  guildId?: string;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: ConfigChangeSource;
  timestamp: number;
  version?: number;
}

export type HotReloadBatch = readonly HotReloadChange[] & {
  readonly ownerId: string;
  readonly guildId?: string;
  readonly scope: string;
  readonly version: number;
  readonly changes: readonly HotReloadChange[];
};

export type HotReloadHandler = (batch: HotReloadBatch, signal: AbortSignal) => void | Promise<void>;

export interface HotReloadDiagnostic {
  ownerId: string;
  guildId?: string;
  status: 'pending' | 'retrying' | 'applied' | 'failed' | 'disabled';
  attempts: number;
  keys: readonly string[];
  committedVersion: number;
  lastAppliedVersion: number;
  error?: string;
  timestamp: number;
}

export interface HotReloadOptions {
  enabled?: boolean;
  batchWindowMs?: number;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export class ConfigurationHotReloadCoordinator {
  private readonly handlers = new Map<string, HotReloadHandler>();
  private readonly pending = new Map<string, Map<string, HotReloadChange>>();
  private readonly chains = new Map<string, Promise<void>>();
  private readonly diagnostics = new Map<string, HotReloadDiagnostic>();
  private readonly committed = new Map<string, Map<string, HotReloadChange>>();
  private readonly committedVersions = new Map<string, number>();
  private readonly appliedVersions = new Map<string, number>();
  private timer?: ReturnType<typeof setTimeout>;
  private readonly options: Required<HotReloadOptions>;

  constructor(options: HotReloadOptions = {}) {
    this.options = { enabled: true, batchWindowMs: 10, timeoutMs: 5000, retries: 2, retryDelayMs: 50, ...options };
  }

  register(ownerId: string, handler: HotReloadHandler, guildId?: string): () => void {
    const scope = this.scope(ownerId, guildId);
    if (this.handlers.has(scope)) throw new Error(`Hot reload handler already registered for "${ownerId}"${guildId ? ` in guild "${guildId}"` : ''}.`);
    this.handlers.set(scope, handler);
    return () => { if (this.handlers.get(scope) === handler) this.handlers.delete(scope); };
  }

  enqueue(change: HotReloadChange): void {
    const scope = this.scope(change.ownerId, change.guildId);
    const version = (this.committedVersions.get(scope) ?? 0) + 1;
    this.committedVersions.set(scope, version);
    const committed = this.committed.get(scope) ?? new Map<string, HotReloadChange>();
    const priorCommitted = committed.get(change.key);
    committed.set(change.key, { ...change, version, oldValue: priorCommitted?.oldValue ?? change.oldValue });
    this.committed.set(scope, committed);
    if (!this.options.enabled) { this.record(scope, change, 'disabled', 0); return; }
    const batch = this.pending.get(scope) ?? new Map<string, HotReloadChange>();
    const previous = batch.get(change.key);
    batch.set(change.key, { ...change, version, oldValue: previous?.oldValue ?? change.oldValue });
    this.pending.set(scope, batch);
    this.record(scope, change, 'pending', 0);
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, this.options.batchWindowMs);
  }

  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    const batches = [...this.pending.entries()].sort(([a], [b]) => a.localeCompare(b));
    this.pending.clear();
    await Promise.all(batches.map(([scope, batch]) => this.schedule(scope, [...batch.values()])));
  }

  getDiagnostics(): readonly HotReloadDiagnostic[] {
    return [...this.diagnostics.values()].sort((a, b) => this.scope(a.ownerId, a.guildId).localeCompare(this.scope(b.ownerId, b.guildId)));
  }

  createHealthCheck(name = 'configuration-hot-reload'): HealthCheck {
    return { name, execute: async (): Promise<SubsystemHealth> => {
      const degraded = this.getDiagnostics().filter(({ status }) => status === 'failed');
      return degraded.length === 0 ? { status: 'healthy' } : { status: 'degraded', message: 'Configuration hot reload requires reconciliation.', metadata: { scopes: degraded.map(({ ownerId, guildId }) => ({ ownerId, ...(guildId ? { guildId } : {}) })) } };
    } };
  }

  async reconcile(ownerId?: string, guildId?: string): Promise<void> {
    const selected = [...this.committed.entries()].filter(([, values]) => {
      const change = values.values().next().value as HotReloadChange | undefined;
      return change !== undefined && (!ownerId || (change.ownerId === ownerId && (guildId === undefined || change.guildId === guildId)));
    });
    for (const [scope, values] of selected.sort(([a], [b]) => a.localeCompare(b))) await this.schedule(scope, [...values.values()]);
    if (this.pending.size) await this.flush();
  }

  private schedule(scope: string, changes: HotReloadChange[]): Promise<void> {
    const chain = (this.chains.get(scope) ?? Promise.resolve()).then(() => this.deliver(scope, changes.sort((a, b) => a.key.localeCompare(b.key))));
    this.chains.set(scope, chain.catch(() => undefined));
    return chain;
  }

  private async deliver(scope: string, changes: HotReloadChange[]): Promise<void> {
    const first = changes[0]!;
    const handler = this.handlers.get(scope) ?? this.handlers.get(this.scope(first.ownerId));
    if (!handler) { this.record(scope, changes[0]!, 'failed', 0, 'No hot reload handler registered.', changes); return; }
    const version = Math.max(...changes.map(({ version }) => version ?? 0));
    const items = changes.map((change) => Object.freeze({ ...change, version }));
    const batch = Object.assign(items, { ownerId: first.ownerId, ...(first.guildId ? { guildId: first.guildId } : {}), scope, version, changes: items }) as HotReloadBatch;
    Object.freeze(batch);
    for (let attempt = 1; attempt <= this.options.retries + 1; attempt += 1) {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([Promise.resolve(handler(batch, controller.signal)), new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Hot reload timed out.')); }, this.options.timeoutMs); })]);
        if (timer) clearTimeout(timer);
        this.appliedVersions.set(scope, Math.max(this.appliedVersions.get(scope) ?? 0, version));
        const committed = this.committed.get(scope);
        if (committed) {
          for (const [key, change] of committed) {
            if ((change.version ?? 0) <= version) committed.delete(key);
          }
          if (committed.size === 0) this.committed.delete(scope);
        }
        this.record(scope, first, 'applied', attempt, undefined, changes);
        return;
      } catch (error) {
        if (timer) clearTimeout(timer);
        const message = error instanceof Error ? error.message : String(error);
        if (attempt > this.options.retries) { this.record(scope, first, 'failed', attempt, message, changes); return; }
        this.record(scope, first, 'retrying', attempt, message, changes);
        await new Promise((resolve) => setTimeout(resolve, this.options.retryDelayMs));
      }
    }
  }

  private record(scope: string, change: HotReloadChange, status: HotReloadDiagnostic['status'], attempts: number, error?: string, changes: HotReloadChange[] = [change]): void {
    this.diagnostics.set(scope, { ownerId: change.ownerId, ...(change.guildId ? { guildId: change.guildId } : {}), status, attempts, keys: [...new Set(changes.map(({ key }) => key))].sort(), committedVersion: this.committedVersions.get(scope) ?? 0, lastAppliedVersion: this.appliedVersions.get(scope) ?? 0, ...(error ? { error } : {}), timestamp: Date.now() });
  }

  private scope(ownerId: string, guildId?: string): string { return `${ownerId}\u0000${guildId ?? ''}`; }
}
