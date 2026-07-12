import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ConfigurationHotReloadCoordinator } from '../../src/core/config/hot-reload.coordinator.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { loadAndStartPluginCatalog, PluginMigrationRunner, PluginRegistry, PostgresMigrationStore, migrationChecksum, type MigrationStore, type PluginMigration } from '../../src/plugin-core/index.js';

const change = (ownerId: string, key: string, oldValue: unknown, newValue: unknown, guildId = 'guild-1') => ({ ownerId, guildId, key, oldValue, newValue, source: 'api' as const, timestamp: Date.now() });

function migration(namespace: string, version: number): PluginMigration {
  return { namespace, version, operations: [{ kind: 'createTable', name: `${namespace}_${version}`.replaceAll('.', '_'), columns: { id: 'integer' } }] };
}

function store() {
  const applied = new Map<string, { namespace: string; version: number; checksum: string; appliedAt: Date }[]>();
  const value: MigrationStore = {
    initialize: vi.fn(async () => undefined),
    list: vi.fn(async (namespace) => applied.get(namespace) ?? []),
    apply: vi.fn(async (item, checksum) => { applied.set(item.namespace, [...(applied.get(item.namespace) ?? []), { namespace: item.namespace, version: item.version, checksum, appliedAt: new Date() }]); }),
  };
  return { value, applied };
}

