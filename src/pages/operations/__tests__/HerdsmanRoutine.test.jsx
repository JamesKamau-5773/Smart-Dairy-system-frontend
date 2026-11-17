import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HerdsmanView from '../HerdsmanView';
import { normalizeRoutinePlan, routineApi } from '../../../lib/backendApi';

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: 'FARMER' } }) }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({
  ...(await importOriginal()),
  routineApi: { listPlans: vi.fn(), savePlans: vi.fn() },
}));

const renderView = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><HerdsmanView /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(cleanup);

describe('Farm Task View: today’s plan', () => {
  it('shows the routine the manager saved on the backend, not this phone’s old copy', async () => {
    localStorage.setItem('operations_schedule_planner', JSON.stringify([{ id: 'old', title: 'Old local plan', time: '06:00', checklist: 'x' }]));
    routineApi.listPlans.mockResolvedValue([
      normalizeRoutinePlan({ id: 1, task_title: 'Morning milking', start_time: '05:00:00', end_time: '07:00:00', notes: 'Wash udders\nStrip test' }),
    ]);
    renderView();

    // Wait for the backend routine itself: "Morning milking" is also the current-shift label.
    expect(await screen.findByText('Strip test')).toBeTruthy();
    expect(screen.getAllByText('Morning milking').length).toBeGreaterThan(1);
    expect(screen.queryByText('Old local plan')).toBeNull();
  });

  it('says the routine couldn’t load instead of "no routine"', async () => {
    routineApi.listPlans.mockRejectedValue(Object.assign(new Error('HTTP 503'), { response: { status: 503, data: {} } }));
    renderView();

    expect(await screen.findByText('Couldn’t load routine tasks.')).toBeTruthy();
    expect(screen.queryByText(/No routine has been set yet/)).toBeNull();
  });

  it('says no routine is set only once the backend answers with none', async () => {
    routineApi.listPlans.mockResolvedValue([]);
    renderView();
    expect(await screen.findByText(/No routine has been set yet/)).toBeTruthy();
  });
});
