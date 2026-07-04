import { render, screen, waitFor } from '@testing-library/react';
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
    const fetcher = vi.fn(async () => jsonResponse({ success: true, data: { modules: [manifest] } }));
    vi.stubGlobal('fetch', fetcher);
    window.history.pushState({}, '', '/?guildId=guild-1');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith('/api/v1/guilds/guild-1/modules', {
      method: 'GET',
      headers: undefined,
      body: undefined,
    });
  });

  it('loads module metadata, loads guild values, and saves changes through PATCH', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
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
    window.history.pushState({}, '', '/modules/module%3Aalpha?guildId=guild-1');

    render(<App />);

    const title = await screen.findByRole('textbox', { name: /Title/ });
    expect(title).toHaveValue('Backend title');

    await user.clear(title);
    await user.type(title, 'Saved title');
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
      headers: { 'Content-Type': 'application/json' },
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
    window.history.pushState({}, '', '/?guildId=guild-1');

    render(<App />);

    expect(await screen.findByText('Failed to fetch (NETWORK_ERROR)')).toBeInTheDocument();
  });
});
