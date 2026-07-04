import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockManifests, mockSettings } from '../src/api/mock-data.js';
import { ModulePage } from '../src/modules/ModulePage.js';

describe('Goodbye ModulePage', () => {
  it('renders Goodbye settings through metadata groups and the generic renderer', () => {
    const manifest = mockManifests.find((candidate) => candidate.id === 'goodbye');

    render(
      <ModulePage
        manifest={manifest!}
        settings={mockSettings.filter((setting) => setting.key.startsWith('goodbye.'))}
        values={{ 'goodbye.image.title': 'SEE YOU' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Goodbye' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Image' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Goodbye Enabled' })).toBeChecked();
    expect(screen.getByText('Channel selector placeholder')).toBeInTheDocument();

    const image = screen.getByRole('heading', { name: 'Image' }).closest('section');
    expect(within(image!).getByDisplayValue('SEE YOU')).toBeInTheDocument();
  });
});
