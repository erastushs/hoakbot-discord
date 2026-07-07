import { afterEach, describe, expect, it, vi } from 'vitest';

import { APIClient } from '../src/api/client.js';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('APIClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('supports typed GET, POST, PATCH, and DELETE requests', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ success: true, data: { ok: true } }));
    const client = new APIClient({ baseUrl: '/api/v1', fetcher: fetcher as unknown as typeof fetch });

    await expect(client.get<{ ok: boolean }>('/modules')).resolves.toEqual({ ok: true });
    await client.post('/modules', { name: 'demo' });
    await client.patch('/settings', { enabled: true });
    await client.delete('/settings/demo');

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/v1/modules', {
      method: 'GET',
      credentials: 'include',
      headers: undefined,
      body: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/v1/modules', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'demo' }),
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, '/api/v1/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(fetcher).toHaveBeenNthCalledWith(4, '/api/v1/settings/demo', {
      method: 'DELETE',
      credentials: 'include',
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

  it('uses VITE_API_BASE_URL when no explicit base URL is provided', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000/api/v1');
    const fetcher = vi.fn(async () => jsonResponse({ success: true, data: { ok: true } }));
    const client = new APIClient({ fetcher: fetcher as unknown as typeof fetch });

    await client.get('/modules');

    expect(fetcher).toHaveBeenCalledWith('http://localhost:3000/api/v1/modules', {
      method: 'GET',
      credentials: 'include',
      headers: undefined,
      body: undefined,
    });
  });

  it('binds the default global fetch before storing it', async () => {
    const fetcher = vi.fn(function (this: unknown) {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }

      return Promise.resolve(jsonResponse({ success: true, data: { ok: true } }));
    });
    vi.stubGlobal('fetch', fetcher);
    const client = new APIClient({ baseUrl: '/api/v1' });

    await expect(client.get('/modules')).resolves.toEqual({ ok: true });

    expect(fetcher).toHaveBeenCalledWith('/api/v1/modules', {
      method: 'GET',
      credentials: 'include',
      headers: undefined,
      body: undefined,
    });
  });

  it('falls back to /api/v1 when VITE_API_BASE_URL is not provided', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetcher = vi.fn(async () => jsonResponse({ success: true, data: { ok: true } }));
    const client = new APIClient({ fetcher: fetcher as unknown as typeof fetch });

    await client.get('/modules');

    expect(fetcher).toHaveBeenCalledWith('/api/v1/modules', {
      method: 'GET',
      credentials: 'include',
      headers: undefined,
      body: undefined,
    });
  });

  it('loads current session and logs out', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/me')) {
        return jsonResponse({ success: true, data: { authenticationState: 'authenticated', guilds: [] } });
      }

      return jsonResponse({ success: true, data: { authenticationState: 'anonymous' } });
    });
    const client = new APIClient({ baseUrl: '/api/v1', fetcher: fetcher as unknown as typeof fetch });

    await client.getMe();
    await client.logout();

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/v1/me', {
      method: 'GET',
      credentials: 'include',
      headers: undefined,
      body: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/v1/logout', {
      method: 'POST',
      credentials: 'include',
      headers: undefined,
      body: undefined,
    });
  });
});
