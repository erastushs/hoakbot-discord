import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockManifests, mockSettings } from '../src/api/mock-data.js';
import { ModulePage } from '../src/modules/ModulePage.js';

describe('Welcome ModulePage', () => {
  it('renders Welcome settings through metadata groups and the generic renderer', () => {
    const manifest = mockManifests.find((candidate) => candidate.id === 'welcome');

    render(
      <ModulePage
        manifest={manifest!}
        settings={mockSettings.filter((setting) => setting.key.startsWith('welcome.'))}
        values={{ 'welcome.image.title': 'HELLO' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Message' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Image' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Welcome Enabled' })).toBeChecked();
    expect(screen.getByText('Channel selector placeholder')).toBeInTheDocument();

    const image = screen.getByRole('heading', { name: 'Image' }).closest('section');
    expect(within(image!).getByDisplayValue('HELLO')).toBeInTheDocument();
  });
});
