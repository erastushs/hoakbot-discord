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
  get<T>(key: string, guildId?: string): Promise<T>;
  getMany<T>(keys: string[], guildId?: string): Promise<Record<string, T>>;
  getDefaults(): Promise<Record<string, unknown>>;
  set(key: string, value: unknown, options?: ConfigSetOptions): Promise<void>;
  setMany(entries: ConfigEntry[], guildId?: string): Promise<void>;
  watch(key: string, guildId: string | undefined, handler: ConfigChangeHandler): () => void;
}
