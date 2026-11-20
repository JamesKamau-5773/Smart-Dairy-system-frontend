import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BreedingHub from '../BreedingHub';
import { shellCopy } from '../../../i18n/shell';

globalThis.React = React;
afterEach(cleanup);

const mocks = vi.hoisted(() => ({
  listHeatObservations: vi.fn(),
  listSemenInventory: vi.fn(),
  listLogs: vi.fn(),
  listHerd: vi.fn(),
  geneticProgress: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }),
}));

vi.mock('../../../lib/backendApi', () => ({
  getApiErrorMessage: (_error, fallback) => fallback,
  breedingApi: {
    listHeatObservations: mocks.listHeatObservations,
    listSemenInventory: mocks.listSemenInventory,
    listLogs: mocks.listLogs,
  },
  herdApi: {
    list: mocks.listHerd,
    geneticProgress: mocks.geneticProgress,
  },
}));

vi.mock('../../../components/forms/breeding', () => ({
  LogAIServiceForm: ({ initialData }) => <pre data-testid="log-form-data">{JSON.stringify(initialData)}</pre>,
  LogHeatObservationForm: () => null,
  ManageSemenInventoryForm: () => null,
  RestockSemenInventoryForm: () => null,
}));

vi.mock('../../../components/ui/Confirmation', () => ({
  default: () => null,
  useConfirmation: () => ({ confirm: vi.fn(), isOpen: false }),
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

function renderHub() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Pages always render inside the app's router (the shared filter state reads the address).
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <BreedingHub />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const baseLog = {
  id: 88,
  cow_id: 46,
  cow_name: 'Malaika',
  cow_tag: 'COWBR001',
  semen_id: 12,
  provided_by: 'FARM',
  insemination_date: '2026-09-15',
  status: 'Pending',
};

describe('BreedingHub history and pending edits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listHeatObservations.mockResolvedValue([]);
    mocks.listSemenInventory.mockResolvedValue([]);
    mocks.listHerd.mockResolvedValue([{ id: 46, tag_number: 'COWBR001', name: 'Malaika' }]);
    mocks.geneticProgress.mockResolvedValue([]);
  });

  it('titles the page with the sidebar label ("AI & Pregnancy"), from the same key', async () => {
    renderHub();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(shellCopy.nav.items.breeding);
    expect(shellCopy.nav.items.breeding).toBe('AI & Pregnancy');
  });

  it('opens the shared service form with values when a pending card is edited', async () => {
    mocks.listLogs.mockResolvedValue([baseLog]);
    renderHub();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit AI service for Malaika · COWBR001' }));

    expect(screen.getByRole('dialog', { name: 'Edit AI service' })).toBeTruthy();
    expect(screen.getByTestId('log-form-data').textContent).toContain('"id":88');
    expect(screen.getByTestId('log-form-data').textContent).toContain('"cowId":"Malaika · COWBR001"');
  });

  it('keeps Failed records out of the queue and filters them as Unsuccessful', async () => {
    mocks.listLogs.mockResolvedValue([{ ...baseLog, id: 89, status: 'Failed' }]);
    renderHub();

    expect(await screen.findByText('All inseminated cows have been checked by the vet.')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'View all historical checks' })[0]);
    // The shared filter panel, collapsed until opened.
    fireEvent.click(screen.getByRole('button', { name: 'Search and filter checks' }));
    const results = screen.getByRole('group', { name: 'Check result' });
    fireEvent.click(within(results).getByRole('button', { name: 'Unsuccessful' }));
    expect(within(results).getByRole('button', { name: 'Unsuccessful' }).getAttribute('aria-pressed')).toBe('true');

    // The filter pill plus the failed record's own status: the record is listed under it.
    expect(screen.getAllByText('Unsuccessful').length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Malaika/).length).toBeGreaterThan(0);
    // Collapsed, the header counts the filter; Reset clears it.
    fireEvent.click(screen.getByRole('button', { name: 'Search and filter checks' }));
    expect(screen.getByRole('button', { name: 'Search and filter checks · 1 filter active' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('button', { name: 'Search and filter checks' })).toBeTruthy();
  });

  it('groups history by the AI service month, with only the backend’s dates and notes', async () => {
    mocks.listLogs.mockResolvedValue([
      { ...baseLog, id: 90, insemination_date: '2026-01-22', status: 'Pregnant', updated_at: '2026-02-20T09:00:00Z' },
      { ...baseLog, id: 91, insemination_date: '2025-12-05', status: 'Pending' },
    ]);
    renderHub();

    fireEvent.click((await screen.findAllByRole('button', { name: 'View all historical checks' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Historical checks' });

    const months = within(dialog).getAllByText(/^(January 2026|December 2025)$/).map((node) => node.textContent);
    expect([...new Set(months)]).toEqual(['January 2026', 'December 2025']);
    expect(within(dialog).getAllByText('20 Feb 2026').length).toBeGreaterThan(0);
    // The pending record has no update time from the backend and no invented note.
    expect(within(dialog).queryByText('Awaiting vet window')).toBeNull();
  });
});
describe('BreedingHub shows the backend’s data, and says when it couldn’t load', () => {
  const serverDown = () => Promise.reject(Object.assign(new Error('HTTP 503'), { response: { status: 503, data: {} } }));

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.listHeatObservations.mockResolvedValue([]);
    mocks.listHerd.mockResolvedValue([]);
    mocks.geneticProgress.mockResolvedValue([]);
    mocks.listLogs.mockResolvedValue([]);
    mocks.listSemenInventory.mockResolvedValue([]);
  });

  it('semen inventory: "couldn’t load" with no empty message, and an unknown straw total', async () => {
    mocks.listSemenInventory.mockImplementation(serverDown);
    renderHub();

    expect(await screen.findByText('Couldn’t load semen inventory.')).toBeTruthy();
    expect(screen.queryByText(/No semen inventory records yet/)).toBeNull();
    expect(screen.getByText(/— straws in tank/)).toBeTruthy();
  });

  it('breeding records: "couldn’t load" instead of "all cows have been checked"', async () => {
    mocks.listLogs.mockImplementation(serverDown);
    renderHub();

    expect(await screen.findByText('Couldn’t load breeding records.')).toBeTruthy();
    expect(screen.queryByText(/All inseminated cows have been checked/)).toBeNull();
  });

  it('never falls back to breeding logs saved in the old local cache', async () => {
    localStorage.setItem('breeding_logs_cache:tenant_1:farm_1', JSON.stringify([{ ...baseLog, id: 999, cow_name: 'Old Local Cow' }]));
    mocks.listLogs.mockImplementation(serverDown);
    renderHub();

    await screen.findByText('Couldn’t load breeding records.');
    expect(screen.queryByText(/Old Local Cow/)).toBeNull();
  });

  it('shows the tank total from the backend’s inventory once it has loaded', async () => {
    mocks.listSemenInventory.mockResolvedValue([
      { id: 1, name: 'Bull A', code: 'A1', straws_left: 5 },
      { id: 2, name: 'Bull B', code: 'B2', straws_left: 3 },
    ]);
    renderHub();

    expect(await screen.findByText(/8 straws in tank/)).toBeTruthy();
  });
});
