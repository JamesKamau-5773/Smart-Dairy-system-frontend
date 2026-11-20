import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HerdRegistry from '../HerdRegistry';
import { shellCopy } from '../../../i18n/shell';

globalThis.React = React;
afterEach(cleanup);

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }) }));
vi.mock('../../../lib/backendApi', () => ({
  getApiErrorMessage: (_error, fallback) => fallback,
  herdApi: {
    list: vi.fn().mockResolvedValue([]),
    summary: vi.fn().mockResolvedValue({ totalCount: 0, milkingCount: 0, dryCount: 0, averageAgeMonths: null, latestCalved: null }),
  },
}));

describe('Cow Register title', () => {
  it('titles the page with the sidebar label, from the same key', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/operations/herd']}><HerdRegistry /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(shellCopy.nav.items.cowRegister);
    expect(shellCopy.nav.items.cowRegister).toBe('Cow Register');
  });
});

describe('Cow Register filters', () => {
  const renderAt = (path) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}><HerdRegistry /></MemoryRouter>
    </QueryClientProvider>,
  );
  const PANEL = 'Search and filter cows';

  it('sits in the shared panel, collapsed even with filters in the address; the sort isn’t counted', () => {
    renderAt('/operations/herd?status=Dry&sort=breed');
    const toggle = screen.getByRole('button', { name: `${PANEL} · 1 filter active` });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    const panel = screen.getByRole('region', { name: PANEL });
    expect(within(panel).getByRole('combobox', { name: 'Sort herd by' }).value).toBe('breed');
    const statuses = within(panel).getByRole('group', { name: 'Milking status' });
    expect(within(statuses).getByRole('button', { name: 'Filter by Dry status' }).getAttribute('aria-pressed')).toBe('true');

    // Reset clears the status but keeps the chosen sort.
    fireEvent.click(within(panel).getByRole('button', { name: 'Reset filters' }));
    expect(within(statuses).getByRole('button', { name: 'Filter by All status' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(panel).getByRole('combobox', { name: 'Sort herd by' }).value).toBe('breed');
    expect(within(panel).queryByRole('button', { name: 'Reset filters' })).toBeNull();
  });

  it('doesn’t count a sort on its own as a filter', () => {
    renderAt('/operations/herd?sort=status');
    expect(screen.getByRole('button', { name: PANEL })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull();
  });
});
