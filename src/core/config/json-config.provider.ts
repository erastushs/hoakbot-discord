import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  ConfigChangeHandler,
  ConfigEntry,
  ConfigSetOptions,
  IConfigProvider,
} from './provider.types.js';

export class JsonConfigProvider implements IConfigProvider {
  private readonly configPath: string;
  private config: Record<string, unknown> | null = null;

  constructor(configPath = resolve('config', 'bot.json')) {
    this.configPath = configPath;
  }

  async get<T>(key: string, _guildId?: string): Promise<T | undefined> {
    const value = this.readPath(key);

    if (value === undefined) {
      return undefined;
    }

    return this.clone(value) as T;
  }

  async getMany<T>(keys: string[], guildId?: string): Promise<Record<string, T>> {
    const values: Record<string, T> = {};

    for (const key of keys) {
      const value = await this.get<T>(key, guildId);

      if (value !== undefined) {
        values[key] = value;
      }
    }

    return values;
  }

  async getDefaults(): Promise<Record<string, unknown>> {
    return this.clone(this.load());
  }

  async set(_key: string, _value: unknown, _options?: ConfigSetOptions): Promise<void> {
    throw new Error('JsonConfigProvider is read-only in Milestone 2.');
  }

  async setMany(_entries: ConfigEntry[], _guildId?: string): Promise<void> {
    throw new Error('JsonConfigProvider is read-only in Milestone 2.');
  }

  async delete(_key: string, _guildId?: string): Promise<boolean> {
    throw new Error('JsonConfigProvider is read-only in Milestone 2.');
  }

  async exists(key: string, _guildId?: string): Promise<boolean> {
    return this.readPath(key) !== undefined;
  }

  watch(_key: string, _guildId: string | undefined, _handler: ConfigChangeHandler): () => void {
    return () => undefined;
  }

  private readPath(key: string): unknown {
    if (!key) {
      throw new Error('JsonConfigProvider requires a non-empty config key.');
    }

    return key.split('.').reduce<unknown>((current, segment) => {
      if (current === undefined || current === null || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, this.load());
  }

  private load(): Record<string, unknown> {
    if (this.config) {
      return this.config;
    }

    const raw = readFileSync(this.configPath, 'utf-8');
    this.config = JSON.parse(raw) as Record<string, unknown>;
    return this.config;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
