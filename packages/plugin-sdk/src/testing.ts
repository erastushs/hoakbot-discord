import type { PluginFactory, PluginInstance, PluginManifest } from './index.js';

export interface TestRegistration { readonly kind: string; readonly value: string; readonly handler: (...args: unknown[]) => unknown }
export interface PluginTestHarness { readonly registrations: readonly TestRegistration[]; readonly logs: readonly unknown[]; start(factory: PluginFactory): Promise<void>; stop(): Promise<void> }

export function createPluginTestHarness(manifest: PluginManifest, config: Readonly<Record<string, unknown>> = {}): PluginTestHarness {
  const registrations: TestRegistration[] = [];
  const logs: unknown[] = [];
  const disposers: (() => void)[] = [];
  const controller = new AbortController();
  let instance: PluginInstance | undefined;
  let state: 'idle' | 'starting' | 'started' | 'stopping' | 'stopped' = 'idle';
  const allowed = (kind: 'settings' | 'commands' | 'events' | 'routes' | 'permissions', value: string): void => {
    const capabilities = manifest.capabilities[kind];
    if (!capabilities.includes(value) && !(kind === 'events' && capabilities.some((entry) => entry === value || entry.startsWith(`${value}:`)))) throw new Error(`Plugin "${manifest.id}" did not declare ${kind} capability "${value}".`);
  };
  const register = (kind: TestRegistration['kind'], value: string, handler: (...args: unknown[]) => unknown): (() => void) => {
    const item = Object.freeze({ kind, value, handler });
    let active = true;
    registrations.push(item);
    const dispose = () => { if (!active) return; active = false; const index = registrations.indexOf(item); if (index >= 0) registrations.splice(index, 1); };
    disposers.push(dispose);
    return dispose;
  };
  const cleanup = (): void => { for (const dispose of disposers.splice(0).reverse()) dispose(); };
  const context = Object.freeze({
    ownerId: manifest.id, signal: controller.signal,
    logger: Object.freeze({ log: (level: string, message: string, metadata?: unknown) => logs.push({ level, message, metadata }) }),
    config: Object.freeze({ get: (key: string) => { allowed('settings', key); return config[key]; } }),
    events: Object.freeze({ on: (value: string, handler: (...args: unknown[]) => unknown) => { allowed('events', value); return register('event', value, handler); } }),
    commands: Object.freeze({ register: (value: string, handler: (...args: unknown[]) => unknown) => { allowed('commands', value); return register('command', value, handler); } }),
    api: Object.freeze({ register: (value: string, handler: (...args: unknown[]) => unknown) => { allowed('routes', value); return register('route', value, handler); } }),
    health: Object.freeze({ register: (value: string, handler: () => unknown) => { allowed('permissions', value); return register('health', value, handler); } }),
    lifecycle: Object.freeze({ onConfigChange: (handler: (...args: unknown[]) => unknown) => register('config', 'change', handler) }),
  });
  const stop = async (): Promise<void> => {
    if (state === 'idle' || state === 'stopped' || state === 'stopping') return;
    state = 'stopping'; controller.abort();
    let failure: unknown;
    try { await instance?.stop?.(controller.signal); } catch (error) { failure = error; } finally { cleanup(); state = 'stopped'; }
    if (failure !== undefined) throw failure;
  };
  const start = async (factory: PluginFactory): Promise<void> => {
    if (state !== 'idle') throw new Error('Plugin test harness can only be started once.');
    state = 'starting';
    try {
      instance = await factory(context);
      if (instance.id !== manifest.id) throw new Error(`Factory returned id ${instance.id}; expected ${manifest.id}.`);
      for (const event of instance.events ?? []) {
        if (event.owner !== manifest.id) throw new Error(`Plugin "${manifest.id}" declared event ownership for another owner.`);
        allowed('events', event.id);
        register('event', event.id, event.handler as (...args: unknown[]) => unknown);
      }
      await instance.start?.(controller.signal);
      state = 'started';
    } catch (error) {
      try { await stop(); } catch { }
      throw error;
    }
  };
  return Object.freeze({ registrations, logs, start, stop });
}
