import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import type { ISettingMetadata } from '../../src/core/settings/types.js';

function setting(overrides: Partial<ISettingMetadata> = {}): ISettingMetadata {
  return {
    key: 'voice.volume',
    label: 'Volume',
    description: 'Playback volume.',
    group: 'audio',
    category: 'Voice',
    type: 'number',
    defaultValue: 1,
    ...overrides,
  };
}

describe('SettingsRegistry', () => {
  it('registers and looks up settings by key and module', () => {
    const registry = new SettingsRegistry();
    const metadata = setting();

    registry.register('voice', [metadata]);

    expect(registry.get('voice.volume')).toBe(metadata);
    expect(registry.getModule('voice')).toEqual([metadata]);
    expect(registry.getByModule('voice')).toEqual([metadata]);
    expect(registry.getByGroup('voice', 'audio')).toEqual([metadata]);
    expect(registry.getByCategory('Voice')).toEqual([metadata]);
    expect(registry.getAll()).toEqual([metadata]);
  });

  it('rejects duplicate setting keys', () => {
    const registry = new SettingsRegistry();

    expect(() => registry.register('voice', [setting(), setting()])).toThrow(
      'Duplicate setting key "voice.volume" registered by module "voice".',
    );
  });

  it('rejects setting keys outside the module namespace', () => {
    const registry = new SettingsRegistry();

    expect(() => registry.register('voice', [setting({ key: 'general.prefix' })])).toThrow(
      'Setting key "general.prefix" must be namespaced with module id "voice".',
    );
  });

  it('validates values with setting metadata schemas', () => {
    const registry = new SettingsRegistry();
    registry.register('voice', [setting({ validation: z.number().min(0).max(2) })]);

    expect(registry.validate('voice.volume', 1)).toEqual({ success: true });
    expect(registry.validate('voice.volume', 3)).toEqual({
      success: false,
      error: 'Number must be less than or equal to 2',
    });
  });

  it('reports unknown setting keys during validation', () => {
    const registry = new SettingsRegistry();

    expect(registry.validate('voice.volume', 1)).toEqual({
      success: false,
      error: 'Unknown setting key "voice.volume".',
    });
  });

  it('supports change handlers without wiring runtime behavior', () => {
    const registry = new SettingsRegistry();
    const handler = vi.fn();
    const unsubscribe = registry.onChange(handler);

    registry.notifyChange('voice.volume', 1, 'guild-id');
    unsubscribe();
    registry.notifyChange('voice.volume', 2, 'guild-id');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('voice.volume', 1, 'guild-id');
  });
});
