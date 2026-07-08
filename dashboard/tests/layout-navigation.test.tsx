import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
          user: { id: 'user-1', username: 'admin', displayName: 'Admin', avatarUrl: 'https://example.com/avatar.png' },
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
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(document.querySelector('img[src="https://example.com/avatar.png"]')).toBeInTheDocument();
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Home');
    expect(screen.queryByRole('button', { name: 'Toggle theme' })).not.toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('generates sidebar navigation from manifests in priority order', () => {
    renderLayout();

    const moduleNav = screen.getByLabelText('Modules');
    const links = within(moduleNav).getAllByRole('link').map((link) => link.textContent);

    expect(links).toEqual(['Beta', 'Alpha']);
  });

  it('forces the incomplete light theme out of the product surface', () => {
    renderLayout();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
