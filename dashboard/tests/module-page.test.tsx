import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ModuleManifest } from '../src/contracts.js';
import { ModulePage } from '../src/modules/ModulePage.js';
import { manifests, settings } from './test-data.js';

const generalManifest: ModuleManifest = {
  id: 'general',
  name: 'General',
  description: 'General command behavior and bot presentation settings.',
  icon: 'Bot',
  color: '#2563eb',
  category: 'utility',
  version: '1.0.0',
  author: 'Test',
  supportsHotReload: false,
  dashboard: {
    navigation: { sidebarPriority: 1, sidebarSection: 'Utility' },
    homePage: { featured: true, priority: 1 },
    settings: {
      groups: [
        { key: 'general', label: 'General', order: 10 },
      ],
    },
  },
};

describe('ModulePage', () => {
  it('renders the redesigned shared module template for General', () => {
    render(
      <ModulePage
        manifest={generalManifest}
        settings={settings}
        values={{ 'generic.title': 'Updated title' }}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Access' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Updated title');
    expect(screen.getByRole('spinbutton', { name: /Count/ })).toHaveValue(3);
  });

  it('presents accessible validation without exposing security credentials', () => {
    const secureSettings: ModuleManifest = {
      ...generalManifest,
      dashboard: {
        navigation: { sidebarPriority: 1, sidebarSection: 'Utility' },
        homePage: { featured: true, priority: 1 },
        settings: { groups: [{ key: 'security', label: 'Security', order: 10 }] },
      },
    };

    render(
      <ModulePage
        manifest={secureSettings}
        settings={[{
          key: 'security.redirectUri',
          type: 'string',
          category: 'security',
          defaultValue: '',
          label: 'Redirect URI',
          description: 'Public OAuth callback address.',
          group: 'security',
        }]}
        values={{ 'security.redirectUri': '' }}
      />,
    );

    const control = screen.getByRole('textbox', { name: /Redirect URI/ });
    expect(control).toHaveAccessibleDescription('Public OAuth callback address.');
    expect(screen.queryByText(/client secret|session token|csrf token/i)).not.toBeInTheDocument();
    expect(screen.getByText('Protected configuration')).toBeInTheDocument();
  });

  it('renders non-General modules with the shared module template', () => {
    const manifest = manifests[0]!;

    render(
      <ModulePage
        manifest={manifest}
        settings={settings}
        values={{ 'generic.title': 'Updated title' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Access' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Updated title');
  });
});
