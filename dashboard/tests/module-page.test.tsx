import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModulePage } from '../src/modules/ModulePage.js';
import { manifests, settings } from './test-data.js';

describe('ModulePage', () => {
  it('renders General settings through metadata groups and the generic renderer', () => {
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
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Updated title');
    expect(screen.getByRole('spinbutton', { name: /Count/ })).toHaveValue(3);
  });
});
