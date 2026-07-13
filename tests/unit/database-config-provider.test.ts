import { describe, expect, it, vi } from 'vitest';

import { DatabaseConfigProvider } from '../../src/core/config/database-config.provider.js';
import type { GuildSettingsRepository } from '../../src/core/config/guild-settings.repository.js';
import type { IConfigProvider } from '../../src/core/config/provider.types.js';
import type { ISettingsRegistry } from '../../src/core/settings/types.js';

function createRepository(overrides: Partial<GuildSettingsRepository> = {}): GuildSettingsRepository {
  return {
    loadSetting: vi.fn(async () => undefined),
    saveSetting: vi.fn(async () => undefined),
    deleteSetting: vi.fn(async () => false),
    bulkLoad: vi.fn(async () => new Map()),
    bulkSave: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as GuildSettingsRepository;
}

function createJsonProvider(values: Record<string, unknown> = {}): IConfigProvider {
  return {
    get: vi.fn(async <T>(key: string): Promise<T | undefined> => values[key] as T | undefined),
    getMany: vi.fn(async () => ({})),
    getDefaults: vi.fn(async () => values),
    set: vi.fn(async () => undefined),
    setMany: vi.fn(async () => undefined),
    delete: vi.fn(async () => false),
    exists: vi.fn(async (key: string) => values[key] !== undefined),
    watch: vi.fn(() => () => undefined),
  };
}

function createSettingsRegistry(defaults: Record<string, unknown> = {}): ISettingsRegistry {
  const settings = Object.entries(defaults).map(([key, defaultValue]) => ({
    key,
    label: key,
    description: key,
    group: 'defaults',
    category: 'Defaults',
    type: 'string' as const,
    defaultValue,
  }));

  return {
    register: vi.fn(),
    getAll: vi.fn(() => settings),
    getByCategory: vi.fn(() => settings),
    getByModule: vi.fn(() => settings),
    getModule: vi.fn(() => settings),
    getByGroup: vi.fn(() => settings),
    get: vi.fn((key: string) => settings.find((setting) => setting.key === key)),
    validate: vi.fn(() => ({ success: true })),
    onChange: vi.fn(() => () => undefined),
  };
}

describe('DatabaseConfigProvider', () => {
  it('returns database values before fallbacks', async () => {
    const repository = createRepository({
      loadSetting: vi.fn(async () => ({
        guildId: 'guild-1',
        key: 'voice.volume',
        value: 2,
        updatedAt: new Date(),
      })),
    });
    const provider = new DatabaseConfigProvider(
      repository,
      createJsonProvider({ 'voice.volume': 1 }),
      createSettingsRegistry({ 'voice.volume': 0.5 }),
    );

    await expect(provider.get<number>('voice.volume', 'guild-1')).resolves.toBe(2);
  });

  it('falls back to JsonConfigProvider on database miss', async () => {
    const provider = new DatabaseConfigProvider(
      createRepository(),
      createJsonProvider({ 'voice.volume': 1 }),
      createSettingsRegistry({ 'voice.volume': 0.5 }),
    );

    await expect(provider.get<number>('voice.volume', 'guild-1')).resolves.toBe(1);
  });

  it('falls back to manifest defaults on database and json miss', async () => {
    const provider = new DatabaseConfigProvider(
      createRepository(),
      createJsonProvider(),
      createSettingsRegistry({ 'voice.volume': 0.5 }),
    );

    await expect(provider.get<number>('voice.volume', 'guild-1')).resolves.toBe(0.5);
  });

  it('returns undefined when the full fallback chain misses', async () => {
    const provider = new DatabaseConfigProvider(
      createRepository(),
      createJsonProvider(),
      createSettingsRegistry(),
    );

    await expect(provider.get('voice.volume', 'guild-1')).resolves.toBeUndefined();
  });

  it('writes and overwrites settings through the repository', async () => {
    const repository = createRepository();
    const provider = new DatabaseConfigProvider(repository, createJsonProvider());

    await provider.set('voice.volume', 1, { guildId: 'guild-1' });
    await provider.set('voice.volume', 2, { guildId: 'guild-1' });

    expect(repository.saveSetting).toHaveBeenCalledTimes(2);
    expect(repository.saveSetting).toHaveBeenNthCalledWith(1, 'guild-1', 'voice.volume', 1, { guildId: 'guild-1' });
    expect(repository.saveSetting).toHaveBeenNthCalledWith(2, 'guild-1', 'voice.volume', 2, { guildId: 'guild-1' });
  });

  it('deletes settings through the repository', async () => {
    const repository = createRepository({
      deleteSetting: vi.fn(async () => true),
    });
    const provider = new DatabaseConfigProvider(repository, createJsonProvider());

    await expect(provider.delete('voice.volume', 'guild-1')).resolves.toBe(true);
  });

  it('checks existence across database, json, and manifest defaults', async () => {
    const databaseProvider = new DatabaseConfigProvider(
      createRepository({
        loadSetting: vi.fn(async () => ({
          guildId: 'guild-1',
          key: 'voice.volume',
          value: 1,
          updatedAt: new Date(),
        })),
      }),
      createJsonProvider(),
    );
    const jsonProvider = new DatabaseConfigProvider(
      createRepository(),
      createJsonProvider({ 'voice.volume': 1 }),
    );
    const defaultProvider = new DatabaseConfigProvider(
      createRepository(),
      createJsonProvider(),
      createSettingsRegistry({ 'voice.volume': 1 }),
    );

    await expect(databaseProvider.exists('voice.volume', 'guild-1')).resolves.toBe(true);
    await expect(jsonProvider.exists('voice.volume', 'guild-1')).resolves.toBe(true);
    await expect(defaultProvider.exists('voice.volume', 'guild-1')).resolves.toBe(true);
  });

  it('bulk loads database values and fallback values', async () => {
    const repository = createRepository({
      bulkLoad: vi.fn(
        async () =>
          new Map([
            [
              'voice.volume',
              {
                guildId: 'guild-1',
                key: 'voice.volume',
                value: 2,
                updatedAt: new Date(),
              },
            ],
          ]),
      ),
    });
    const provider = new DatabaseConfigProvider(
      repository,
      createJsonProvider({ 'general.prefix': 'hoak' }),
    );

    await expect(provider.getMany(['voice.volume', 'general.prefix'], 'guild-1')).resolves.toEqual({
      'voice.volume': 2,
      'general.prefix': 'hoak',
    });
    expect(repository.bulkLoad).toHaveBeenCalledWith('guild-1', [
      'voice.volume',
      'general.prefix',
    ]);
  });

  it('throws descriptive errors on database failures', async () => {
    const provider = new DatabaseConfigProvider(
      createRepository({
        loadSetting: vi.fn(async () => {
          throw new Error('connection lost');
        }),
      }),
      createJsonProvider({ 'voice.volume': 1 }),
    );

    await expect(provider.get('voice.volume', 'guild-1')).rejects.toThrow(
      'DatabaseConfigProvider failed to load "voice.volume": connection lost',
    );
  });
});
