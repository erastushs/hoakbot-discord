import type { CacheSetOptions, ICacheProvider } from './types.js';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

export class MemoryCacheProvider implements ICacheProvider {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, options: CacheSetOptions = {}): void {
    const expiresAt =
      options.ttlMs === undefined || options.ttlMs <= 0 ? undefined : Date.now() + options.ttlMs;

    this.entries.set(key, { value, expiresAt });
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt <= Date.now();
  }
}
