import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SettingsRenderer } from '../src/settings/SettingsRenderer.js';
import { settings } from './test-data.js';

describe('SettingsRenderer', () => {
  it('renders generic controls for supported setting types', () => {
    render(<SettingsRenderer settings={settings} />);

    expect(screen.getByRole('switch', { name: /Enabled/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Hello');
    expect(screen.getByRole('spinbutton', { name: /Count/ })).toHaveValue(3);
    expect(screen.getByRole('combobox', { name: /Mode/ })).toHaveValue('a');
    expect(screen.getByRole('textbox', { name: /Body/ })).toHaveValue('Body');
    expect(screen.getByRole('textbox', { name: /Channel/ })).toHaveAttribute('placeholder', 'Discord channel ID');
    expect(screen.getByRole('textbox', { name: /Role/ })).toHaveAttribute('placeholder', 'Discord role ID');
  });

  it('updates local values without module-specific logic', async () => {
    const user = userEvent.setup();
    render(<SettingsRenderer settings={settings} />);

    await user.click(screen.getByRole('switch', { name: /Enabled/ }));
    await user.clear(screen.getByRole('textbox', { name: /Title/ }));
    await user.type(screen.getByRole('textbox', { name: /Title/ }), 'Updated');
    await user.selectOptions(screen.getByRole('combobox', { name: /Mode/ }), 'b');

    expect(screen.getByRole('switch', { name: /Enabled/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Updated');
    expect(screen.getByRole('combobox', { name: /Mode/ })).toHaveValue('b');
  });
});
