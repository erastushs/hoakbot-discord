import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockManifests, mockSettings } from '../src/api/mock-data.js';
import { ModulePage } from '../src/modules/ModulePage.js';

describe('Voice ModulePage', () => {
  it('renders Voice settings through metadata groups and the generic renderer', () => {
    const manifest = mockManifests.find((candidate) => candidate.id === 'voice');

    render(
      <ModulePage
        manifest={manifest!}
        settings={mockSettings.filter((setting) => setting.key.startsWith('voice.'))}
        values={{ 'voice.volume': 0.8 }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Voice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Connection' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Playback' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Timing' })).toBeInTheDocument();
    expect(screen.getByText('Channel selector placeholder')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Volume/ })).toHaveValue(0.8);

    const timing = screen.getByRole('heading', { name: 'Timing' }).closest('section');
    expect(within(timing!).getByRole('spinbutton', { name: /Join Delay/ })).toHaveValue(2000);
  });
});
