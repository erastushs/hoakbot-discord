import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockManifests, mockSettings } from '../src/api/mock-data.js';
import { ModulePage } from '../src/modules/ModulePage.js';

describe('Logging ModulePage', () => {
  it('renders Logging settings through metadata groups and the generic renderer', () => {
    const manifest = mockManifests.find((candidate) => candidate.id === 'logging');

    render(
      <ModulePage
        manifest={manifest!}
        settings={mockSettings.filter((setting) => setting.key.startsWith('logging.'))}
        values={{ 'logging.message.maxAttachmentSizeMb': 25 }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Logging' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Voice Logs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Member Logs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Message Logs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Moderation Logs' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Logging Enabled' })).toBeChecked();
    expect(screen.getAllByText('Channel selector placeholder')).toHaveLength(4);

    const message = screen.getByRole('heading', { name: 'Message Logs' }).closest('section');
    expect(within(message!).getByRole('spinbutton', { name: /Max Attachment Size/ })).toHaveValue(25);
  });
});
