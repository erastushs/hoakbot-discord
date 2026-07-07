import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../src/auth/AuthContext.js';
import { GuildProvider } from '../src/guilds/GuildContext.js';
import { DashboardLayout } from '../src/layout/DashboardLayout.js';
import { ThemeProvider } from '../src/layout/ThemeProvider.js';
import { guilds, manifests } from './test-data.js';

function renderLayout() {
  render(
    <ThemeProvider>
      <AuthProvider
        initialState={{
          status: 'authenticated',
          user: { id: 'user-1', username: 'Admin' },
          guilds,
          selectedGuild: guilds[0],
        }}
      >
        <GuildProvider guilds={guilds}>
          <DashboardLayout breadcrumb={[{ label: 'Home' }]} manifests={manifests}>
            <p>Main content</p>
          </DashboardLayout>
        </GuildProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('dashboard layout and navigation', () => {
  it('renders sidebar, top navigation, breadcrumb, and main content', () => {
    renderLayout();

    expect(screen.getByText('Hoak Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Home');
    expect(screen.getByRole('button', { name: 'Search modules and settings' })).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('generates sidebar navigation from manifests in priority order', () => {
    renderLayout();

    const moduleNav = screen.getByLabelText('Modules');
    const links = within(moduleNav).getAllByRole('link').map((link) => link.textContent);

    expect(links).toEqual(['Beta', 'Alpha']);
  });

  it('defaults to dark mode and persists light mode without a refresh', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const user = userEvent.setup();
    renderLayout();

    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(storage.get('hoak-dashboard-theme')).toBe('light');
  });
});
