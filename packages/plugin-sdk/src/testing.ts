import type { PluginFactory, PluginManifest } from './index.js';

export interface TestRegistration { readonly kind: string; readonly value: string; readonly handler: (...args: unknown[]) => unknown }
export interface PluginTestHarness { readonly registrations: readonly TestRegistration[]; readonly logs: readonly unknown[]; start(factory: PluginFactory): Promise<void>; stop(): Promise<void> }

export function createPluginTestHarness(manifest: PluginManifest, config: Readonly<Record<string, unknown>> = {}): PluginTestHarness {
  const registrations: TestRegistration[] = [];
  const logs: unknown[] = [];
  let stop: ((signal: AbortSignal) => void | Promise<void>) | undefined;
  const controller = new AbortController();
  const register = (kind: string, value: string, handler: (...args: unknown[]) => unknown): (() => void) => {
    const item = Object.freeze({ kind, value, handler }); registrations.push(item);
    return () => { const index = registrations.indexOf(item); if (index >= 0) registrations.splice(index, 1); };
  };
  const context = Object.freeze({
    ownerId: manifest.id, signal: controller.signal,
    logger: Object.freeze({ log: (level: string, message: string, metadata?: unknown) => logs.push({ level, message, metadata }) }),
    config: Object.freeze({ get: (key: string) => config[key] }),
    events: Object.freeze({ on: (value: string, handler: (...args: unknown[]) => unknown) => register('event', value, handler) }),
    commands: Object.freeze({ register: (value: string, handler: (...args: unknown[]) => unknown) => register('command', value, handler) }),
    api: Object.freeze({ register: (value: string, handler: (...args: unknown[]) => unknown) => register('route', value, handler) }),
    health: Object.freeze({ register: (value: string, handler: () => unknown) => register('health', value, handler) }),
    lifecycle: Object.freeze({ onConfigChange: (handler: (...args: unknown[]) => unknown) => register('config', 'change', handler) }),
  });
  return Object.freeze({ registrations, logs, async start(factory: PluginFactory) { const instance = await factory(context); if (instance.id !== manifest.id) throw new Error(`Factory returned id ${instance.id}; expected ${manifest.id}.`); stop = instance.stop; await instance.start?.(controller.signal); }, async stop() { controller.abort(); await stop?.(controller.signal); registrations.splice(0); } });
}
