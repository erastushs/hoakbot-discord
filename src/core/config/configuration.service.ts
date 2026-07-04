import type { IEventBus } from '../event-bus/types.js';
import type { ISettingsRegistry, SettingValidationResult } from '../settings/types.js';
import type { AppConfig } from './types.js';
import type { ConfigEntry, ConfigSetOptions, IConfigProvider } from './provider.types.js';

const GLOBAL_GUILD_ID = '__global__';

export class ConfigurationService implements IConfigProvider {
  private readonly cache = new Map<string, unknown>();

  constructor(
    private readonly provider: IConfigProvider,
    private readonly settings: ISettingsRegistry,
    private readonly eventBus: IEventBus,
    private readonly appConfig: Readonly<AppConfig>,
  ) {}

  current(): Readonly<AppConfig> {
    return this.appConfig;
  }

  async get<T>(key: string, guildId?: string): Promise<T | undefined> {
    const cacheKey = this.cacheKey(key, guildId);

    if (this.cache.has(cacheKey)) {
      return structuredClone(this.cache.get(cacheKey)) as T;
    }

    const value = await this.provider.get<T>(key, guildId);
    if (value !== undefined) {
      this.cache.set(cacheKey, structuredClone(value));
    }

    return value;
  }

  async getMany<T>(keys: string[], guildId?: string): Promise<Record<string, T>> {
    const values: Record<string, T> = {};
    const missing: string[] = [];

    for (const key of keys) {
      const cacheKey = this.cacheKey(key, guildId);
      if (this.cache.has(cacheKey)) {
        values[key] = structuredClone(this.cache.get(cacheKey)) as T;
      } else {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      const loaded = await this.provider.getMany<T>(missing, guildId);
      for (const [key, value] of Object.entries(loaded)) {
        values[key] = value as T;
        this.cache.set(this.cacheKey(key, guildId), structuredClone(value));
      }
    }

    return values;
  }

  async getDefaults(): Promise<Record<string, unknown>> {
    return this.provider.getDefaults();
  }

  validate(key: string, value: unknown): SettingValidationResult {
    return this.settings.validate(key, value);
  }

  async set(key: string, value: unknown, options: ConfigSetOptions = {}): Promise<void> {
    if (!options.skipValidation) {
      const validation = this.validate(key, value);
      if (!validation.success) {
        throw new Error(validation.error ?? `Invalid value for "${key}".`);
      }
    }

    const oldValue = await this.get(key, options.guildId);
    await this.provider.set(key, value, options);
    this.afterWrite(key, oldValue, value, options);
  }

  async setMany(entries: ConfigEntry[], guildId?: string): Promise<void> {
    for (const entry of entries) {
      const validation = this.validate(entry.key, entry.value);
      if (!validation.success) {
        throw new Error(validation.error ?? `Invalid value for "${entry.key}".`);
      }
    }

    const oldValues = await this.getMany(entries.map((entry) => entry.key), guildId);
    await this.provider.setMany(entries, guildId);

    for (const entry of entries) {
      this.afterWrite(entry.key, oldValues[entry.key], entry.value, {
        guildId,
        source: 'api',
      });
    }
  }

  async delete(key: string, guildId?: string): Promise<boolean> {
    if (!this.provider.delete) {
      return false;
    }

    const oldValue = await this.get(key, guildId);
    const deleted = await this.provider.delete(key, guildId);
    if (deleted) {
      this.invalidate(key, guildId);
      this.applyRuntimeValue(key, undefined);
      this.emitChange(key, oldValue, undefined, { guildId, source: 'api' });
    }

    return deleted;
  }

  async exists(key: string, guildId?: string): Promise<boolean> {
    if (this.cache.has(this.cacheKey(key, guildId))) {
      return true;
    }

    return this.provider.exists?.(key, guildId) ?? (await this.get(key, guildId)) !== undefined;
  }

  watch(
    key: string,
    guildId: string | undefined,
    handler: Parameters<IConfigProvider['watch']>[2],
  ): () => void {
    return this.provider.watch(key, guildId, handler);
  }

  invalidate(key: string, guildId?: string): void {
    this.cache.delete(this.cacheKey(key, guildId));
  }

  clearCache(): void {
    this.cache.clear();
  }

  private afterWrite(key: string, oldValue: unknown, newValue: unknown, options: ConfigSetOptions): void {
    this.invalidate(key, options.guildId);
    this.cache.set(this.cacheKey(key, options.guildId), structuredClone(newValue));
    this.applyRuntimeValue(key, newValue);
    this.settings.notifyChange(key, newValue, options.guildId ?? GLOBAL_GUILD_ID);
    this.emitChange(key, oldValue, newValue, options);
  }

  private emitChange(
    key: string,
    oldValue: unknown,
    newValue: unknown,
    options: Pick<ConfigSetOptions, 'guildId' | 'source'>,
  ): void {
    this.eventBus.emit('configuration.changed', {
      module: key.split('.')[0] ?? 'platform',
      guildId: options.guildId,
      key,
      oldValue,
      newValue,
      source: options.source ?? 'api',
      timestamp: Date.now(),
    });
  }

  private cacheKey(key: string, guildId?: string): string {
    return `${guildId ?? GLOBAL_GUILD_ID}:${key}`;
  }

  private applyRuntimeValue(key: string, value: unknown): void {
    const path = this.toRuntimePath(key);
    if (!path) {
      return;
    }

    let current = this.appConfig as unknown as Record<string, unknown>;
    for (const segment of path.slice(0, -1)) {
      const next = current[segment];
      if (!next || typeof next !== 'object') {
        return;
      }
      current = next as Record<string, unknown>;
    }

    current[path[path.length - 1]!] = structuredClone(value);
  }

  private toRuntimePath(key: string): string[] | undefined {
    const [moduleId, ...rest] = key.split('.');
    if (!moduleId || rest.length === 0) {
      return undefined;
    }

    if (moduleId === 'general') {
      return ['bot', ...rest];
    }

    if (moduleId === 'moderation' && rest[0] === 'roles') {
      return ['permissions', ...rest];
    }

    return ['bot', moduleId, ...rest];
  }
}
