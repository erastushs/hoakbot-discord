import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App.js';
import type { APIResponse, ModuleManifest, SettingMetadata } from '../src/contracts.js';

const manifest: ModuleManifest = {
  id: 'module:alpha',
  name: 'Alpha',
  description: 'First generic module.',
  icon: 'Box',
  color: '#2563eb',
  category: 'utility',
  version: '1.0.0',
  author: 'Test',
  supportsHotReload: true,
  dashboard: {
    navigation: { sidebarPriority: 1, sidebarSection: 'General' },
    homePage: { featured: true, priority: 1 },
    settings: { groups: [{ key: 'general', label: 'General' }] },
  },
};

const setting: SettingMetadata = {
  key: 'generic.title',
  label: 'Title',
  description: 'Generic text.',
  group: 'general',
  category: 'General',
  type: 'string',
  defaultValue: 'Hello',
};

function jsonResponse<T>(body: APIResponse<T>, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function meResponse() {
  return jsonResponse({
    success: true,
    data: {
      authenticationState: 'authenticated',
      user: { id: 'user-1', username: 'admin', displayName: 'Admin' },
      guilds: [{ id: 'guild-1', name: 'Guild One' }],
      selectedGuild: { id: 'guild-1', name: 'Guild One' },
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.history.pushState({}, '', '/');
});

describe('App backend integration', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '');
  });

  it('loads home modules from the guild modules endpoint', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/me')) return meResponse();
      if (url.endsWith('/csrf')) return jsonResponse({ success: true, data: { csrfToken: 'csrf-token' } });
      return jsonResponse({ success: true, data: { modules: [manifest] } });
    });
    vi.stubGlobal('fetch', fetcher);
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith('/api/v1/guilds/guild-1/modules', {
      method: 'GET',
      credentials: 'include',
      headers: undefined,
      body: undefined,
    });
  });

  it('loads module metadata, loads guild values, and saves changes through PATCH', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/me')) return meResponse();
      if (url.endsWith('/csrf')) return jsonResponse({ success: true, data: { csrfToken: 'csrf-token' } });

      if (init?.method === 'PATCH') {
        return jsonResponse({
          success: true,
          data: { guildId: 'guild-1', settings: [{ key: 'generic.title', value: 'Saved title' }] },
        });
      }

      if (url.endsWith('/modules/module%3Aalpha/settings')) {
        return jsonResponse({ success: true, data: { settings: [setting] } });
      }

      if (url.endsWith('/guilds/guild-1/settings')) {
        return jsonResponse({
          success: true,
          data: { guildId: 'guild-1', settings: [{ key: 'generic.title', value: 'Backend title' }] },
        });
      }

      return jsonResponse({ success: true, data: { modules: [manifest] } });
    });
    vi.stubGlobal('fetch', fetcher);
    window.history.pushState({}, '', '/modules/module%3Aalpha');

    render(<App />);

    const title = await screen.findByRole('textbox', { name: /Title/ });
    expect(title).toHaveValue('Backend title');

    fireEvent.change(title, { target: { value: 'Saved title' } });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());

    const patchCall = fetcher.mock.calls.find(
      ([url, init]) => url === '/api/v1/guilds/guild-1/settings' && init?.method === 'PATCH',
    );
    if (!patchCall) {
      throw new Error('Expected a PATCH request to /api/v1/guilds/guild-1/settings but none was found');
    }
    expect(patchCall[0]).toBe('/api/v1/guilds/guild-1/settings');
    expect(patchCall[1]).toEqual({
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' },
      body: JSON.stringify({ settings: { 'generic.title': 'Saved title' } }),
    });
  });

  it('shows the exact fetch exception for a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
  });

  it('shows login page when there is no authenticated session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } }, false, 401),
      ),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in to Hoak Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discord Login' })).toHaveAttribute('href', '/api/v1/auth/login');
  });

  it('logs out and returns to the login page', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/me')) return meResponse();
      if (url.endsWith('/csrf')) return jsonResponse({ success: true, data: { csrfToken: 'csrf-token' } });
      if (url.endsWith('/logout')) return jsonResponse({ success: true, data: { authenticationState: 'anonymous' } });
      return jsonResponse({ success: true, data: { modules: [manifest] } });
    });
    vi.stubGlobal('fetch', fetcher);

    render(<App />);

    await screen.findByRole('heading', { name: 'Alpha' });
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in to Hoak Dashboard' })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith('/api/v1/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': 'csrf-token' },
      body: undefined,
    });
  });
});
