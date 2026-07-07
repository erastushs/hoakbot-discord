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
  it('renders the redesigned General module template for the General module only', () => {
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
    expect(screen.getByRole('heading', { name: 'Permissions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Danger Zone' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Updated title');
    expect(screen.getByRole('spinbutton', { name: /Count/ })).toHaveValue(3);
  });

  it('keeps non-General modules on the existing generic renderer', () => {
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
    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Danger Zone' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Updated title');
  });
});
