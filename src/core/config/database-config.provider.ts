import type {
  ConfigChangeHandler,
  ConfigEntry,
  ConfigSetOptions,
  IConfigProvider,
} from './provider.types.js';
import type { ISettingsRegistry } from '../settings/types.js';
import type { GuildSettingsRepository } from './guild-settings.repository.js';

const GLOBAL_GUILD_ID = '__global__';

export class DatabaseConfigProvider implements IConfigProvider {
  constructor(
    private readonly repository: GuildSettingsRepository,
    private readonly jsonProvider: IConfigProvider,
    private readonly settingsRegistry?: ISettingsRegistry,
  ) {}

  async get<T>(key: string, guildId?: string): Promise<T | undefined> {
    try {
      const databaseValue = await this.repository.loadSetting(this.resolveGuildId(guildId), key);

      if (databaseValue) {
        return databaseValue.value as T;
      }
    } catch (error) {
      throw this.wrapDatabaseError('load', key, error);
    }

    return this.getFallbackValue<T>(key, guildId);
  }

  async getMany<T>(keys: string[], guildId?: string): Promise<Record<string, T>> {
    if (keys.length === 0) {
      return {};
    }

    const resolvedGuildId = this.resolveGuildId(guildId);
    let databaseValues: Map<string, { value: unknown }>;

    try {
      databaseValues = await this.repository.bulkLoad(resolvedGuildId, keys);
    } catch (error) {
      throw this.wrapDatabaseError('bulk load', keys.join(', '), error);
    }

    const values: Record<string, T> = {};

    for (const key of keys) {
      const databaseValue = databaseValues.get(key);

      if (databaseValue) {
        values[key] = databaseValue.value as T;
        continue;
      }

      const fallbackValue = await this.getFallbackValue<T>(key, guildId);
      if (fallbackValue !== undefined) {
        values[key] = fallbackValue;
      }
    }

    return values;
  }

  async getDefaults(): Promise<Record<string, unknown>> {
    const jsonDefaults = await this.jsonProvider.getDefaults();
    const manifestDefaults = Object.fromEntries(
      this.settingsRegistry?.getAll().map((setting) => [setting.key, setting.defaultValue]) ?? [],
    );

    return {
      ...manifestDefaults,
      ...jsonDefaults,
    };
  }

  async set(key: string, value: unknown, options: ConfigSetOptions = {}): Promise<void> {
    try {
      await this.repository.saveSetting(this.resolveGuildId(options.guildId), key, value);
    } catch (error) {
      throw this.wrapDatabaseError('save', key, error);
    }
  }

  async setMany(entries: ConfigEntry[], guildId?: string): Promise<void> {
    try {
      await this.repository.bulkSave(this.resolveGuildId(guildId), entries);
    } catch (error) {
      throw this.wrapDatabaseError('bulk save', entries.map((entry) => entry.key).join(', '), error);
    }
  }

  async delete(key: string, guildId?: string): Promise<boolean> {
    try {
      return await this.repository.deleteSetting(this.resolveGuildId(guildId), key);
    } catch (error) {
      throw this.wrapDatabaseError('delete', key, error);
    }
  }

  async exists(key: string, guildId?: string): Promise<boolean> {
    try {
      const value = await this.repository.loadSetting(this.resolveGuildId(guildId), key);
      if (value !== undefined) {
        return true;
      }
    } catch (error) {
      throw this.wrapDatabaseError('existence check', key, error);
    }

    return (await this.getFallbackValue(key, guildId)) !== undefined;
  }

  watch(_key: string, _guildId: string | undefined, _handler: ConfigChangeHandler): () => void {
    return () => undefined;
  }

  private resolveGuildId(guildId?: string): string {
    return guildId ?? GLOBAL_GUILD_ID;
  }

  private async getFallbackValue<T>(key: string, guildId?: string): Promise<T | undefined> {
    const jsonValue = await this.jsonProvider.get<T>(key, guildId);
    if (jsonValue !== undefined) {
      return jsonValue;
    }

    const defaultValue = this.settingsRegistry?.get(key)?.defaultValue;
    return defaultValue === undefined ? undefined : (structuredClone(defaultValue) as T);
  }

  private wrapDatabaseError(operation: string, key: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return new Error(`DatabaseConfigProvider failed to ${operation} "${key}": ${message}`);
  }
}
