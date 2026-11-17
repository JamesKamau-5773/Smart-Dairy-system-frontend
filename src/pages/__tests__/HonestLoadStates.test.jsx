// Regression tests for the UX audit, phase 2: a list or widget may only say it is empty once
// the backend has answered with nothing. Loading and failures are never shown as "empty",
// and a figure the backend didn't send is shown as "—", never as zero.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryRegistry from '../inventory/InventoryRegistry';
import MilkDropReports from '../operations/MilkDropReports';
import Customers from '../operations/Customers';
import BuyersList from '../finance/BuyersList';
import NutritionDashboard from '../nutrition/NutritionDashboard';
import AnimalEconomicsReport from '../finance/AnimalEconomicsReport';

const api = vi.hoisted(() => ({
  inventory: { listItems: vi.fn() },
  production: { listMilkDropAlerts: vi.fn() },
  finance: { listCustomers: vi.fn() },
  nutrition: { feedCostEfficiency: vi.fn(), listRecipes: vi.fn(), activeBatchRoiTrendWeekly: vi.fn(), feedingToday: vi.fn() },
  herd: { list: vi.fn() },
  reports: { getAnimalEconomics: vi.fn() },
}));

vi.mock('../../lib/backendApi', async (importOriginal) => ({
  ...(await importOriginal()),
  inventoryApi: api.inventory,
  productionApi: api.production,
  financeApi: api.finance,
  nutritionApi: api.nutrition,
  herdApi: api.herd,
  reportsApi: api.reports,
}));
vi.mock('../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: 'FARMER' } }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }), toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const never = () => new Promise(() => {});
const serverDown = () => Promise.reject(Object.assign(new Error('HTTP 503'), { response: { status: 503, data: {} } }));

function renderPage(Page) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><Page /></MemoryRouter>
    </QueryClientProvider>,
  );
}

const PAGES = [
  { name: 'Inventory', Page: InventoryRegistry, load: api.inventory.listItems, label: 'stock items', empty: /No inventory items yet/ },
  { name: 'Milk drop alerts', Page: MilkDropReports, load: api.production.listMilkDropAlerts, label: 'milk drop alerts', empty: /No milk drop alerts\./ },
  { name: 'Customers', Page: Customers, load: api.finance.listCustomers, label: 'customers', empty: /No customers yet/ },
  { name: 'Buyers list', Page: BuyersList, load: api.finance.listCustomers, label: 'buyers', empty: /Set up your buyer registry/ },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.nutrition.feedCostEfficiency.mockResolvedValue({ rows: [] });
  api.nutrition.listRecipes.mockResolvedValue([]);
  api.nutrition.activeBatchRoiTrendWeekly.mockResolvedValue({ rows: [] });
  api.nutrition.feedingToday.mockResolvedValue({ groups: [], active_batches: [] });
  api.herd.list.mockResolvedValue([]);
});

afterEach(cleanup);

