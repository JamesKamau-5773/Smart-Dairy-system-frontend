import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MilkHistory from '../MilkHistory';
import { herdApi } from '../../../lib/backendApi';

void React;
afterEach(cleanup);

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({
  ...(await importOriginal()),
  herdApi: { list: vi.fn() },
  animalsApi: { get: vi.fn(), milkHistory: vi.fn() },
}));

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/operations/animal/KE-012/milk-history']}>
      <Routes><Route path="/operations/animal/:id/milk-history" element={<MilkHistory />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('milk history load states', () => {
  it('shows placeholders, not "Unknown Cow" or zero totals, while loading', () => {
    herdApi.list.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Unknown Cow')).toBeNull();
    expect(screen.queryByText(/Loading milk history/)).toBeNull();
  });

  it('explains a failed load with a retry button', async () => {
    herdApi.list.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', isAxiosError: true }));
    renderPage();
    expect(await screen.findByText('Couldn’t load this cow’s milk history.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });
});
