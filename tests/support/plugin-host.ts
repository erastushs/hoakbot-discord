import { vi } from 'vitest';
import type { PluginCatalogEntry, PluginFactory, PluginManifest } from '../../src/plugin-core/contracts.js';
import type { PluginContextServices } from '../../src/plugin-core/context.js';
import { loadAndStartPluginCatalog } from '../../src/plugin-core/loader.js';
import { PluginLifecycleCoordinator } from '../../src/plugin-core/lifecycle.js';
import { PluginRegistry } from '../../src/plugin-core/registry.js';

export interface FailurePlan { readonly factory?: ReadonlySet<string>; readonly start?: ReadonlySet<string>; readonly stop?: ReadonlySet<string>; readonly capability?: ReadonlySet<string> }
export interface Registration { readonly ownerId: string; readonly value: string; readonly guildId?: string; readonly handler: (...args: unknown[]) => unknown }
export interface TestPluginHostOptions { readonly failures?: FailurePlan; readonly config?: Readonly<Record<string, unknown>>; readonly timeoutMs?: number }

export function manifest(overrides: Partial<PluginManifest> & Pick<PluginManifest, 'id'>): PluginManifest {
  return { schemaVersion: 1, name: overrides.id, description: `${overrides.id} test plugin`, version: '1.0.0', dependencies: [], capabilities: { settings: [], commands: [], events: [], routes: [], permissions: [] }, ...overrides };
}

export function testPluginFactory(id: string, setup?: Parameters<PluginFactory>[0] extends never ? never : (context: Parameters<PluginFactory>[0]) => void): PluginFactory {
  return (context) => { setup?.(context); return { id }; };
}

export class TestPluginHost {
  readonly registry = new PluginRegistry();
  readonly logs: ReadonlyArray<Readonly<Record<string, unknown>>>;
  readonly events: Registration[] = [];
  readonly commands: Registration[] = [];
  readonly api: Registration[] = [];
  readonly health: Registration[] = [];
  readonly requests: Array<Readonly<Record<string, unknown>>> = [];
  readonly cleanup = { registered: 0, called: 0 };
  private readonly mutableLogs: Array<Readonly<Record<string, unknown>>> = [];
  private lifecycle?: PluginLifecycleCoordinator;
  private readonly cleanups: Array<() => void> = [];
  private readonly options: TestPluginHostOptions;

  constructor(options: TestPluginHostOptions = {}) { this.options = options; this.logs = this.mutableLogs; }

  private register(kind: string, target: Registration[], ownerId: string, value: string, handler: (...args: unknown[]) => unknown, guildId?: string): () => void {
    if (this.options.failures?.capability?.has(`${kind}:${value}`)) throw new Error(`Injected ${kind} failure: ${value}`);
    const record = guildId === undefined ? { ownerId, value, handler } : { ownerId, value, handler, guildId };
    target.push(record);
    this.cleanup.registered++;
    let active = true;
    const cleanup = () => { if (!active) return; active = false; target.splice(target.indexOf(record), 1); this.cleanup.called++; };
    this.cleanups.push(cleanup);
    return cleanup;
  }

  services(): PluginContextServices {
    return {
      logger: ({ ownerId, guildId }) => ({ log: (level, message, metadata) => this.mutableLogs.push(Object.freeze({ ownerId, guildId, level, message, metadata })) }),
      config: (ownerId, key, guildId) => { this.requests.push(Object.freeze({ kind: 'config', ownerId, key, guildId })); return this.options.config?.[`${ownerId}:${guildId ?? '*'}:${key}`] ?? this.options.config?.[`${ownerId}:${key}`]; },
      event: (ownerId, value, handler, guildId) => this.register('event', this.events, ownerId, value, handler, guildId),
      command: (ownerId, value, handler, guildId) => this.register('command', this.commands, ownerId, value, handler, guildId),
      api: (ownerId, value, handler, guildId) => this.register('api', this.api, ownerId, value, handler, guildId),
      health: (ownerId, value, handler, guildId) => this.register('health', this.health, ownerId, value, handler, guildId),
      hotReload: (ownerId, handler, guildId) => this.register('hotReload', this.events, ownerId, 'config-change', handler as (...args: unknown[]) => unknown, guildId),
    };
  }

  async start(entries: readonly PluginCatalogEntry[]) {
    const wrapped = entries.map((entry) => ({ ...entry, factory: async (context: Parameters<PluginFactory>[0]) => {
      if (this.options.failures?.factory?.has((entry.manifest as PluginManifest).id)) throw new Error('Injected factory failure');
      const instance = await entry.factory(context);
      return { ...instance, start: async (signal: AbortSignal) => { if (this.options.failures?.start?.has(instance.id)) throw new Error('Injected start failure'); await instance.start?.(signal); }, stop: async (signal: AbortSignal) => { if (this.options.failures?.stop?.has(instance.id)) throw new Error('Injected stop failure'); await instance.stop?.(signal); } };
    } }));
    try {
      const result = await loadAndStartPluginCatalog(wrapped, this.registry, { services: this.services(), lifecycle: new PluginLifecycleCoordinator(this.options.timeoutMs ?? 1000) });
      this.lifecycle = result.lifecycle;
      return result;
    } catch (error) {
      for (const cleanup of [...this.cleanups].reverse()) cleanup();
      throw error;
    }
  }

  async stop(): Promise<void> { await this.lifecycle?.stop(); for (const cleanup of [...this.cleanups].reverse()) cleanup(); }
  assertNoLeaks(): void { if (this.events.length + this.commands.length + this.api.length + this.health.length !== 0) throw new Error('Plugin host leaked registrations.'); }
}

export const createFailurePlan = (values: FailurePlan = {}): FailurePlan => Object.freeze(values);
export const spy = vi.fn;
