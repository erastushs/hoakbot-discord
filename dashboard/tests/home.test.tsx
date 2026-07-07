import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardHome } from '../src/home/DashboardHome.js';
import { manifests } from './test-data.js';

describe('DashboardHome', () => {
  it('renders the redesigned dashboard sections and module cards dynamically from manifests', () => {
    render(<DashboardHome manifests={manifests} />);

    expect(screen.getByRole('heading', { name: 'Dashboard Home' })).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Modules Enabled')).toBeInTheDocument();
    expect(screen.getByText('Configured Modules')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quick Actions' })).toBeInTheDocument();
    expect(screen.getByText('Configure Voice')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Module Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent Activity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'System Health' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByText('utility')).toBeInTheDocument();
    expect(screen.getByText('automation')).toBeInTheDocument();
    expect(screen.getAllByText('v1.0.0')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Configure' })).toHaveLength(2);
  });

  it('shows an empty state when module metadata is unavailable', () => {
    render(<DashboardHome manifests={[]} />);

    expect(screen.getByText('No modules available')).toBeInTheDocument();
    expect(screen.getByText('Refresh modules')).toBeInTheDocument();
  });
});
