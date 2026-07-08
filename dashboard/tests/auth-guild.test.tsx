import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthGuard } from '../src/auth/AuthGuard.js';
import { AuthProvider, useAuth } from '../src/auth/AuthContext.js';
import { APIClient } from '../src/api/client.js';
import { GuildProvider, useGuild } from '../src/guilds/GuildContext.js';
import { GuildSwitcher } from '../src/guilds/GuildSwitcher.js';
import { guilds } from './test-data.js';

function AuthProbe() {
  const auth = useAuth();
  return (
    <button onClick={() => void auth.signOut()} type="button">
      {auth.authenticated ? (auth.user?.displayName ?? auth.user?.username) : auth.status}
    </button>
  );
}

function api(fetcher: typeof fetch) {
  return new APIClient({ baseUrl: '/api/v1', fetcher });
}

function GuildProbe() {
  const { currentGuild } = useGuild();
  return <p data-testid="current-guild">{currentGuild?.name}</p>;
}

describe('authentication and guild context', () => {
  it('bootstraps authenticated session state from /me', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/csrf')) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: { csrfToken: 'csrf-token' } }) } as Response;
      }

      if (url.endsWith('/logout')) {
        return { ok: true, status: 200, json: async () => ({ success: true, data: { authenticationState: 'anonymous' } }) } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            authenticationState: 'authenticated',
            user: { id: 'user-1', username: 'admin', displayName: 'Admin' },
            guilds: [{ id: 'guild-1', name: 'Guild One' }],
          },
        }),
      } as Response;
    });

    render(
      <AuthProvider api={api(fetcher as unknown as typeof fetch)}>
        <AuthGuard>
          <AuthProbe />
        </AuthGuard>
      </AuthProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Admin' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Admin' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manage Hoak Bot with confidence' })).toBeInTheDocument());
  });

  it('shows unauthenticated login state', async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } }),
    })) as unknown as typeof fetch;

    render(
      <AuthProvider api={api(fetcher)}>
        <AuthGuard>
          <p>hidden dashboard</p>
        </AuthGuard>
      </AuthProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Manage Hoak Bot with confidence' })).toBeInTheDocument();
    expect(screen.queryByText('hidden dashboard')).not.toBeInTheDocument();
  });

  it('provides current guild and switches guild context', async () => {
    const user = userEvent.setup();
    render(
      <GuildProvider guilds={guilds}>
        <GuildSwitcher />
        <GuildProbe />
      </GuildProvider>,
    );

    expect(screen.getByTestId('current-guild')).toHaveTextContent('Guild One');

    await user.selectOptions(screen.getByLabelText('Current guild'), 'guild-2');

    expect(screen.getByTestId('current-guild')).toHaveTextContent('Guild Two');
  });

  it('shows the current guild name and icon from metadata', () => {
    render(
      <GuildProvider guilds={[{ id: 'guild-1', name: 'Guild One', iconUrl: 'https://example.com/icon.png' }]}>
        <GuildSwitcher />
      </GuildProvider>,
    );

    expect(screen.getByLabelText('Current guild')).toHaveTextContent('Guild One');
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('removes dropdown affordance when only one guild exists', () => {
    render(
      <GuildProvider guilds={[{ id: 'guild-1', name: 'Guild One' }]}>
        <GuildSwitcher />
      </GuildProvider>,
    );

    expect(screen.queryByRole('combobox', { name: 'Current guild' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Current guild')).toHaveTextContent('Guild One');
  });
});
