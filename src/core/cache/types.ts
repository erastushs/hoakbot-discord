export interface CacheSetOptions {
  ttlMs?: number;
}

export interface ICacheProvider {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, options?: CacheSetOptions): void;
  delete(key: string): boolean;
  clear(): void;
}
