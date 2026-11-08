// UX audit phase 4: pages render the backend's data directly (no local copies that drift) and
// show the backend's counts and totals instead of working them out on the phone.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HerdRegistry from '../operations/HerdRegistry';
import UnitConversions from '../nutrition/UnitConversions';

const api = vi.hoisted(() => ({
  herd: { list: vi.fn(), summary: vi.fn() },
  nutrition: { listConversions: vi.fn(), saveConversion: vi.fn() },
}));

vi.mock('../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    herdApi: { ...actual.herdApi, ...api.herd },
    nutritionApi: { ...actual.nutritionApi, ...api.nutrition },
  };
});
vi.mock('../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: 'FARMER' } }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const serverDown = () => Promise.reject(Object.assign(new Error('HTTP 503'), { response: { status: 503, data: {} } }));

function renderPage(Page) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><Page /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(cleanup);

describe('Cow Register', () => {
  const twoCows = [
    { id: 57, tag_number: 'KE-012', name: 'Neema', status: 'Lactating' },
    { id: 58, tag_number: 'KE-013', name: 'Baraka', status: 'Dry' },
  ];

  it('shows the backend’s herd counts, not a count of the rows on the page', async () => {
    api.herd.list.mockResolvedValue(twoCows);
    // The farm has more cows than the first page of the list holds.
    api.herd.summary.mockResolvedValue({ totalCount: 250, milkingCount: 120, dryCount: 40, averageAgeMonths: 40, latestCalved: null });
    renderPage(HerdRegistry);

    expect(await screen.findByText('Showing 2 of 250 animals.')).toBeTruthy();
    expect(screen.getAllByText('250').length).toBeGreaterThan(0);
    expect(screen.getAllByText('120').length).toBeGreaterThan(0);
  });

  it('loads the herd once for both the list and the dam dropdown', async () => {
    api.herd.list.mockResolvedValue(twoCows);
    api.herd.summary.mockResolvedValue({ totalCount: 2, milkingCount: 1, dryCount: 1, averageAgeMonths: null, latestCalved: null });
    renderPage(HerdRegistry);

    await screen.findAllByText('Neema');
    expect(api.herd.list).toHaveBeenCalledTimes(1);
  });

  it('says it couldn’t load the herd instead of "Your herd is empty"', async () => {
    api.herd.list.mockImplementation(serverDown);
    api.herd.summary.mockImplementation(serverDown);
    renderPage(HerdRegistry);

    expect(await screen.findByText('Couldn’t load cows.')).toBeTruthy();
    expect(screen.queryByText(/Your herd is empty/)).toBeNull();
  });

  it('shows "—" for counts the backend couldn’t give', async () => {
    api.herd.list.mockResolvedValue(twoCows);
    api.herd.summary.mockResolvedValue({ totalCount: null, milkingCount: null, dryCount: null, averageAgeMonths: null, latestCalved: null });
    renderPage(HerdRegistry);

    expect(await screen.findByText('Showing 2 of — animals.')).toBeTruthy();
  });
});

describe('Unit Helpers', () => {
  it('shows the backend’s list and ignores the old copy kept on the phone', async () => {
    localStorage.setItem('jivu_unit_conversions', JSON.stringify([{ id: 'x', material: 'Phone-only Debe', localUnit: 'debe', baseUnit: 'kg', ratio: 9 }]));
    api.nutrition.listConversions.mockResolvedValue([{ id: 1, material: 'Dairy Meal', localUnit: 'kasuku', baseUnit: 'kg', ratio: 2 }]);
    renderPage(UnitConversions);

    expect(await screen.findByText('Dairy Meal')).toBeTruthy();
    expect(screen.queryByText('Phone-only Debe')).toBeNull();
    expect(screen.queryByText(/Local Storage Notice/)).toBeNull();
    // The backend can't delete a conversion yet, so there is no button that only pretends to.
    expect(screen.queryByRole('button', { name: /Remove kasuku conversion/ })).toBeNull();
  });

  it('says it couldn’t load instead of "no units defined"', async () => {
    api.nutrition.listConversions.mockImplementation(serverDown);
    renderPage(UnitConversions);

    expect(await screen.findByText('Couldn’t load unit helpers.')).toBeTruthy();
    expect(screen.queryByText(/No local units defined/)).toBeNull();
  });

  it('keeps what was typed and says so when saving fails offline', async () => {
    api.nutrition.listConversions.mockResolvedValue([]);
    api.nutrition.saveConversion.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    renderPage(UnitConversions);
    await screen.findByText(/No local units defined/);

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Dairy Meal' } });
    fireEvent.change(inputs[1], { target: { value: 'kasuku' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Conversion/ }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/No internet connection. The unit helper wasn’t saved/)).toBeTruthy();
    await waitFor(() => expect(inputs[0].value).toBe('Dairy Meal'));
  });
});
