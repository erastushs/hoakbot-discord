import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AuthGuard } from '../src/auth/AuthGuard.js';
import { AuthProvider, useAuth } from '../src/auth/AuthContext.js';
import { GuildProvider, useGuild } from '../src/guilds/GuildContext.js';
import { GuildSwitcher } from '../src/guilds/GuildSwitcher.js';
import { guilds } from './test-data.js';

function AuthProbe() {
  const auth = useAuth();
  return (
    <button onClick={() => auth.signOut()} type="button">
      {auth.authenticated ? auth.user?.username : 'signed out'}
    </button>
  );
}

function GuildProbe() {
  const { currentGuild } = useGuild();
  return <p data-testid="current-guild">{currentGuild?.name}</p>;
}

describe('authentication and guild context', () => {
  it('uses the mock auth flow and supports sign out/sign in', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={{ id: 'user-1', username: 'Admin' }}>
        <AuthGuard>
          <AuthProbe />
        </AuthGuard>
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Admin' }));

    expect(screen.getByText('Sign in to manage available guilds.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Demo Admin')).toBeInTheDocument();
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
});
