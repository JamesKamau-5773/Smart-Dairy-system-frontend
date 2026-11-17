import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TodayFeedingPage from '../TodayFeedingPage';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({ feedingToday: vi.fn(), createConsumptionEvent: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), nutritionApi: api }));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const plan = {
  date: '2026-11-03',
  groups: [
    {
      feeding_group: 'lactating', headcount: 2, mix_name: 'Lactating Dairy Meal', quantity_label: 'Concentrate',
      feeding_times_per_day: 3, daily_kg_per_head: 4, kg_per_head_per_feeding: 1.33, daily_group_batch_kg: 8,
      group_batch_per_feeding_kg: 2.67, physical_measures: { group_buckets_per_feeding: 0.44 }, active_batch_id: 41, ready: true, not_ready_reason: null,
    },
    { feeding_group: 'dry', headcount: 3, mix_name: 'Dry Cow Mix', requires_concentrate_rate: true, ready: false, not_ready_reason: 'NO_CONCENTRATE_RATE' },
  ],
  active_batches: [{ batch_id: 41, batch_name: 'Dairy Mix 2 Nov', remaining_kg: 20.5, days_until_empty: 4.6 }],
  totals: { total_active_animals: 12, total_daily_feed_kg: 87.6 },
};

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <TodayFeedingPage />
  </QueryClientProvider>,
);

describe('TodayFeedingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.feedingToday.mockResolvedValue(plan);
    api.createConsumptionEvent.mockResolvedValue({ id: 1 });
  });

  it('shows how much each ready group gets, with no prices', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Lactating cows' })).toBeTruthy();
    expect(screen.getByText('2.67 kg')).toBeTruthy();
    expect(screen.getByText('0.44 buckets')).toBeTruthy();
    expect(screen.getByText('3 feedings a day')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/KES/);
  });

  it('shows the backend totals, and "—" with "not recorded" for screen readers when it sends none', async () => {
    renderPage();
    expect(await screen.findByText(/12 animals/)).toBeTruthy();
    expect(screen.getByText(/87\.6 kg feed needed today/)).toBeTruthy();
    cleanup();

    api.feedingToday.mockResolvedValue({ ...plan, totals: { total_active_animals: null, total_daily_feed_kg: null } });
    renderPage();
    expect(await screen.findByText('Number of animals not recorded')).toBeTruthy();
    expect(screen.getByText('Feed needed today not recorded')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/0 animals|0 kg feed needed/);
  });

  it('records one feeding in one tap, on the farm’s local date', async () => {
    renderPage();
    const fed = await screen.findByRole('button', { name: 'Fed' });
    expect(screen.getByLabelText('Feed given (kg)').value).toBe('2.67');
    fireEvent.click(fed);

    await waitFor(() => expect(api.createConsumptionEvent).toHaveBeenCalledWith(41, {
      consumedWeight: 2.67,
      consumedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      feeding_group: 'lactating',
    }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2.67 kg recorded for Lactating cows.'));
  });

  it('won’t record more than is left in the batch', async () => {
    renderPage();
    const input = await screen.findByLabelText('Feed given (kg)');
    fireEvent.change(input, { target: { value: '25' } });
    expect(screen.getByRole('button', { name: 'Fed' }).disabled).toBe(true);
    expect(screen.getByText('Enter an amount between 0 and 20.5 kg.')).toBeTruthy();
  });

  it('explains a group that isn’t ready instead of showing amounts', async () => {
    renderPage();
    expect(await screen.findByText(/doesn’t have a concentrate amount per cow yet/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Fed' })).toHaveLength(1);
  });

  it('lists what’s in store', async () => {
    renderPage();
    expect(await screen.findByText('Dairy Mix 2 Nov')).toBeTruthy();
    expect(screen.getByText(/20.5 kg left · about 4.6 days/)).toBeTruthy();
  });

  it('offers a retry when the plan can’t load', async () => {
    api.feedingToday.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', isAxiosError: true }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Try again/ }));
    expect(await screen.findByRole('heading', { name: 'Lactating cows' })).toBeTruthy();
  });
});
