import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockManifests, mockSettings } from '../src/api/mock-data.js';
import { ModulePage } from '../src/modules/ModulePage.js';

describe('ModulePage', () => {
  it('renders General settings through metadata groups and the generic renderer', () => {
    const manifest = mockManifests.find((candidate) => candidate.id === 'general');

    render(
      <ModulePage
        manifest={manifest!}
        settings={mockSettings.filter((setting) => setting.key.startsWith('general.'))}
        values={{ 'general.prefix': '!' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Commands' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Presence' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cooldowns' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Command Prefix/ })).toHaveValue('!');
    expect(screen.getByRole('combobox', { name: /Default Language/ })).toHaveValue('en');

    const cooldowns = screen.getByRole('heading', { name: 'Cooldowns' }).closest('section');
    expect(within(cooldowns!).getByRole('spinbutton', { name: /Global Cooldown/ })).toHaveValue(1000);
  });
});
