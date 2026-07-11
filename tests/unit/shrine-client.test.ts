import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShrineClient } from '../../src/modules/shrine/services/shrine.client.js';

const logger = { debug: vi.fn(), warn: vi.fn() };

function createClient(retries = 0) {
  return new ShrineClient(
    {
      baseUrl: 'https://api.nightlight.gg/v1',
      retries,
      retryDelayMs: 1,
      timeoutMs: 1000,
    },
    logger,
  );
}

function validResponse() {
  return {
    status: 'success',
    error: null,
    data: validShrinePayload(),
  };
}

function validShrinePayload() {
  return {
    start: '2026-07-10T15:00:00',
    end: '2026-07-11T14:59:59',
    week: 605,
    perks: [
      {
        id: 190,
        bloodpoints: 100000,
        shards: 1500,
        name: 'Scourge Hook: Pain Resonance',
        image: 'perks/scourge-hook-pain-resonance.png',
        character: 'The Artist',
        usage_tier: 'veryhigh',
      },
    ],
  };
}

describe('ShrineClient', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('fetches and maps Shrine rotations from NightLight', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => validResponse() })));

    const shrine = await createClient().fetchShrine();

    expect(fetch).toHaveBeenCalledWith('https://api.nightlight.gg/v1/shrine', expect.any(Object));
    expect(logger.debug).toHaveBeenCalledWith(
      { status: 200, raw: validResponse() },
      'NightLight Shrine raw response',
    );
    expect(shrine.week).toBe(605);
    expect(shrine.perks[0]).toMatchObject({
      name: 'Scourge Hook: Pain Resonance',
      character: 'The Artist',
      shards: 1500,
      usageTier: 'veryhigh',
    });
  });

  it('rejects invalid responses gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ week: 605 }) })));

    await expect(createClient().fetchShrine()).rejects.toThrow('Invalid NightLight Shrine response');
  });

  it('rejects non-success API statuses gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'error', error: 'unavailable', data: validShrinePayload() }),
    })));

    await expect(createClient().fetchShrine()).rejects.toThrow('Invalid NightLight Shrine response');
  });

  it('rejects missing data gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', error: null }),
    })));

    await expect(createClient().fetchShrine()).rejects.toThrow('Invalid NightLight Shrine response');
  });

  it('rejects malformed wrapped data gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', error: null, data: { week: 605 } }),
    })));

    await expect(createClient().fetchShrine()).rejects.toThrow('Invalid NightLight Shrine response');
  });

  it('retries transient request failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => validResponse() });
    vi.stubGlobal('fetch', fetchMock);

    const shrine = await createClient(1).fetchShrine();

    expect(shrine.week).toBe(605);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, nextAttempt: 2 }), expect.any(String));
  });
});
