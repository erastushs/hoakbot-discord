import { describe, expect, it, vi } from 'vitest';

import { MemoryCacheProvider } from '../../src/core/cache/memory-cache.provider.js';

describe('MemoryCacheProvider', () => {
  it('stores and retrieves values', () => {
    const cache = new MemoryCacheProvider();

    cache.set('voice.volume', 1);

    expect(cache.get<number>('voice.volume')).toBe(1);
  });

  it('returns undefined for missing values', () => {
    const cache = new MemoryCacheProvider();

    expect(cache.get('missing')).toBeUndefined();
  });

  it('deletes values', () => {
    const cache = new MemoryCacheProvider();
    cache.set('prefix', 'hoak');

    expect(cache.delete('prefix')).toBe(true);
    expect(cache.get('prefix')).toBeUndefined();
  });

  it('clears all values', () => {
    const cache = new MemoryCacheProvider();
    cache.set('prefix', 'hoak');
    cache.set('voice.volume', 1);

    cache.clear();

    expect(cache.get('prefix')).toBeUndefined();
    expect(cache.get('voice.volume')).toBeUndefined();
  });

  it('expires values after ttl', () => {
    vi.useFakeTimers();
    const cache = new MemoryCacheProvider();

    cache.set('prefix', 'hoak', { ttlMs: 1000 });
    vi.advanceTimersByTime(1001);

    expect(cache.get('prefix')).toBeUndefined();
    vi.useRealTimers();
  });
});
