import { describe, expect, it, vi } from 'vitest';
import { createPluginContext, loadAndStartPluginCatalog, loadPluginCatalog, PluginCoreError, PluginLifecycleCoordinator, PluginRegistry, resolveDependencies, serializeMetadata, validateCatalog, type PluginCatalogEntry, type RegisteredPlugin } from '../../src/plugin-core/index.js';

const entry = (id: string, dependencies: { id: string; range: string }[] = [], capabilities = {}) => ({ manifest: { schemaVersion: 1, id, name: id, description: id, version: '1.0.0', dependencies, capabilities }, factory: vi.fn(async () => ({ id })) }) satisfies PluginCatalogEntry;

describe('plugin core behavioral contracts', () => {
  it('executes no factory when any manifest is malformed', async () => {
    const good = entry('good');
    const bad = { manifest: { id: 'bad' }, factory: vi.fn() };
    await expect(loadPluginCatalog([good, bad], new PluginRegistry())).rejects.toBeInstanceOf(PluginCoreError);
    expect(good.factory).not.toHaveBeenCalled();
    expect(bad.factory).not.toHaveBeenCalled();
  });

  it('orders every catalog permutation deterministically and dependency-first', () => {
    const a = entry('a');
    const b = entry('b', [{ id: 'a', range: '^1.0.0' }]);
    const c = entry('c');
    for (const catalog of [[a, b, c], [c, b, a], [b, a, c]]) expect(resolveDependencies(validateCatalog(catalog)).map((item) => item.manifest.id)).toEqual(['a', 'b', 'c']);
  });

  it.each([
    [[entry('a', [{ id: 'missing', range: '*' }])], 'MISSING_DEPENDENCY'],
    [[entry('a'), entry('b', [{ id: 'a', range: '^2.0.0' }])], 'DEPENDENCY_RANGE_MISMATCH'],
    [[entry('a', [{ id: 'b', range: '*' }]), entry('b', [{ id: 'a', range: '*' }])], 'DEPENDENCY_CYCLE'],
  ])('reports dependency paths', (catalog, code) => {
    try { resolveDependencies(validateCatalog(catalog)); } catch (error) { expect((error as PluginCoreError).diagnostics[0]).toMatchObject({ code }); expect((error as PluginCoreError).diagnostics[0]?.path?.length).toBeGreaterThan(1); }
  });

  it.each(['settings', 'commands', 'events', 'routes', 'permissions'] as const)('rejects %s collisions', (kind) => {
    expect(() => validateCatalog([entry('a', [], { [kind]: ['shared'] }), entry('b', [], { [kind]: ['shared'] })])).toThrow(PluginCoreError);
  });

  it('publishes atomically and leaves snapshots immutable', async () => {
    const registry = new PluginRegistry();
    const before = registry.snapshot();
    await expect(loadPluginCatalog([entry('a'), { ...entry('b'), factory: vi.fn(async () => { throw new Error('failure'); }) }], registry)).rejects.toThrow('failure');
    expect(registry.snapshot()).toBe(before);
    await loadPluginCatalog([entry('a')], registry);
    expect(() => (registry.snapshot() as Map<string, unknown>).clear()).toThrow(TypeError);
  });

  it('serializes and recursively redacts metadata', () => {
    const value: Record<string, unknown> = { apiToken: 'x', nested: { password: 'y' }, count: 1n };
    value.self = value;
    expect(JSON.stringify(serializeMetadata(value))).toBe('{"apiToken":"[REDACTED]","nested":{"password":"[REDACTED]"},"count":"1","self":"[Circular]"}');
  });

  it('denies undeclared context access, scopes calls, redacts logs, and exposes no container', () => {
    const log = vi.fn();
    const config = vi.fn(() => 'value');
    const context = createPluginContext(validateCatalog([entry('owner', [], { settings: ['allowed'] })])[0]!.manifest, {
      logger: () => ({ log }), config, event: vi.fn(), command: vi.fn(), api: vi.fn(), health: vi.fn(),
    }, { guildId: 'guild' });
    expect(context.config.get('allowed')).toBe('value');
    expect(config).toHaveBeenCalledWith('owner', 'allowed', 'guild');
    expect(() => context.config.get('denied')).toThrow(PluginCoreError);
    context.logger.log('info', 'safe', { token: 'secret' });
    expect(log).toHaveBeenCalledWith('info', 'safe', { token: '[REDACTED]' });
    expect('container' in context).toBe(false);
  });

  it('rejects concurrent stages without publishing partial state', () => {
    const registry = new PluginRegistry();
    const first = registry.stage();
    const second = registry.stage();
    const plugin = { manifest: validateCatalog([entry('a')])[0]!.manifest, instance: { id: 'a' } };
    first.register(plugin);
    second.register(plugin);
    first.commit();
    expect(() => second.commit()).toThrow(PluginCoreError);
    expect([...registry.snapshot().keys()]).toEqual(['a']);
  });

  it('traces dependency order, reverse cleanup, repeated stop, timeout, and abort', async () => {
    const trace: string[] = [];
    const plugin = (id: string): RegisteredPlugin => ({ manifest: validateCatalog([entry(id)])[0]!.manifest, instance: { id, start: () => { trace.push(`start:${id}`); }, stop: () => { trace.push(`stop:${id}`); } } });
    const lifecycle = new PluginLifecycleCoordinator(10);
    await lifecycle.start([plugin('a'), plugin('b')]);
    await lifecycle.stop();
    await lifecycle.stop();
    expect(trace).toEqual(['start:a', 'start:b', 'stop:b', 'stop:a']);
    const timeout = new PluginLifecycleCoordinator(1);
    await expect(timeout.start([{ ...plugin('slow'), instance: { id: 'slow', start: () => new Promise(() => undefined) } }])).rejects.toMatchObject({ diagnostics: [expect.objectContaining({ code: 'LIFECYCLE_TIMEOUT' })] });
    const controller = new AbortController();
    controller.abort();
    await expect(new PluginLifecycleCoordinator().start([plugin('aborted')], new Map(), controller.signal)).rejects.toMatchObject({ diagnostics: [expect.objectContaining({ code: 'LIFECYCLE_ABORTED' })] });
  });

  it('cleans partial startup and restores the registry when bootstrap fails', async () => {
    const trace: string[] = [];
    const registry = new PluginRegistry();
    await expect(loadAndStartPluginCatalog([
      { ...entry('a'), factory: async () => ({ id: 'a', start: () => trace.push('start:a'), stop: () => trace.push('stop:a') }) },
      { ...entry('b', [{ id: 'a', range: '*' }]), factory: async () => ({ id: 'b', start: () => { throw new Error('failed'); } }) },
    ], registry)).rejects.toBeInstanceOf(PluginCoreError);
    expect(trace).toEqual(['start:a', 'stop:a']);
    expect(registry.snapshot().size).toBe(0);
  });
});
