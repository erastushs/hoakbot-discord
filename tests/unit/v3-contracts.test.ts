import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import type { ISettingMetadata, ISettingsRegistry } from '../../src/core/settings/types.js';
import type { IModuleManifest } from '../../src/modules/manifest.types.js';

describe('v3 architecture contracts', () => {
  it('allows type-only module manifests', () => {
    const manifest = {
      id: 'hoak:general',
      name: 'General',
      description: 'General utility commands',
      icon: 'bot',
      color: '#5865F2',
      category: 'utility',
      version: '1.0.0',
      author: 'Erastus HS',
      supportsHotReload: false,
      settings: ['general.prefix'],
      permissions: ['general:use'],
      commands: ['ping'],
      events: [],
      routes: [],
      metrics: [],
      migrations: [],
      featureFlags: [],
      healthChecks: [],
      dependencies: [],
      dashboard: {
        navigation: {
          sidebarPriority: 10,
          sidebarSection: 'Utility',
          hidden: false,
        },
        homePage: {
          featured: true,
          priority: 10,
        },
        settings: {
          groups: [],
        },
      },
      tags: ['utility'],
      requiredDiscordPermissions: '',
      documentation: 'docs/modules/general.md',
    } satisfies IModuleManifest;

    expect(manifest.id).toBe('hoak:general');
    expectTypeOf(manifest).toMatchTypeOf<IModuleManifest>();
  });

  it('allows type-only setting metadata and registry contracts', () => {
    const setting = {
      key: 'general.prefix',
      label: 'Command Prefix',
      description: 'Prefix used for text commands.',
      group: 'commands',
      category: 'General',
      type: 'string',
      defaultValue: '!',
      defaultSource: 'config',
    } satisfies ISettingMetadata;

    const registry: ISettingsRegistry = {
      register: (_moduleId, _settings) => undefined,
      getAll: () => [setting],
      getByCategory: (_category) => [setting],
      getByModule: (_moduleId) => [setting],
      getModule: (_moduleId) => [setting],
      getByGroup: (_moduleId, _group) => [setting],
      get: (_key) => setting,
      validate: (_key, _value) => ({ success: true }),
      onChange: (_handler) => () => undefined,
    };

    expect(registry.get('general.prefix')).toBe(setting);
    expectTypeOf(setting).toMatchTypeOf<ISettingMetadata>();
    expectTypeOf(registry).toMatchTypeOf<ISettingsRegistry>();
  });

  it('allows type-only configuration provider contracts', async () => {
    const provider: IConfigProvider = {
      get: async <T>(_key: string, _guildId?: string): Promise<T> => '!' as T,
      getMany: async <T>(keys: string[], _guildId?: string): Promise<Record<string, T>> =>
        Object.fromEntries(keys.map((key) => [key, '!' as T])),
      getDefaults: async () => ({ 'general.prefix': '!' }),
      set: async (_key, _value, _options) => undefined,
      setMany: async (_entries, _guildId) => undefined,
      watch: (_key, _guildId, _handler) => () => undefined,
    };

    await expect(provider.get<string>('general.prefix')).resolves.toBe('!');
    expectTypeOf(provider).toMatchTypeOf<IConfigProvider>();
  });
});
