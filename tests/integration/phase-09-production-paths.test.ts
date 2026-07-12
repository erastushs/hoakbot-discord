import { describe, expect, it, vi } from 'vitest';
import type { EventBus as ProductionEventBus } from '../../src/core/event-bus/event-bus.js';
import { ConfigurationHotReloadCoordinator } from '../../src/core/config/hot-reload.coordinator.js';
import { evaluateCommandAuthorization } from '../../src/shared/command/authorize-command.js';
import { validateAsset } from '../../src/plugin-core/assets/resolver.js';
import { TestPluginHost, manifest } from '../support/plugin-host.js';
import { logger } from '../support/fixtures.js';
import type { CommandContext, ICommand } from '../../src/shared/types/command.js';

const entry = (id: string, stage: 'factory' | 'start' | 'stop') => ({ manifest: manifest({ id, capabilities: { settings: [], commands: ['run'], events: [], routes: [], permissions: [] } }), factory: (context: Parameters<Parameters<TestPluginHost['start']>[0][number]['factory']>[0]) => { context.commands.register('run', vi.fn()); if (stage === 'factory') throw new Error('factory'); return { id, start: () => { if (stage === 'start') throw new Error('start'); }, stop: () => { if (stage === 'stop') throw new Error('stop'); } }; } });

describe('Phase 09 production path regressions', () => {
  it.each(['factory', 'start'] as const)('unwinds every resource after %s failure', async (stage) => {
    const host = new TestPluginHost();
    try { await host.start([entry(stage, stage)]); } catch { host.assertNoLeaks(); }
    expect(host.cleanup.called).toBe(host.cleanup.registered);
  });

  it('contains stop failures and repeated lifecycle cycles without listeners or timers', async () => {
    for (let iteration = 0; iteration < 5; iteration++) {
      const host = new TestPluginHost(); await host.start([entry(`plugin-${iteration}`, 'stop')]);
      await host.stop(); host.assertNoLeaks(); expect(host.cleanup.called).toBe(host.cleanup.registered);
    }
  });

  it('uses production event subscription order and cleanup', async () => {
    const { EventBus } = await vi.importActual<typeof import('../../src/core/event-bus/event-bus.js')>('../../src/core/event-bus/event-bus.js');
    const calls: number[] = []; const bus: ProductionEventBus = new EventBus(logger());
    const first = bus.subscribe('command.executed', () => calls.push(1)); const second = bus.subscribe('command.executed', () => calls.push(2));
    bus.emit('command.executed', { commandName: 'ping', userId: 'u', guildId: 'g', duration: 1, success: true });
    expect(calls).toEqual([1, 2]); first.unsubscribe(); second.unsubscribe(); expect(bus.subscriberCount('command.executed')).toBe(0);
  });

  it('uses production config batching, ordering, isolation, and concurrency', async () => {
    const batches: string[][] = []; const coordinator = new ConfigurationHotReloadCoordinator({ batchWindowMs: 1, timeoutMs: 100, retries: 0 });
    coordinator.register('plugin', (batch) => { batches.push(batch.map(({ key }) => key)); }, 'guild-a');
    const change = (guildId: string, key: string, newValue: number) => ({ ownerId: 'plugin', guildId, key, oldValue: 0, newValue, source: 'api' as const, timestamp: 1 });
    coordinator.enqueue(change('guild-a', 'z', 1)); coordinator.enqueue(change('guild-a', 'a', 2)); coordinator.enqueue(change('guild-b', 'secret', 3)); await coordinator.flush();
    expect(batches).toEqual([['a', 'z']]); expect(coordinator.getDiagnostics().find(({ guildId }) => guildId === 'guild-b')?.status).toBe('failed');
  });

  it('uses production command denial and asset corruption validation', () => {
    const metadata = { name: 'secure', description: 'secure', category: 'test', scope: 'guild', permissionAction: 'discord-permissions', requiredPermissions: ['8'], autocompleteOptions: [], optionSchema: [] } as const;
    const context = { user: { id: 'user' }, guild: { members: { me: { permissions: { has: () => true } } } }, member: { permissions: { has: () => false } } } as unknown as CommandContext;
    expect(evaluateCommandAuthorization(metadata, {} as ICommand, context, [])).toEqual({ ok: false, reason: 'user-permission' });
    const buffer = Buffer.from('corrupt');
    expect(() => validateAsset({ id: 'voice:sound', owner: 'voice', source: 'sound.mp3', type: 'sound', mime: 'audio/mpeg', bytes: buffer.length, maxBytes: 100, sha256: '0'.repeat(64), durationMs: 1, maxDurationMs: 10 }, buffer)).toThrow('Asset hash mismatch');
  });
});
