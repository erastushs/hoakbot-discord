import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardHome } from '../src/home/DashboardHome.js';
import { manifests } from './test-data.js';

describe('DashboardHome', () => {
  it('renders module cards dynamically from manifests', () => {
    render(<DashboardHome manifests={manifests} />);

    expect(screen.getByRole('heading', { name: 'Dashboard Home' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByText('Restart required')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
