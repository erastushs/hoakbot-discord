import { z } from 'zod';
import { defineEvent } from '@hoakbot/plugin-contracts';
import { EventCoordinator, EventRegistry } from '../../src/core/event-bus/event-registry.js';

describe('phase 07 event contracts and coordinator', () => {
  it('orders handlers, supports aliases, validates payloads, and cleans up lifecycle', async () => {
    const calls: string[] = [];
    const registry = new EventRegistry();
    const coordinator = new EventCoordinator(registry);
    const stop = coordinator.start([
      defineEvent({ id: 'test.event', owner: 'plugin.b', source: 'internal', aliases: ['test.legacy'], dependencies: ['plugin.a'], priority: 1, payload: z.object({ value: z.string() }), handler: ({ value }) => { calls.push(`b:${value}`); } }),
      defineEvent({ id: 'test.event', owner: 'plugin.a', source: 'internal', priority: 2, payload: z.object({ value: z.string() }), handler: ({ value }) => { calls.push(`a:${value}`); } }),
    ]);
    expect(await coordinator.dispatch('test.legacy', { value: 'ok' })).toEqual({ delivered: 2, diagnostics: [] });
    expect(calls).toEqual(['a:ok', 'b:ok']);
    expect((await coordinator.dispatch('test.event', { value: 1 })).diagnostics).toHaveLength(2);
    stop();
    expect((await coordinator.dispatch('test.event', { value: 'ignored' })).delivered).toBe(0);
  });

  it('rejects dependencies and observes failure stop and timeout', async () => {
    const registry = new EventRegistry();
    const coordinator = new EventCoordinator(registry);
    const base = { id: 'test.failure', source: 'internal' as const, payload: z.unknown() };
    expect(() => coordinator.start([defineEvent({ ...base, owner: 'plugin.missing', dependencies: ['plugin.none'], handler: () => undefined })])).toThrow('Missing event dependency');
    const stop = coordinator.start([
      defineEvent({ ...base, owner: 'plugin.a', priority: 2, failure: 'stop', handler: () => { throw new Error('failure'); } }),
      defineEvent({ ...base, owner: 'plugin.b', priority: 1, handler: () => undefined }),
    ]);
    const failed = await coordinator.dispatch('test.failure', null);
    expect(failed.delivered).toBe(0);
    expect(failed.diagnostics[0]?.code).toBe('event.handler_failed');
    stop();

    const timeoutStop = coordinator.start([defineEvent({ id: 'test.timeout', owner: 'plugin.timeout', source: 'internal', timeoutMs: 5, payload: z.unknown(), handler: () => new Promise(() => undefined) })]);
    expect((await coordinator.dispatch('test.timeout', null)).diagnostics[0]?.code).toBe('event.handler_timeout');
    timeoutStop();
  });
});
