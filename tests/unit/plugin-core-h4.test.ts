import { describe, expect, it, vi } from 'vitest';
import { loadAndStartPluginCatalog, loadPluginCatalog, PluginCoreError, PluginLifecycleCoordinator, PluginRegistry, type PluginCatalogEntry, type PluginContextServices } from '../../src/plugin-core/index.js';

const manifest = (id: string, commands: string[] = []) => ({ schemaVersion: 1 as const, id, name: id, description: id, version: '1.0.0', dependencies: [], capabilities: { settings: [], commands, events: [], routes: [], permissions: [] } });
const services = (trace: string[], throwing?: string): PluginContextServices => ({
  logger: () => ({ log: () => undefined }), config: () => undefined, event: () => undefined, api: () => undefined, health: () => undefined,
  command: (owner, command) => {
    trace.push(`register:${owner}:${command}`);
    if (`${owner}:${command}` === throwing) throw new Error('adapter failure');
    return () => { trace.push(`dispose:${owner}:${command}`); };
  },
});
const plugin = (id: string, factory: PluginCatalogEntry['factory'], commands: string[] = []): PluginCatalogEntry => ({ manifest: manifest(id, commands), factory });

class ThrowingRegistry extends PluginRegistry {
  override publish(): void { throw new Error('publish failure'); }
}

class ConflictingRegistry extends PluginRegistry {
  override publish(base: ReturnType<PluginRegistry['snapshot']>, next: Map<string, Parameters<PluginRegistry['publish']>[1] extends Map<string, infer T> ? T : never>): void {
    super.publish(base, new Map());
    super.publish(base, next);
  }
}

