import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

  it('renders health and dependencies and disables active controls when disabled', () => {
    render(<ModulePage manifest={{ ...generalManifest, enabled: false, health: 'disabled', dependencies: ['platform'] }} onSave={async () => undefined} settings={settings} />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('platform')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Save changes' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
  });

  it('shows loading and error states while changing module state', async () => {
    const user = userEvent.setup();
    render(<ModulePage manifest={{ ...generalManifest, enabled: true }} onSetEnabled={async () => { throw new Error('State conflict'); }} settings={[]} />);
    await user.click(screen.getByRole('button', { name: 'Disable' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('State conflict');
  });

  it('discards dirty values when the loaded module values change', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    const { rerender } = render(
      <ModulePage
        manifest={generalManifest}
        onSave={onSave}
        settings={settings}
        values={{ 'generic.title': 'Guild One title' }}
      />,
    );

    const title = screen.getByRole('textbox', { name: /Title/ });
    await user.clear(title);
    await user.type(title, 'Unsaved Guild One title');
    expect(screen.getAllByRole('button', { name: 'Save changes' }).some((button) => !button.hasAttribute('disabled'))).toBe(true);

    rerender(
      <ModulePage
        manifest={generalManifest}
        onSave={onSave}
        settings={settings}
        values={{ 'generic.title': 'Guild Two title' }}
      />,
    );

    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Guild Two title');
    expect(screen.getAllByRole('button', { name: 'Save changes' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
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
