import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { ConfigurationChangedEvent } from '../../src/core/event-bus/configuration.events.js';
import type { CoreSystemEventMap } from '../../src/core/event-bus/system.events.js';
import type { EventMap } from '../../src/core/event-bus/events.js';
import type { GeneralEventMap } from '../../src/modules/general/general.events.js';
import type { VoiceEventMap } from '../../src/modules/voice/voice.events.js';

const logger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
};

describe('platform and module-owned events', () => {
  it('defines the configuration.changed platform event payload', () => {
    const event = {
      module: 'voice',
      guildId: 'guild-1',
      key: 'voice.volume',
      oldValue: 1,
      newValue: 0.5,
      source: 'dashboard',
      timestamp: Date.now(),
    } satisfies ConfigurationChangedEvent;

    expect(event.key).toBe('voice.volume');
    expectTypeOf<EventMap['configuration.changed']>().toMatchTypeOf<ConfigurationChangedEvent>();
  });

  it('keeps core system events separate from module-owned events', () => {
    expectTypeOf<keyof CoreSystemEventMap>().toEqualTypeOf<'bot.ready' | 'bot.error' | 'system.shutdown'>();
    expectTypeOf<VoiceEventMap['voice.soundPlayed']>().toMatchTypeOf<{
      guildId: string;
      channelId: string;
      soundId: string;
      soundName: string;
    }>();
    expectTypeOf<GeneralEventMap['permission.denied']>().toMatchTypeOf<{
      userId: string;
      command: string;
      reason: string;
      requiredLevel?: number;
      userLevel?: number;
    }>();
  });

  it('keeps EventBus backward compatibility for existing events', async () => {
    const { EventBus } =
      await vi.importActual<typeof import('../../src/core/event-bus/event-bus.js')>(
        '../../src/core/event-bus/event-bus.js',
      );
    const bus = new EventBus(logger);
    const handler = vi.fn();

    bus.subscribe('permission.denied', handler);
    bus.emit('permission.denied', {
      userId: 'user-1',
      command: 'ping',
      reason: 'guildOnly',
    });

    expect(handler).toHaveBeenCalledWith({
      userId: 'user-1',
      command: 'ping',
      reason: 'guildOnly',
    });
  });

  it('allows EventBus subscribers for configuration.changed without changing runtime behavior', async () => {
    const { EventBus } =
      await vi.importActual<typeof import('../../src/core/event-bus/event-bus.js')>(
        '../../src/core/event-bus/event-bus.js',
      );
    const bus = new EventBus(logger);
    const handler = vi.fn();

    bus.subscribe('configuration.changed', handler);
    bus.emit('configuration.changed', {
      module: 'voice',
      guildId: 'guild-1',
      key: 'voice.volume',
      oldValue: 1,
      newValue: 0.5,
      source: 'bot',
      timestamp: 1,
    });

    expect(handler).toHaveBeenCalledOnce();
  });
});
