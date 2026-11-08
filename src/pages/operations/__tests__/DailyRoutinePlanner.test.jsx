import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DailyRoutinePlanner from '../DailyRoutinePlanner';
import { normalizeRoutinePlan, routineApi } from '../../../lib/backendApi';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tnt_riftvalley_01', farmId: 'frm_rvd_main' }),
}));

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    routineApi: { listPlans: vi.fn(), savePlans: vi.fn() },
  };
});

// As GET /routine/plans returns them, normalized the way routineApi.listPlans does.
const BACKEND_PLANS = [
  { id: 1, task_title: 'Morning milking', start_time: '05:00:00', end_time: '07:00:00', notes: 'Wash udders\nStrip test', display_order: 0, is_active: true },
  { id: 2, task_title: 'Feeding', start_time: '07:30:00', end_time: '08:30:00', notes: null, checklist_items: [], display_order: 1, is_active: true },
].map(normalizeRoutinePlan);

const renderPlanner = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <DailyRoutinePlanner />
  </QueryClientProvider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(cleanup);

describe('DailyRoutinePlanner', () => {
  it('shows a skeleton, not "no routine", while the routine loads', () => {
    routineApi.listPlans.mockReturnValue(new Promise(() => {}));
    renderPlanner();

    expect(screen.getByText('Daily Routine Planner')).toBeTruthy();
    expect(screen.queryByText(/No daily routine is set up/)).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('says it couldn’t load, with Try again, instead of showing an empty routine', async () => {
    routineApi.listPlans.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 503, data: {} } }));
    renderPlanner();

    expect(await screen.findByText('Couldn’t load routine tasks.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeTruthy();
    expect(screen.queryByText(/No daily routine is set up/)).toBeNull();
  });

  it('shows the empty state only once the backend answers with no routine', async () => {
    routineApi.listPlans.mockResolvedValue([]);
    renderPlanner();

    expect(await screen.findByText(/No daily routine is set up for this farm yet/)).toBeTruthy();
  });

  it('never starts from the old unscoped localStorage schedule', async () => {
    localStorage.setItem('operations_schedule_planner', JSON.stringify([{ id: 'x', title: 'Stale local task', time: '06:00', checklist: '' }]));
    routineApi.listPlans.mockResolvedValue(BACKEND_PLANS);
    renderPlanner();

    expect(await screen.findByRole('button', { name: /Morning milking/ })).toBeTruthy();
    expect(screen.queryByText('Stale local task')).toBeNull();
  });

  it('shows the backend’s time blocks with their times', async () => {
    routineApi.listPlans.mockResolvedValue(BACKEND_PLANS);
    renderPlanner();

    expect(await screen.findByRole('button', { name: /Morning milking/ })).toBeTruthy();
    expect(screen.getByText('05:00–07:00')).toBeTruthy();
    expect(screen.getByLabelText(/one action per line/).value).toBe('Wash udders\nStrip test');
  });

  it('marks edits as unsaved, and Save sends the whole routine with the edit', async () => {
    routineApi.listPlans.mockResolvedValue(BACKEND_PLANS);
    routineApi.savePlans.mockResolvedValue({ message: 'Saved' });
    renderPlanner();

    const save = await screen.findByRole('button', { name: /Save Routine/ });
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/one action per line/), { target: { value: 'Wash udders\nStrip test\nRecord litres' } });
    expect(screen.getByText('Unsaved changes (1)')).toBeTruthy();

    fireEvent.click(save);
    await waitFor(() => expect(routineApi.savePlans).toHaveBeenCalledTimes(1));
    const [sent] = routineApi.savePlans.mock.calls[0];
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ id: 1, title: 'Morning milking', checklist: 'Wash udders\nStrip test\nRecord litres' });
    expect(sent[1]).toMatchObject({ id: 2, title: 'Feeding' });
    await waitFor(() => expect(screen.queryByText(/Unsaved changes/)).toBeNull());
  });

  it('keeps the edit and says nothing was saved when saving fails offline', async () => {
    routineApi.listPlans.mockResolvedValue(BACKEND_PLANS);
    routineApi.savePlans.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    renderPlanner();

    const editor = await screen.findByLabelText(/one action per line/);
    fireEvent.change(editor, { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Routine/ }));

    expect(await screen.findByText(/No internet connection. The routine wasn’t saved/)).toBeTruthy();
    expect(screen.getByLabelText(/one action per line/).value).toBe('Changed');
    expect(screen.getByText('Unsaved changes (1)')).toBeTruthy();
  });
});
