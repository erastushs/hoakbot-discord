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
      <AuthProvider initialUser={{ id: 'user-1', username: 'Admin' }}>
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
    expect(screen.getByText('Search modules and settings')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('generates sidebar navigation from manifests in priority order', () => {
    renderLayout();

    const moduleNav = screen.getByLabelText('Modules');
    const links = within(moduleNav).getAllByRole('link').map((link) => link.textContent);

    expect(links).toEqual(['Home', 'Beta', 'Alpha']);
  });
});