describe('H4 production plugin transaction', () => {
  it('globally reverses partial factory registrations and preserves factory failure', async () => {
    const trace: string[] = [];
    await expect(loadPluginCatalog([
      plugin('a', (context) => { context.commands.register('one', vi.fn()); return { id: 'a' }; }, ['one']),
      plugin('b', (context) => { context.commands.register('two', vi.fn()); throw new Error('factory primary'); }, ['two']),
    ], new PluginRegistry(), { services: services(trace) })).rejects.toThrow('factory primary');
    expect(trace).toEqual(['register:a:one', 'register:b:two', 'dispose:b:two', 'dispose:a:one']);
  });

  it('rolls back capability throws, wrong instances, publish throws and conflicts', async () => {
    const adapterTrace: string[] = [];
    await expect(loadPluginCatalog([plugin('a', (context) => { context.commands.register('one', vi.fn()); context.commands.register('two', vi.fn()); return { id: 'a' }; }, ['one', 'two'])], new PluginRegistry(), { services: services(adapterTrace, 'a:two') })).rejects.toThrow('adapter failure');
    expect(adapterTrace).toEqual(['register:a:one', 'register:a:two', 'dispose:a:one']);
    for (const registry of [new ThrowingRegistry(), new ConflictingRegistry()]) {
      const trace: string[] = [];
      await expect(loadPluginCatalog([plugin('a', (context) => { context.commands.register('one', vi.fn()); return { id: 'wrong' }; }, ['one'])], registry, { services: services(trace) })).rejects.toThrow();
      expect(trace).toEqual(['register:a:one', 'dispose:a:one']);
    }
    const trace: string[] = [];
    await expect(loadPluginCatalog([plugin('a', (context) => { context.commands.register('one', vi.fn()); return { id: 'a' }; }, ['one'])], new ThrowingRegistry(), { services: services(trace) })).rejects.toThrow('publish failure');
    expect(trace).toEqual(['register:a:one', 'dispose:a:one']);
  });

  it('wraps manual and concurrent disposal exactly once', async () => {
    const trace: string[] = [];
    let dispose: (() => void) | undefined;
    await expect(loadPluginCatalog([plugin('a', (context) => { dispose = context.commands.register('one', vi.fn()) as () => void; dispose(); throw new Error('fail'); }, ['one'])], new PluginRegistry(), { services: services(trace) })).rejects.toThrow('fail');
    await Promise.all([Promise.resolve(dispose?.()), Promise.resolve(dispose?.())]);
    expect(trace.filter((item) => item.startsWith('dispose'))).toEqual(['dispose:a:one']);
  });

  it('preserves primary start failure while attempting lifecycle, registry and capability cleanup', async () => {
    const trace: string[] = [];
    const registry = new PluginRegistry();
    await expect(loadAndStartPluginCatalog([
      plugin('a', (context) => { context.commands.register('one', vi.fn()); return { id: 'a', start: () => trace.push('start:a'), stop: () => { trace.push('stop:a'); throw new Error('stop cleanup'); } }; }, ['one']),
      plugin('b', (context) => { context.commands.register('two', vi.fn()); return { id: 'b', start: () => { throw new Error('start primary'); }, stop: () => trace.push('stop:b') }; }, ['two']),
    ], registry, { services: services(trace) })).rejects.toSatisfy((error: PluginCoreError) => error.diagnostics.some(({ message }) => message.includes('start primary')));
    expect(registry.snapshot().size).toBe(0);
    expect(trace).toEqual(['register:a:one', 'register:b:two', 'start:a', 'stop:b', 'stop:a', 'dispose:b:two', 'dispose:a:one']);
  });

  it('removes optional failed ownership and retains healthy ownership until idempotent normal stop', async () => {
    const trace: string[] = [];
    const started = await loadAndStartPluginCatalog([
      plugin('healthy', (context) => { context.commands.register('ok', vi.fn()); return { id: 'healthy', stop: () => trace.push('stop:healthy') }; }, ['ok']),
      { ...plugin('optional', (context) => { context.commands.register('bad', vi.fn()); return { id: 'optional', start: () => { throw new Error('optional'); }, stop: () => trace.push('stop:optional') }; }, ['bad']), requirement: 'optional' },
    ], new PluginRegistry(), { services: services(trace) });
    expect(trace).toContain('dispose:optional:bad');
    expect(trace).not.toContain('dispose:healthy:ok');
    await Promise.all([started.lifecycle.stop(), started.lifecycle.stop()]);
    expect(trace.filter((item) => item === 'dispose:healthy:ok')).toHaveLength(1);
    expect(trace.filter((item) => item === 'dispose:optional:bad')).toHaveLength(1);
  });

  it('continues event, plugin and capability cleanup after disposer failures', async () => {
    const trace: string[] = [];
    const lifecycle = new PluginLifecycleCoordinator();
    const started = await loadAndStartPluginCatalog([
      plugin('a', (context) => { context.commands.register('one', vi.fn()); return { id: 'a', stop: () => { trace.push('stop:a'); throw new Error('stop'); } }; }, ['one']),
      plugin('b', (context) => { context.commands.register('two', vi.fn()); return { id: 'b', stop: () => trace.push('stop:b') }; }, ['two']),
    ], new PluginRegistry(), { lifecycle, services: { ...services(trace), command: (owner, command) => { trace.push(`register:${owner}:${command}`); return () => { trace.push(`dispose:${owner}:${command}`); if (owner === 'b') throw new Error('dispose'); }; } } });
    const result = await started.lifecycle.stop();
    expect(trace.slice(-4)).toEqual(['stop:b', 'stop:a', 'dispose:b:two', 'dispose:a:one']);
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(2);
  });

  it('exposes isolated frozen contexts and grants without container or token resolution', async () => {
    const seen: unknown[] = [];
    const grants = { a: Object.freeze({ builtIn: Object.freeze({ logger: Object.freeze({ info: vi.fn() }) }) }), b: Object.freeze({ builtIn: Object.freeze({ metrics: Object.freeze({ counter: vi.fn() }) }) }) };
    await loadPluginCatalog([
      plugin('a', (context) => { seen.push(context); expect(context.grants).toBe(grants.a); expect(context.grants).not.toBe(grants.b); return { id: 'a' }; }),
      plugin('b', (context) => { seen.push(context); expect(context.grants).toBe(grants.b); return { id: 'b' }; }),
    ], new PluginRegistry(), { grants });
    for (const context of seen as Record<string, unknown>[]) {
      expect(Object.isFrozen(context)).toBe(true);
      expect(Reflect.ownKeys(context)).not.toContain('container');
      const grant = (context.grants as Record<string, object>).builtIn;
      expect(Reflect.ownKeys(grant)).not.toEqual(expect.arrayContaining(['container', 'resolve', 'has', 'clear', 'tokens']));
    }
  });
});
