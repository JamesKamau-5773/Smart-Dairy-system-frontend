import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MilkHistory from '../MilkHistory';
import { animalsApi, herdApi } from '../../../lib/backendApi';

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

  it('shows the backend’s average, peak, total and milking count, not sums of the rows', async () => {
    herdApi.list.mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema' }]);
    animalsApi.get.mockResolvedValue({ id: 57, tag_number: 'KE-012', name: 'Neema' });
    animalsApi.milkHistory.mockResolvedValue({
      // Only two sessions came back on this phone; the backend's figures cover her whole history.
      sessions: [
        { date: '2026-11-07', session: 'morning', liters: 8 },
        { date: '2026-11-07', session: 'evening', liters: 6 },
      ],
      stats: { average_yield: 15.25, peak_yield: 19, total_logged: 412.5, session_count: 30 },
      animal: { id: 57, tag_number: 'KE-012', name: 'Neema' },
    });
    renderPage();

    expect(await screen.findByText('15.3 L/day')).toBeTruthy();
    expect(screen.getByText('19.0 L/day')).toBeTruthy();
    expect(screen.getByText('412.5 L')).toBeTruthy();
    expect(screen.queryByText('14.0 L')).toBeNull();
  });

  it('shows "—" when the backend sent no figures, rather than working them out', async () => {
    herdApi.list.mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema' }]);
    animalsApi.get.mockResolvedValue({ id: 57, tag_number: 'KE-012', name: 'Neema' });
    animalsApi.milkHistory.mockResolvedValue({
      sessions: [{ date: '2026-11-07', session: 'morning', liters: 8 }],
      stats: { average_yield: null, peak_yield: null, total_logged: null, session_count: null },
      animal: null,
    });
    renderPage();

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expect(screen.queryByText('8.0 L/day')).toBeNull();
  });
});
