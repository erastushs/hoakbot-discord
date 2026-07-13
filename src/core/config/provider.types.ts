export interface ConfigEntry {
  key: string;
  value: unknown;
}

export type ConfigChangeSource = 'api' | 'cli' | 'bot' | 'file';

export interface ConfigSetOptions {
  guildId?: string;
  changedBy?: string;
  source?: ConfigChangeSource;
  skipValidation?: boolean;
  skipAudit?: boolean;
  expectedVersion?: number;
}

export interface ConfigWriteChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ConfigWriteResult {
  version: number;
  changes: ConfigWriteChange[];
}

export interface ConfigDeleteResult extends ConfigWriteResult {
  deleted: boolean;
}

export class ConfigVersionConflictError extends Error {
  constructor(readonly expectedVersion: number, readonly currentVersion: number) {
    super(`Configuration version conflict: expected ${expectedVersion}, current ${currentVersion}.`);
    this.name = 'ConfigVersionConflictError';
  }
}

export interface ConfigChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  guildId?: string;
  changedBy?: string;
  source: ConfigChangeSource;
  timestamp: number;
}

export type ConfigChangeHandler = (change: ConfigChangeEvent) => void;

export interface IConfigProvider {
  get<T>(key: string, guildId?: string): Promise<T | undefined>;
  getMany<T>(keys: string[], guildId?: string): Promise<Record<string, T>>;
  getDefaults(): Promise<Record<string, unknown>>;
  set(key: string, value: unknown, options?: ConfigSetOptions): Promise<ConfigWriteResult | void>;
  setMany(entries: ConfigEntry[], guildId?: string, options?: ConfigSetOptions): Promise<ConfigWriteResult | void>;
  getVersion?(guildId?: string): Promise<number>;
  delete?(key: string, guildId?: string, options?: ConfigSetOptions): Promise<ConfigDeleteResult | boolean>;
  exists?(key: string, guildId?: string): Promise<boolean>;
  watch(key: string, guildId: string | undefined, handler: ConfigChangeHandler): () => void;
}
