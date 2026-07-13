import { EventEmitter } from 'node:events';
import { z } from 'zod';
import { defineEvent } from '@hoakbot/plugin-contracts';
import { EventCoordinator, EventRegistry } from '../../src/core/event-bus/event-registry.js';
import { DiscordEventSourceAdapter } from '../../src/core/event-bus/source-adapters.js';
import { PluginLifecycleCoordinator } from '../../src/plugin-core/lifecycle.js';

const manifest = (id: string) => ({ id, capabilities: { settings: [], commands: [], events: [], routes: [], permissions: [] } });

describe('phase 07 lifecycle and source integration', () => {
  it('auto-registers, gates stopped owners, unregisters without leaks, and keeps rollback modes disjoint', async () => {
    const registry = new EventRegistry(); const events = new EventCoordinator(registry); let calls = 0;
    const definition = defineEvent({ id: 'test.lifecycle', owner: 'plugin.a', source: 'internal', payload: z.unknown(), handler: () => { calls++; } });
    const plugin = { manifest: manifest('plugin.a') as never, instance: { id: 'plugin.a', events: [definition] } };
    const declarative = new PluginLifecycleCoordinator({ events, eventMode: 'declarative' });
    await declarative.start([plugin]); expect((await events.dispatch('test.lifecycle', null)).delivered).toBe(1);
    await declarative.stop(); expect((await events.dispatch('test.lifecycle', null)).delivered).toBe(0); expect(calls).toBe(1);
    const legacy = new PluginLifecycleCoordinator({ events, eventMode: 'legacy' });
    await legacy.start([plugin]); expect((await events.dispatch('test.lifecycle', null)).delivered).toBe(0); await legacy.stop();
  });

  it('shares Discord listeners and removes exactly the subscribed count', () => {
    const emitter = new EventEmitter(); const registry = new EventRegistry(); const events = new EventCoordinator(registry);
    const adapter = new DiscordEventSourceAdapter(emitter as never, events, { 'test.one': 'shared', 'test.two': 'shared' });
    const one = defineEvent({ id: 'test.one', owner: 'plugin.a', source: 'discord', payload: z.unknown(), handler: () => undefined });
    const two = defineEvent({ id: 'test.two', owner: 'plugin.b', source: 'discord', payload: z.unknown(), handler: () => undefined });
    const stopOne = adapter.bind(one); const stopTwo = adapter.bind(two); expect(emitter.listenerCount('shared')).toBe(1);
    stopOne(); expect(emitter.listenerCount('shared')).toBe(1); stopTwo(); expect(emitter.listenerCount('shared')).toBe(0);
  });

});
