import { describe, expect, it, vi } from 'vitest';

import { APIClient } from '../src/api/client.js';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('APIClient', () => {
  it('supports typed GET, POST, PATCH, and DELETE requests', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ success: true, data: { ok: true } }));
    const client = new APIClient({ baseUrl: '/api/v1', fetcher: fetcher as unknown as typeof fetch });

    await expect(client.get<{ ok: boolean }>('/modules')).resolves.toEqual({ ok: true });
    await client.post('/modules', { name: 'demo' });
    await client.patch('/settings', { enabled: true });
    await client.delete('/settings/demo');

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/v1/modules', { method: 'GET', headers: undefined, body: undefined });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/v1/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'demo' }),
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, '/api/v1/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(fetcher).toHaveBeenNthCalledWith(4, '/api/v1/settings/demo', {
      method: 'DELETE',
      headers: undefined,
      body: undefined,
    });
  });

  it('centralizes API errors', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ success: false, error: { code: 'FORBIDDEN', message: 'No access' } }, false, 403),
    );
    const client = new APIClient({ fetcher: fetcher as unknown as typeof fetch });

    await expect(client.get('/private')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
      message: 'No access',
    });
  });
});
