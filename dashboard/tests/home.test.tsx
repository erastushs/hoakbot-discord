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
    expect(screen.getByText('utility')).toBeInTheDocument();
    expect(screen.getByText('automation')).toBeInTheDocument();
    expect(screen.getAllByText('v1.0.0')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveAttribute('href', '/modules/module%3Aalpha');
    expect(screen.getByRole('link', { name: /Beta/ })).toHaveAttribute('href', '/modules/module%3Abeta');
  });
});
