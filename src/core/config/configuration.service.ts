import type { IEventBus } from '../event-bus/types.js';
import type { ISettingsRegistry, SettingValidationResult } from '../settings/types.js';
import type { AppConfig } from './types.js';
import type { ConfigEntry, ConfigSetOptions, IConfigProvider } from './provider.types.js';
import type { ConfigurationHotReloadCoordinator } from './hot-reload.coordinator.js';
import { ConfigurationError } from '../errors/types.js';

const GLOBAL_GUILD_ID = '__global__';

export class ConfigurationService implements IConfigProvider {
  private readonly cache = new Map<string, unknown>();

  constructor(
    private readonly provider: IConfigProvider,
    private readonly settings: ISettingsRegistry,
    private readonly eventBus: IEventBus,
    private readonly appConfig: Readonly<AppConfig>,
    private readonly hotReload?: ConfigurationHotReloadCoordinator,
    private readonly enforceOwnership = true,
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
    if (value === undefined) return undefined;
    const validation = this.settings.validate(key, value);
    if (!validation.success) throw new ConfigurationError(validation.error ?? `Invalid persisted value for "${key}".`);
    this.cache.set(cacheKey, structuredClone(value));
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
        const validation = this.settings.validate(key, value);
        if (!validation.success) throw new ConfigurationError(validation.error ?? `Invalid persisted value for "${key}".`);
        values[key] = value as T;
        this.cache.set(this.cacheKey(key, guildId), structuredClone(value));
      }
    }

    return values;
  }

  async getDefaults(): Promise<Record<string, unknown>> {
    return this.provider.getDefaults();
  }

  validate(key: string, value: unknown, ownerId?: string): SettingValidationResult {
    const owner = this.settings.getOwner(key);
    if (this.enforceOwnership && ownerId && owner !== ownerId) {
      return { success: false, error: `Setting "${key}" is not owned by "${ownerId}".` };
    }
    return this.settings.validate(key, value);
  }

  async getOwned<T>(ownerId: string, key: string, guildId?: string): Promise<T | undefined> {
    const validation = this.validate(key, this.settings.get(key)?.defaultValue, ownerId);
    if (!validation.success) throw new Error(validation.error);
    const value = await this.get<T>(key, guildId);
    return value === undefined ? structuredClone(this.settings.get(key)?.defaultValue) as T : value;
  }

  async setOwned(ownerId: string, key: string, value: unknown, options: ConfigSetOptions = {}): Promise<void> {
    const ownership = this.validate(key, value, ownerId);
    if (!ownership.success) throw new Error(ownership.error);
    await this.set(key, value, options);
  }

  async set(key: string, value: unknown, options: ConfigSetOptions = {}): Promise<void> {
    if (!options.skipValidation) {
      const validation = this.validate(key, value);
      if (!validation.success) {
        throw new Error(validation.error ?? `Invalid value for "${key}".`);
      }
    }

    const fallbackOldValue = await this.get(key, options.guildId);
    const result = await this.provider.set(key, value, options);
    const change = result?.changes[0];
    this.afterWrite(key, change ? change.oldValue : fallbackOldValue, change?.newValue ?? value, options);
  }

  async setMany(entries: ConfigEntry[], guildId?: string, options: ConfigSetOptions = {}) {
    for (const entry of entries) {
      const validation = this.validate(entry.key, entry.value);
      if (!validation.success) {
        throw new Error(validation.error ?? `Invalid value for "${entry.key}".`);
      }
    }

    const fallbackOldValues = await this.getMany(entries.map((entry) => entry.key), guildId);
    const result = await this.provider.setMany(entries, guildId, options);

    for (const entry of entries) {
      const change = result?.changes.find((candidate) => candidate.key === entry.key);
      this.afterWrite(entry.key, change ? change.oldValue : fallbackOldValues[entry.key], change?.newValue ?? entry.value, {
        ...options,
        guildId,
        source: options.source ?? 'api',
      });
    }
    return result;
  }

  getVersion(guildId?: string): Promise<number> {
    return this.provider.getVersion?.(guildId) ?? Promise.resolve(0);
  }

  async delete(key: string, guildId?: string): Promise<boolean> {
    if (!this.provider.delete) {
      return false;
    }

    const result = await this.provider.delete(key, guildId, { guildId, source: 'api' });
    const deleted = typeof result === 'boolean' ? result : result.deleted;
    if (deleted) {
      const change = typeof result === 'boolean' ? undefined : result.changes[0];
      this.afterWrite(key, change?.oldValue, undefined, { guildId, source: 'api' });
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
    if (newValue !== undefined) this.cache.set(this.cacheKey(key, options.guildId), structuredClone(newValue));
    this.applyRuntimeValue(key, newValue);
    if (this.settings.get(key)?.secret !== true) this.settings.notifyChange(key, newValue, options.guildId ?? GLOBAL_GUILD_ID);
    this.emitChange(key, oldValue, newValue, options);
    this.hotReload?.enqueue({ ownerId: this.ownerFor(key), key, oldValue, newValue, ...(options.guildId ? { guildId: options.guildId } : {}), source: options.source ?? 'api', timestamp: Date.now() });
  }

  private emitChange(
    key: string,
    oldValue: unknown,
    newValue: unknown,
    options: Pick<ConfigSetOptions, 'guildId' | 'source'>,
  ): void {
    const secret = this.settings.get(key)?.secret === true;
    this.eventBus.emit('configuration.changed', {
      module: this.ownerFor(key),
      guildId: options.guildId,
      key,
      oldValue: secret && oldValue !== undefined ? '[REDACTED]' : oldValue,
      newValue: secret && newValue !== undefined ? '[REDACTED]' : newValue,
      source: options.source ?? 'api',
      timestamp: Date.now(),
    });
  }

  private cacheKey(key: string, guildId?: string): string {
    return `${guildId ?? GLOBAL_GUILD_ID}:${key}`;
  }

  private ownerFor(key: string): string {
    const owner = this.settings.getOwner(key);
    if (this.enforceOwnership && !owner) throw new Error(`Unknown setting key "${key}".`);
    return owner ?? 'platform';
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
