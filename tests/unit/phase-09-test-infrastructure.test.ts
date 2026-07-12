import { describe, expect, it, vi } from 'vitest';
import { TestPluginHost, manifest } from '../support/plugin-host.js';
import { assets, cache, channel, configuration, database, discordUser, eventBus, failures, fakeClock, guild, interaction, logger, member, registry } from '../support/fixtures.js';

const testManifest = manifest({ id: 'self-test', capabilities: { settings: ['enabled'], commands: ['ping'], events: ['ready'], routes: ['/status'], permissions: ['healthy'] } });

describe('Phase 09 shared test infrastructure', () => {
  it('starts contract-valid plugins and records every scoped boundary deterministically', async () => {
    const host = new TestPluginHost({ config: { 'self-test:enabled': true } });
    await host.start([{ manifest: testManifest, factory: async (context) => {
      expect(await context.config.get('enabled')).toBe(true);
      context.logger.log('info', 'started', { token: 'serialized' });
      context.commands.register('ping', vi.fn());
      context.events.on('ready', vi.fn());
      context.api.register('/status', vi.fn());
      context.health.register('healthy', vi.fn());
      return { id: 'self-test' };
    } }]);
    expect([host.commands.length, host.events.length, host.api.length, host.health.length]).toEqual([1, 1, 1, 1]);
    expect(host.logs).toEqual([expect.objectContaining({ ownerId: 'self-test', message: 'started' })]);
    await host.stop();
    expect(host.cleanup).toEqual({ registered: 4, called: 4 });
    host.assertNoLeaks();
  });

  it('rejects undeclared capabilities through production contracts', async () => {
    const host = new TestPluginHost();
    await expect(host.start([{ manifest: testManifest, factory: (context) => { context.commands.register('admin', vi.fn()); return { id: 'self-test' }; } }])).rejects.toThrow('did not declare commands');
  });

  it('provides isolated typed fixture factories and failure controls', async () => {
    expect(discordUser().bot).toBe(false);
    expect(guild().id).not.toBe(member().id);
    expect(channel().isTextBased()).toBe(true);
    expect(interaction().isChatInputCommand()).toBe(true);
    expect(logger().error).not.toHaveBeenCalled();
    expect(await database().transaction((transaction) => transaction)).toBeDefined();
    const values = cache(); values.set('key', 1); expect(values.get('key')).toBe(1);
    expect(configuration({ enabled: true }).current()).toEqual({ enabled: true });
    const bus = eventBus(); const handler = vi.fn(); const unsubscribe = bus.subscribe('event', handler); bus.emit('event', 1); unsubscribe(); expect(handler).toHaveBeenCalledWith(1);
    const commands = registry(); const command = vi.fn(); commands.register('ping', command); commands.invoke('ping'); expect(command).toHaveBeenCalledOnce();
    const store = assets(); store.put('ok', new Uint8Array([1])); expect(store.read('ok')).toEqual(new Uint8Array([1])); store.corrupt('ok'); expect(store.read('ok')).toEqual(new Uint8Array([255, 0]));
    const injector = failures(); injector.inject(new Error('failure')); expect(() => injector.consume()).toThrow('failure');
    const clock = fakeClock(); clock.install(); setTimeout(handler, 10); await clock.advance(10); expect(clock.pending()).toBe(0); clock.restore();
  });
});
