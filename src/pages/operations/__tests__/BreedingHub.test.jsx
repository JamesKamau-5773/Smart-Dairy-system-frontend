import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BreedingHub from '../BreedingHub';

globalThis.React = React;

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

vi.mock('../../../components/ui/Modal', () => ({
  default: ({ isOpen, title, children }) => isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
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
  return render(
    <QueryClientProvider client={queryClient}>
      <BreedingHub />
    </QueryClientProvider>,
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

  it('opens the shared service form with values when a pending card is edited', async () => {
    mocks.listLogs.mockResolvedValue([baseLog]);
    renderHub();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit AI service for Malaika · COWBR001' }));

    expect(screen.getByRole('dialog', { name: 'Edit AI Service' })).toBeTruthy();
    expect(screen.getByTestId('log-form-data').textContent).toContain('"id":88');
    expect(screen.getByTestId('log-form-data').textContent).toContain('"cowId":"Malaika · COWBR001"');
  });

  it('keeps Failed records out of the queue and filters them as Unsuccessful', async () => {
    mocks.listLogs.mockResolvedValue([{ ...baseLog, id: 89, status: 'Failed' }]);
    renderHub();

    expect(await screen.findByText('All inseminated cows have been checked by the vet.')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'View All Historical Checks' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Show filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unsuccessful' }));

    expect(screen.getByText('Unsuccessful')).toBeTruthy();
  });
});