describe.each(PAGES)('$name', ({ Page, load, label, empty }) => {
  it('shows a skeleton, not the empty state, while loading', () => {
    load.mockImplementation(never);
    renderPage(Page);
    expect(screen.queryAllByText(empty)).toHaveLength(0);
    expect(document.querySelector('[aria-busy="true"], [aria-hidden="true"].animate-shimmer, .animate-shimmer')).toBeTruthy();
  });

  it('says it couldn’t load, with Try again, instead of the empty state', async () => {
    load.mockImplementation(serverDown);
    renderPage(Page);
    expect(await screen.findByText(`Couldn’t load ${label}.`)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeTruthy();
    expect(screen.queryAllByText(empty)).toHaveLength(0);
  });

  it('shows the empty state once the backend answers with nothing', async () => {
    load.mockResolvedValue([]);
    renderPage(Page);
    expect((await screen.findAllByText(empty)).length).toBeGreaterThan(0);
  });
});

describe('unknown figures are shown as "—", never as zero', () => {
  it('inventory: unknown stock is "—" and gets no "Low – reorder" chip', async () => {
    api.inventory.listItems.mockResolvedValue([{ id: 1, name: 'Maize Germ', category: 'Bulk Feed', stock: { value: null, unit: 'kg' }, reorderLevel: 50, is_active: true, data_warnings: [] }]);
    renderPage(InventoryRegistry);
    const card = (await screen.findByRole('heading', { name: 'Maize Germ' })).closest('article');
    expect(within(card).getByText('—')).toBeTruthy();
    expect(screen.queryAllByText('Low – reorder')).toHaveLength(0);
  });

  it('milk drop alerts: a missing amount is "—", not "-NaN L"', async () => {
    api.production.listMilkDropAlerts.mockResolvedValue([{ id: 1, cow_name: 'Neema', date_time: '2026-11-07T06:00:00Z', missing_milk: null, status: 'OPEN' }]);
    renderPage(MilkDropReports);
    expect((await screen.findAllByText('—')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/NaN/)).toHaveLength(0);
  });

  it('customers: a missing balance and rate are "—", not KES 0.00', async () => {
    api.finance.listCustomers.mockResolvedValue([{ id: 7, name: 'Wanjiku Kiosk', phone_number: '254712345678' }]);
    renderPage(Customers);
    expect((await screen.findAllByText('Wanjiku Kiosk')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/KES 0\.00/)).toHaveLength(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('buyers list: the outstanding total is "—" when any balance is unknown', async () => {
    api.finance.listCustomers.mockResolvedValue([
      { id: 1, name: 'Known', account_balance: 500 },
      { id: 2, name: 'Unknown' },
    ]);
    renderPage(BuyersList);
    const total = (await screen.findByText('Total outstanding')).closest('div.group');
    expect(within(total).getByText('—')).toBeTruthy();
    expect(screen.getAllByText('Balance unknown').length).toBeGreaterThan(0);
  });

  it('buyers list: the outstanding total is shown when every balance is known', async () => {
    api.finance.listCustomers.mockResolvedValue([
      { id: 1, name: 'Owes', account_balance: 500 },
      { id: 2, name: 'In credit', account_balance: -200 },
    ]);
    renderPage(BuyersList);
    const total = (await screen.findByText('Total outstanding')).closest('div.group');
    expect(within(total).getByText('KES 500.00')).toBeTruthy();
  });
});

describe('Feed dashboard widgets', () => {
  it('say they couldn’t load instead of "no data yet"', async () => {
    api.nutrition.listRecipes.mockImplementation(serverDown);
    api.nutrition.activeBatchRoiTrendWeekly.mockImplementation(serverDown);
    renderPage(NutritionDashboard);
    expect(await screen.findByText('Couldn’t load feed mixes.')).toBeTruthy();
    expect(await screen.findByText('Couldn’t load weekly feed costs.')).toBeTruthy();
    expect(screen.queryByText('No feed records found')).toBeNull();
    expect(screen.queryByText(/No weekly cost data yet/)).toBeNull();
  });

  it('show "no data yet" once the backend answers with nothing', async () => {
    renderPage(NutritionDashboard);
    expect(await screen.findByText('No feed records found')).toBeTruthy();
    expect(screen.getByText(/No weekly cost data yet/)).toBeTruthy();
  });
});

describe('Cow profitability', () => {
  it('shows a missing profit as unknown, not as "no profit yet"', async () => {
    api.herd.list.mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema' }]);
    api.reports.getAnimalEconomics.mockResolvedValue({
      animal: { id: 57, name: 'Neema', tag_number: 'KE-012', first_calving_date: '2024-01-01' },
      lifetime_net_contribution_kes: null,
      rearing_cost: { amount_kes: null },
      lifetime_milk_contribution: { amount_kes: null, saleable_milk_liters: null },
      data_quality: { first_calving_recorded: true },
      costs_by_type_kes: {},
    });
    renderPage(AnimalEconomicsReport);
    const select = await screen.findByRole('combobox');
    await screen.findByRole('option', { name: /Neema/ });
    fireEvent.change(select, { target: { value: '57' } });

    expect(await screen.findByText(/profit can’t be worked out yet/)).toBeTruthy();
    expect(screen.queryByText(/has not yet produced profit/)).toBeNull();
  });

  it('says it couldn’t load the animals instead of an empty choice', async () => {
    api.herd.list.mockImplementation(serverDown);
    renderPage(AnimalEconomicsReport);
    expect(await screen.findByText('Couldn’t load animals.')).toBeTruthy();
  });
});

describe('Buyer statements on WhatsApp', () => {
  it('are sent under the Maziwa Smart name', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    api.finance.listCustomers.mockResolvedValue([{ id: 7, name: 'Wanjiku Kiosk', phone_number: '254712345678', account_balance: 500 }]);
    renderPage(BuyersList);
    await screen.findAllByText('Wanjiku Kiosk');
    fireEvent.click(screen.getAllByRole('button', { name: /WhatsApp/ }).at(-1));

    const text = decodeURIComponent(new URL(open.mock.calls[0][0]).searchParams.get('text'));
    expect(text).toMatch(/^Maziwa Smart - Customer statement/);
    expect(text).not.toMatch(/Jivu/);
    // A valid number opens the buyer's chat directly (phone.js format).
    expect(new URL(open.mock.calls[0][0]).pathname).toBe('/254712345678');
    open.mockRestore();
  });

  it('lets WhatsApp ask who to send to when the buyer’s number isn’t a valid mobile', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    api.finance.listCustomers.mockResolvedValue([{ id: 8, name: 'Rift Coop', phone_number: '020 123', account_balance: 0 }]);
    renderPage(BuyersList);
    await screen.findAllByText('Rift Coop');
    fireEvent.click(screen.getAllByRole('button', { name: /WhatsApp/ }).at(-1));
    expect(new URL(open.mock.calls[0][0]).pathname).toBe('/');
    open.mockRestore();
  });
});