describe('Phase 05 configuration contracts', () => {
  it('enforces one namespaced owner, uniqueness, schema presence, and valid defaults', () => {
    const registry = new SettingsRegistry();
    const setting = { key: 'voice.volume', label: 'Volume', description: 'Volume', group: 'voice', category: 'Voice', type: 'number' as const, defaultValue: 1, validation: z.number().min(0).max(2) };
    registry.register('voice', [setting]);
    expect(registry.getAll()).toEqual([setting]);
    expect(registry.validate(setting.key, setting.defaultValue)).toEqual({ success: true });
    expect(() => registry.register('other', [{ ...setting, key: 'voice.other' }])).toThrow(/namespaced/);
    expect(() => registry.register('duplicate', [{ ...setting, key: 'duplicate.value' }, { ...setting, key: 'duplicate.value' }])).toThrow(/Duplicate/);
  });

  it('coalesces final values, sorts keys, preserves scope order, and delivers each batch once', async () => {
    const coordinator = new ConfigurationHotReloadCoordinator({ batchWindowMs: 1000 });
    const calls: string[][] = [];
    coordinator.register('voice', async (changes) => { calls.push(changes.map((item) => `${item.key}:${item.oldValue}->${item.newValue}`)); });
    coordinator.enqueue(change('voice', 'voice.volume', 1, 2));
    coordinator.enqueue(change('voice', 'voice.channel', 'a', 'b'));
    coordinator.enqueue(change('voice', 'voice.volume', 2, 3));
    await coordinator.flush();
    expect(calls).toEqual([['voice.channel:a->b', 'voice.volume:1->3']]);
    expect(coordinator.getDiagnostics()).toEqual([expect.objectContaining({ ownerId: 'voice', guildId: 'guild-1', status: 'applied', attempts: 1, keys: ['voice.channel', 'voice.volume'] })]);
  });

  it('bounds retries, times out, degrades only the owner, redacts no values into diagnostics, and manually reconciles', async () => {
    const coordinator = new ConfigurationHotReloadCoordinator({ timeoutMs: 2, retries: 1, retryDelayMs: 0, batchWindowMs: 1000 });
    const voice = vi.fn(() => new Promise<void>(() => undefined));
    const general = vi.fn(async () => undefined);
    coordinator.register('voice', voice);
    coordinator.register('general', general);
    coordinator.enqueue(change('voice', 'voice.token', 'old-secret', 'new-secret'));
    coordinator.enqueue(change('general', 'general.prefix', '!', '?'));
    await coordinator.flush();
    expect(voice).toHaveBeenCalledTimes(2);
    expect(general).toHaveBeenCalledOnce();
    expect(JSON.stringify(coordinator.getDiagnostics())).not.toContain('secret');
    expect(coordinator.getDiagnostics()).toEqual(expect.arrayContaining([expect.objectContaining({ ownerId: 'voice', status: 'failed', attempts: 2 }), expect.objectContaining({ ownerId: 'general', status: 'applied' })]));
    coordinator.register('replacement', async () => undefined)();
    voice.mockImplementation(async () => undefined);
    await coordinator.reconcile('voice', 'guild-1');
    expect(voice).toHaveBeenCalledTimes(3);
    expect(coordinator.getDiagnostics()).toContainEqual(expect.objectContaining({ ownerId: 'voice', status: 'applied' }));
  });

  it('keeps owner callback values private while diagnostics and health expose no secrets', async () => {
    const coordinator = new ConfigurationHotReloadCoordinator({ batchWindowMs: 1000 });
    const callback = vi.fn(async () => undefined);
    coordinator.register('voice', callback);
    coordinator.enqueue(change('voice', 'voice.token', 'old-private-value', 'new-private-value'));
    await coordinator.flush();
    expect(callback).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ oldValue: 'old-private-value', newValue: 'new-private-value' })]), expect.any(AbortSignal));
    expect(JSON.stringify(coordinator.getDiagnostics())).not.toMatch(/private-value/);
    expect(JSON.stringify(await coordinator.createHealthCheck().execute())).not.toMatch(/private-value/);
  });

  it('serializes overlapping flushes without losing newer committed values', async () => {
    const coordinator = new ConfigurationHotReloadCoordinator({ batchWindowMs: 1000 });
    let release!: () => void;
    const first = new Promise<void>((resolve) => { release = resolve; });
    const values: unknown[] = [];
    coordinator.register('voice', async (batch) => { values.push(batch[0]!.newValue); if (values.length === 1) await first; });
    coordinator.enqueue(change('voice', 'voice.volume', 1, 2));
    const initialFlush = coordinator.flush();
    coordinator.enqueue(change('voice', 'voice.volume', 2, 3));
    const nextFlush = coordinator.flush();
    release();
    await Promise.all([initialFlush, nextFlush]);
    expect(values).toEqual([2, 3]);
    expect(coordinator.getDiagnostics()).toEqual([expect.objectContaining({ status: 'applied', committedVersion: 2, lastAppliedVersion: 2 })]);
  });

  it('reconciles all guild scopes for an owner when no guild is selected', async () => {
    const coordinator = new ConfigurationHotReloadCoordinator({ timeoutMs: 1, retries: 0, batchWindowMs: 1000 });
    const callback = vi.fn(() => new Promise<void>(() => undefined));
    coordinator.register('voice', callback);
    coordinator.enqueue(change('voice', 'voice.volume', 1, 2, 'guild-1'));
    coordinator.enqueue(change('voice', 'voice.volume', 1, 3, 'guild-2'));
    await coordinator.flush();
    callback.mockImplementation(async () => undefined);
    await coordinator.reconcile('voice');
    expect(callback).toHaveBeenCalledTimes(4);
    expect(coordinator.getDiagnostics().every(({ status }) => status === 'applied')).toBe(true);
  });

  it('disables delivery without deleting queued data and reports the rollback state', async () => {
    const coordinator = new ConfigurationHotReloadCoordinator({ enabled: false });
    const handler = vi.fn();
    coordinator.register('voice', handler);
    coordinator.enqueue(change('voice', 'voice.volume', 1, 2));
    await coordinator.flush();
    expect(handler).not.toHaveBeenCalled();
    expect(coordinator.getDiagnostics()).toEqual([expect.objectContaining({ status: 'disabled', keys: ['voice.volume'] })]);
  });

  it('orders migrations, replays idempotently, checks checksums, and applies required data in rollback-compatible deployments', async () => {
    const backing = store();
    const runner = new PluginMigrationRunner(backing.value);
    const migrations = [migration('voice', 2), migration('general', 1), migration('voice', 1)];
    await expect(runner.run(migrations)).resolves.toMatchObject([{ namespace: 'general', version: 1, status: 'applied' }, { namespace: 'voice', version: 1, status: 'applied' }, { namespace: 'voice', version: 2, status: 'applied' }]);
    await expect(runner.run(migrations)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ status: 'retained' })]));
    backing.applied.get('voice')![0]!.checksum = migrationChecksum(migration('voice', 99));
    await expect(runner.run(migrations)).rejects.toThrow(/Checksum mismatch/);
    const rollback = store();
    await expect(new PluginMigrationRunner(rollback.value).run([migration('new_plugin', 1)])).resolves.toEqual([expect.objectContaining({ status: 'applied' })]);
    expect(rollback.value.apply).toHaveBeenCalledOnce();
  });

  it('namespaces every plugin migration object while retaining the shared history table', async () => {
    const statements: string[] = [];
    const transaction = Object.assign(vi.fn(async () => []), { unsafe: vi.fn(async (statement: string) => { statements.push(statement); }) });
    const sql = Object.assign(vi.fn(), {
      begin: vi.fn(async (callback: (value: typeof transaction) => Promise<void>) => callback(transaction)),
    });
    const store = new PostgresMigrationStore(sql as never);
    await store.apply({ namespace: 'voice.effects', version: 1, operations: [
      { kind: 'createTable', name: 'clips', columns: { id: 'integer' } },
      { kind: 'addColumn', table: 'clips', name: 'title', type: 'text' },
      { kind: 'createIndex', table: 'clips', name: 'clips_title', columns: ['title'] },
    ] }, 'checksum');
    expect(statements).toHaveLength(3);
    const names = statements.flatMap((statement) => [...statement.matchAll(/"(plugin_[^"]+)"/g)].map((match) => match[1]));
    expect(names).toEqual(expect.arrayContaining([expect.stringMatching(/^plugin_voice_effects_[0-9a-f]{8}__clips$/), expect.stringMatching(/__clips_title$/)]));
    expect(new Set(names.filter((name) => name?.endsWith('__clips'))).size).toBe(1);
    expect(statements.join(' ')).not.toContain('plugin_migrations');
  });

  it('rejects migrations outside their owning plugin namespace', async () => {
    const backing = store();
    const catalog = [{ manifest: { schemaVersion: 1, id: 'voice', name: 'voice', description: 'voice', version: '1.0.0', dependencies: [], capabilities: {} }, migrations: [migration('other', 1)], factory: async () => ({ id: 'voice' }) }];
    await expect(loadAndStartPluginCatalog(catalog, new PluginRegistry(), { migrationRunner: new PluginMigrationRunner(backing.value) })).rejects.toThrow(/owning plugin/);
    expect(backing.value.initialize).not.toHaveBeenCalled();
  });

  it('runs migrations before factories and plugin start', async () => {
    const trace: string[] = [];
    const migrationRunner = { run: vi.fn(async () => { trace.push('migration'); return []; }) } as unknown as PluginMigrationRunner;
    await loadAndStartPluginCatalog([{ manifest: { schemaVersion: 1, id: 'voice', name: 'voice', description: 'voice', version: '1.0.0', dependencies: [], capabilities: {} }, migrations: [migration('voice', 1)], factory: async () => { trace.push('factory'); return { id: 'voice', start: () => { trace.push('start'); } }; } }], new PluginRegistry(), { migrationRunner });
    expect(trace).toEqual(['migration', 'factory', 'start']);
  });
});
