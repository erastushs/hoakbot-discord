import { describe, expect, it, vi } from 'vitest';
import { Events } from 'discord.js';
import { TOKENS } from '../../src/core/container/tokens.js';
import { createPluginContext } from '../../src/plugin-core/index.js';
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
  const values = new Map<symbol, unknown>([
    [TOKENS.ConfigurationService, { current: () => ({ bot: { welcome: { enabled: true, channelId: '', backgroundUrl: '', message: { title: '', body: [] }, image: { title: '', subtitle: '' } } } }), getMany: vi.fn() }],
    [TOKENS.SettingsRegistry, settings],
    [TOKENS.Logger, { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() }],
    [TOKENS.DiscordClient, client],
    [TOKENS.MetricsService, { counter: vi.fn(() => ({ increment })) }],
  ]);
  const container = { resolve: (token: symbol) => values.get(token), has: (token: symbol) => values.has(token) };
  const services = { logger: () => ({ log: vi.fn() }), config: vi.fn(), event: vi.fn(), command: vi.fn(), api: vi.fn(), health: vi.fn() };
  const context = createPluginContext(projectLegacyManifest(welcomeManifest), services, { container: container as never });
  return { container, context, client, settings, listeners, increment };
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
    const { container, context } = fixture();
    const plugin = createWelcomePlugin(context);
    expect(plugin.module).toMatchObject({ name: 'welcome', manifest: welcomeManifest });
    expect(plugin.module.register(container as never)).toBeUndefined();
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
    const { container, context, listeners } = fixture();
    const plugin = createWelcomePlugin(context);
    await plugin.start?.(new AbortController().signal);
    await plugin.stop?.(new AbortController().signal);
    expect(listeners.get(Events.GuildMemberAdd)?.size).toBe(0);
    expect(plugin.module.register(container as never)).toBeUndefined();
  });
});
