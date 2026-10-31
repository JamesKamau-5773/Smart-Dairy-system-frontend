import React from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import YieldLog from '../productionLog';
import MedicalRecords from '../MedicalRecords';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({
  listYield: vi.fn(),
  listRecords: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 1, role: 'FARMER', tenant_id: 'tenant_1', farm_id: 'farm_1' } }),
}));

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  const resolvesEmpty = () => vi.fn().mockResolvedValue([]);
  return {
    ...actual,
    productionApi: {
      listYield: api.listYield,
      summary: vi.fn().mockResolvedValue({}),
      listMilkDispositions: resolvesEmpty(),
      createYield: resolvesEmpty(),
      deleteYield: resolvesEmpty(),
      verifyYield: resolvesEmpty(),
      createMilkDisposition: resolvesEmpty(),
    },
    safetyApi: { activeHardlocks: resolvesEmpty() },
    herdApi: { list: resolvesEmpty() },
    medicalApi: { listRecords: api.listRecords, createRecord: resolvesEmpty(), updateRecord: resolvesEmpty() },
  };
});

const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', isAxiosError: true });

function renderWithClient(ui, queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const screens = [
  {
    name: 'milk log',
    Page: YieldLog,
    load: api.listYield,
    queryKey: ['production-yield-rows', 'tenant_1', 'farm_1'],
    label: 'milk records',
    noResults: /No milk log entries match/i,
    firstTimeEmpty: /No milk recorded yet/i,
    cachedRow: { id: 'y1', cow_id: 'C-102', cow_name: 'Neema', amount: 12.5, session: 'morning', date: '2026-10-30' },
    cachedText: /Neema/,
  },
  {
    name: 'medical records',
    Page: MedicalRecords,
    load: api.listRecords,
    queryKey: ['medical-records', 'tenant_1', 'farm_1'],
    label: 'medical records',
    noResults: /No medical records match/i,
    firstTimeEmpty: /No medical records yet/i,
    cachedRow: { id: 12, cow: 'Mrembo · 005', date: '2026-09-23', diagnosis: 'Weight loss', vet: 'Dr. Njoroge', status: 'Closed', severity: 'Low' },
    cachedText: /Weight loss/,
  },
];

describe.each(screens)('$name list states', ({ Page, load, queryKey, label, noResults, firstTimeEmpty, cachedRow, cachedText }) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton rows, not a "no results" message, while loading', () => {
    load.mockReturnValue(new Promise(() => {}));
    renderWithClient(<Page />);

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText(noResults)).toBeNull();
    expect(screen.queryByText(firstTimeEmpty)).toBeNull();
  });

  it('explains a failed load and retries on request', async () => {
    load.mockRejectedValueOnce(networkError()).mockResolvedValueOnce([cachedRow]);
    renderWithClient(<Page />);

    expect(await screen.findByText(`Couldn’t load ${label}.`)).toBeTruthy();
    expect(screen.getByText(/couldn’t reach the server/i)).toBeTruthy();
    expect(screen.queryByText(noResults)).toBeNull();
    expect(screen.queryByText('0.0 L')).toBeNull();
    expect(screen.getAllByText(`Not available until ${label} load`).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect((await screen.findAllByText(cachedText)).length).toBeGreaterThan(0);
  });

  it('keeps cached rows visible when a refresh fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
    queryClient.setQueryData(queryKey, [cachedRow]);
    load.mockRejectedValue(networkError());
    renderWithClient(<Page />, queryClient);

    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(await screen.findByText(new RegExp(`Showing ${label} saved on this phone`, 'i'))).toBeTruthy();
    expect(screen.getAllByText(cachedText).length).toBeGreaterThan(0);
  });

  it('says the list is not on this phone yet when offline with nothing cached', async () => {
    onlineManager.setOnline(false);
    try {
      renderWithClient(<Page />);
      expect(await screen.findByText(`You’re offline, and ${label} haven’t been saved on this phone yet.`)).toBeTruthy();
      expect(load).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('distinguishes a first-time empty list from filters that match nothing', async () => {
    load.mockResolvedValue([]);
    renderWithClient(<Page />);

    expect((await screen.findAllByText(firstTimeEmpty)).length).toBeGreaterThan(0);
    expect(screen.queryByText(noResults)).toBeNull();
  });
});
