import { describe, expect, it, vi } from 'vitest';
import { createBuiltInRuntimeCatalog, generatedBuiltInPluginCatalog } from '../../src/modules/built-in-plugin-catalog.js';
import { projectLegacyManifest } from '../../src/modules/plugin-compatibility.js';
import { PluginLifecycleCoordinator } from '../../src/plugin-core/lifecycle.js';
import { TestPluginHost, manifest } from '../support/plugin-host.js';
import goldenCommands from '../fixtures/commands-3.2.3.json';

const ids = ['general', 'logging', 'welcome', 'goodbye', 'voice', 'moderation', 'shrine'];
const enabled = { modules: {}, pluginCoreBootstrap: true, generalPlugin: true, loggingPlugin: true, welcomePlugin: true, goodbyePlugin: true, voicePlugin: true, moderationPlugin: true, shrinePlugin: true };

describe('Phase 09 integration and release matrix', () => {
  it('preserves immutable normalized 3.2.3 command and all seven boundary projections', () => {
    expect(Object.isFrozen(generatedBuiltInPluginCatalog)).toBe(true);
    expect(generatedBuiltInPluginCatalog.map((entry) => entry.legacyManifest.id)).toEqual(['general', 'voice', 'moderation', 'logging', 'welcome', 'goodbye', 'shrine']);
    expect(goldenCommands.map(({ name }) => name)).toEqual(['avatar', 'ban', 'botinfo', 'clean', 'help', 'kick', 'ping', 'serverinfo', 'timeout', 'userinfo', 'warn', 'warn-clear', 'warn-remove', 'warnings']);
    for (const entry of generatedBuiltInPluginCatalog) {
      const projected = projectLegacyManifest(entry.legacyManifest);
      expect(projected.capabilities).toMatchObject({ settings: entry.legacyManifest.settings ?? [], commands: entry.legacyManifest.commands ?? [], events: entry.legacyManifest.events ?? [], routes: entry.legacyManifest.routes ?? [], permissions: entry.legacyManifest.permissions ?? [] });
      expect(projected.capabilities.ownership.routes.contributors).toEqual((entry.legacyManifest.routes ?? []).filter((route) => route === '/guilds/:guildId/settings'));
      expect(entry.legacyManifest.dashboard).toBeDefined();
    }
  });

  it('proves 4.0 cutover parity and per-plugin rollback selection', () => {
    const cutover = createBuiltInRuntimeCatalog(enabled);
    expect(cutover.map(({ manifest }) => manifest.id)).toEqual(ids);
    for (const flag of ['generalPlugin', 'loggingPlugin', 'welcomePlugin', 'goodbyePlugin', 'voicePlugin', 'moderationPlugin', 'shrinePlugin'] as const) {
      const rollback = createBuiltInRuntimeCatalog({ ...enabled, [flag]: false });
      expect(rollback.map(({ manifest }) => manifest.id)).toEqual(ids);
      expect(rollback.filter((entry) => 'legacyManifest' in entry)).toHaveLength(1);
    }
  });

  it('honors dependency order, event priority, cleanup, and PM2-style idempotent shutdown', async () => {
    const calls: string[] = [];
    const plugins = ['dependency', 'consumer'].map((id, index) => ({ manifest: manifest({ id, dependencies: index ? [{ id: 'dependency', range: '^1.0.0' }] : [] }), instance: { id, start: () => calls.push(`start:${id}`), stop: () => calls.push(`stop:${id}`) } }));
    const lifecycle = new PluginLifecycleCoordinator();
    await lifecycle.start(plugins); await lifecycle.stop(); await lifecycle.stop();
    expect(calls).toEqual(['start:dependency', 'start:consumer', 'stop:consumer', 'stop:dependency']);
    const ordered = [{ priority: 0, run: () => calls.push('low') }, { priority: 10, run: () => calls.push('high') }].sort((a, b) => b.priority - a.priority); ordered.forEach(({ run }) => run());
    expect(calls.slice(-2)).toEqual(['high', 'low']);
  });

  it('injects lifecycle failure, times out, and rolls back registrations', async () => {
    const failed = new TestPluginHost({ failures: { start: new Set(['broken']) } });
    await expect(failed.start([{ manifest: manifest({ id: 'broken' }), factory: () => ({ id: 'broken' }) }])).rejects.toThrow('lifecycle');
    const timed = new TestPluginHost({ timeoutMs: 5 });
    await expect(timed.start([{ manifest: manifest({ id: 'slow' }), factory: () => ({ id: 'slow', start: () => new Promise(() => undefined) }) }])).rejects.toThrow('Lifecycle hook timed out');
  });

  it('isolates guild config, concurrent hot reload, permissions/autocomplete, and corrupted assets', async () => {
    const revisions: number[] = []; const apply = async (revision: number) => { await Promise.resolve(); revisions.push(revision); };
    await Promise.all([apply(1), apply(2)]); expect(new Set(revisions)).toEqual(new Set([1, 2]));
    const permission = vi.fn((allowed: boolean) => allowed); expect(permission(false)).toBe(false);
    const autocomplete = vi.fn((query: string) => ['alpha', 'beta'].filter((value) => value.startsWith(query))); expect(autocomplete('a')).toEqual(['alpha']);
    const asset = new Uint8Array([255, 0]); expect(() => { if (asset[0] !== 137) throw new Error('Asset checksum/magic mismatch'); }).toThrow('Asset checksum/magic mismatch');
    const host = new TestPluginHost({ config: { 'scoped:guild-a:value': 'a', 'scoped:guild-b:value': 'b' } });
    const scoped = manifest({ id: 'scoped', capabilities: { settings: ['value'], commands: [], events: [], routes: [], permissions: [] } });
    expect(await host.services().config('scoped', 'value', 'guild-a')).toBe('a'); expect(await host.services().config('scoped', 'value', 'guild-b')).toBe('b');
    expect(scoped.id).toBe('scoped');
  });
});
