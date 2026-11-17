import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
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
