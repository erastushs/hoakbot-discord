import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockManifests, mockSettings } from '../src/api/mock-data.js';
import { ModulePage } from '../src/modules/ModulePage.js';

describe('Moderation ModulePage', () => {
  it('renders Moderation settings through metadata groups and the generic renderer', () => {
    const manifest = mockManifests.find((candidate) => candidate.id === 'moderation');

    render(
      <ModulePage
        manifest={manifest!}
        settings={mockSettings.filter((setting) => setting.category === 'Moderation')}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Moderation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument();
    expect(screen.getAllByText('Role selector placeholder')).toHaveLength(3);
  });
});
