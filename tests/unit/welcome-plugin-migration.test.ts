import { describe, expect, it, vi } from 'vitest';
import { Events } from 'discord.js';
import { builtInGrantName, createPluginContext, type BuiltInCapabilityGrant } from '../../src/plugin-core/index.js';
import { projectLegacyManifest } from '../../src/modules/plugin-compatibility.js';
import { welcomeManifest } from '../../src/modules/welcome/manifest.js';
import { createWelcomePlugin, welcomePluginParity } from '../../src/modules/welcome/welcome.plugin.js';

function fixture() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const client = {
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
    }),
    off: vi.fn((event: string, listener: (...args: unknown[]) => void) => listeners.get(event)?.delete(listener)),
  };
  const settings = { register: vi.fn(), unregister: vi.fn() };
  const increment = vi.fn();
  const grant = Object.freeze({
    configuration: Object.freeze({ current: () => ({ bot: { welcome: { enabled: true, channelId: '', backgroundUrl: '', message: { title: '', body: [] }, image: { title: '', subtitle: '' } } } }), getMany: vi.fn() }),
    settings: Object.freeze(settings),
    logger: Object.freeze({ trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() }),
    client: Object.freeze(client),
    metrics: Object.freeze({ counter: vi.fn(() => ({ increment })) }),
    events: Object.freeze({}),
    commands: Object.freeze({}),
    database: Object.freeze({}),
  }) as unknown as BuiltInCapabilityGrant;
  const grants = Object.freeze({ [builtInGrantName]: grant });
  const services = { logger: () => ({ log: vi.fn() }), config: vi.fn(), event: vi.fn(), command: vi.fn(), api: vi.fn(), health: vi.fn() };
  const context = createPluginContext(projectLegacyManifest(welcomeManifest), services, { grants });
  return { context, grant, client, settings, listeners, increment };
}

describe('Welcome plugin migration', () => {
  it('inventories the legacy behavior and projection without changing capabilities', () => {
    expect(welcomePluginParity).toEqual({
      id: welcomeManifest.id,
      settings: welcomeManifest.settings,
      commands: welcomeManifest.commands,
      events: welcomeManifest.events,
      routes: welcomeManifest.routes,
      permissions: welcomeManifest.permissions,
      dashboard: welcomeManifest.dashboard,
    });
    const { context, grant } = fixture();
    const plugin = createWelcomePlugin(context);
    expect(plugin.module).toMatchObject({ name: 'welcome', manifest: welcomeManifest });
    expect(plugin.module.register({} as never)).toBeUndefined();
    expect(Object.isFrozen(grant)).toBe(true);
    expect(Reflect.ownKeys(context)).not.toContain('container');
    expect(Reflect.ownKeys(grant)).not.toEqual(expect.arrayContaining(['container', 'resolve', 'has', 'clear', 'tokens']));
  });

  it('owns lifecycle registration with idempotent start and cleanup', async () => {
    const { context, client, settings, listeners, increment } = fixture();
    const plugin = createWelcomePlugin(context);
    await plugin.start?.(new AbortController().signal);
    await plugin.start?.(new AbortController().signal);
    expect(client.on).toHaveBeenCalledTimes(1);
    expect(listeners.get(Events.GuildMemberAdd)?.size).toBe(1);
    expect(settings.register).toHaveBeenCalledTimes(1);
    expect(increment).toHaveBeenCalledTimes(1);
    await plugin.stop?.(new AbortController().signal);
    await plugin.stop?.(new AbortController().signal);
    expect(client.off).toHaveBeenCalledTimes(1);
    expect(listeners.get(Events.GuildMemberAdd)?.size).toBe(0);
    expect(settings.unregister).toHaveBeenCalledTimes(1);
  });

  it('supports rollback to the legacy projection without dual ownership', async () => {
    const { context, listeners } = fixture();
    const plugin = createWelcomePlugin(context);
    await plugin.start?.(new AbortController().signal);
    await plugin.stop?.(new AbortController().signal);
    expect(listeners.get(Events.GuildMemberAdd)?.size).toBe(0);
    expect(plugin.module.register({} as never)).toBeUndefined();
  });
});
