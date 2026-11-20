import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionDashboard from '../NutritionDashboard';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({
  feedCostEfficiency: vi.fn(), listRecipes: vi.fn(), activeBatchRoiTrendWeekly: vi.fn(), feedingToday: vi.fn(), createConsumptionEvent: vi.fn(),
}));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), nutritionApi: api }));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

function PlannerProbe() {
  const { state } = useLocation();
  return <p>Planner {state?.mixType ?? state?.draftType}</p>;
}

const renderDashboard = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/feed-nutrition']}>
      <Routes>
        <Route path="/feed-nutrition" element={<NutritionDashboard />} />
        <Route path="/feed-nutrition/mix" element={<PlannerProbe />} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

const dairyRow = {
  batchId: 41, batchName: 'Weekly dairy', mixedOn: '2026-08-28', depletedOn: null,
  ingredients: [{ ingredientId: 1, ingredientName: 'Maize germ', weight: 50, percentage: 100 }],
  consumedWeight: 49, remainingWeight: 1, dailyFeedingRateKg: 2.882, daysUntilEmpty: 0.3, rateBasis: 'recorded_events',
};

describe('NutritionDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.feedCostEfficiency.mockResolvedValue({ rows: [dairyRow] });
    api.listRecipes.mockResolvedValue([]);
    api.activeBatchRoiTrendWeekly.mockResolvedValue({ rows: [] });
    // What's in store, as the backend reports it.
    api.feedingToday.mockResolvedValue({
      groups: [],
      active_batches: [{ batch_id: 41, batch_name: 'Weekly dairy', recipe_type: 'dairy_meal', mixed_on: '2026-08-28', total_weight_kg: 50, remaining_kg: 1, daily_feeding_rate_kg: 2.882, days_until_empty: 0.3 }],
    });
  });

  it('says it couldn’t load instead of claiming nothing is in store', async () => {
    api.feedingToday.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    renderDashboard();
    const main = await screen.findByRole('region', { name: 'Main feed' });
    expect(await within(main).findByText(/Couldn’t load what’s in store/)).toBeTruthy();
    expect(within(main).queryByText('No main feed batch in store')).toBeNull();
  });

  it('shows dairy meal and main feed in separate cards', async () => {
    renderDashboard();
    const dairy = await screen.findByRole('region', { name: 'Dairy meal' });
    expect(await within(dairy).findByText('Weekly dairy')).toBeTruthy();
    expect(within(dairy).getByText(/Running low: about 0.3 days left/)).toBeTruthy();

    const main = screen.getByRole('region', { name: 'Main feed' });
    expect(await within(main).findByText('No main feed batch in store')).toBeTruthy();
  });

  it('opens the planner on the right mix type from each card', async () => {
    renderDashboard();
    const main = await screen.findByRole('region', { name: 'Main feed' });
    fireEvent.click(await within(main).findByRole('button', { name: /Mix main feed/ }));
    expect(await screen.findByText('Planner main_meal')).toBeTruthy();
  });
});
