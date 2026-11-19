import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.React = React;

const api = vi.hoisted(() => ({ listMilkDispositions: vi.fn() }));

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant-1', farmId: 'farm-1' }) }));
vi.mock('../../../lib/milkDisposition', async (importOriginal) => ({ ...(await importOriginal()), todayLocalIso: () => '2026-11-16' }));
vi.mock('../../../lib/localDate', async (importOriginal) => ({ ...(await importOriginal()), todayLocalIso: () => '2026-11-16' }));
vi.mock('../../../lib/backendApi', () => ({
  productionApi: { listMilkDispositions: api.listMilkDispositions },
  herdApi: { list: () => Promise.resolve([]) },
  getApiErrorMessage: (error) => error?.message || 'Request failed',
}));

import MilkUsage from '../MilkUsage';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.listMilkDispositions.mockResolvedValue([
    { id: 'd1', date: '2026-11-11', calfId: 9, calfName: 'Success', calfTag: 'S-009', liters: 4, notes: '' },
    { id: 'd2', date: '2026-10-02', calfId: 7, calfName: 'Baraka', calfTag: 'B-007', liters: 3, notes: '' },
  ]);
});

const renderPage = () => render(
  <MemoryRouter>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MilkUsage />
    </QueryClientProvider>
  </MemoryRouter>,
);
const PANEL = 'Filter calf feedings';
const history = () => screen.getByRole('heading', { name: 'Feeding history' }).closest('section');

describe('Milk Usage filters', () => {
  it('sits in the shared panel, collapsed, with one date-range control and no native date inputs', async () => {
    renderPage();
    const toggle = await screen.findByRole('button', { name: PANEL });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    const panel = screen.getByRole('region', { name: PANEL });
    expect(within(panel).getByRole('combobox', { name: 'Calf' })).toBeTruthy();
    expect(within(panel).getByRole('button', { name: 'Dates' })).toBeTruthy();
    expect(document.querySelector('input[type="date"]')).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Reset filters' })).toBeNull();
  });

  it('filters the feedings by calf and date range as before, and resets both', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: PANEL }));
    const panel = screen.getByRole('region', { name: PANEL });
    await waitFor(() => expect(within(history()).getByText(/^2 feedings/)).toBeTruthy());

    fireEvent.change(within(panel).getByRole('combobox', { name: 'Calf' }), { target: { value: '9' } });
    expect(within(history()).getByText(/^1 feeding ·/)).toBeTruthy();

    fireEvent.change(within(panel).getByRole('combobox', { name: 'Calf' }), { target: { value: '' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Dates' }));
    const form = await screen.findByRole('form', { name: 'Custom date range' });
    fireEvent.change(within(form).getByLabelText('From'), { target: { value: '01/10/2026' } });
    fireEvent.change(within(form).getByLabelText('To'), { target: { value: '31/10/2026' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(within(history()).getByText(/^1 feeding ·/)).toBeTruthy());
    expect(within(panel).getByRole('button', { name: '01 Oct 2026 – 31 Oct 2026' })).toBeTruthy();

    fireEvent.click(within(panel).getByRole('button', { name: 'Reset filters' }));
    expect(within(history()).getByText(/^2 feedings/)).toBeTruthy();
    expect(within(panel).getByRole('button', { name: 'Dates' })).toBeTruthy();
  });
});
