import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCowIdentity } from '../../../lib/cowIdentity';
import { normalizeMilkDropReport } from '../../../lib/milkDropReport';
import MilkDropReports from '../MilkDropReports';

globalThis.React = React;

const apiMocks = vi.hoisted(() => ({
  listMilkDropAlerts: vi.fn(),
  investigateMilkDropAlert: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_6', farmId: 'farm_6' }),
}));

vi.mock('../../../lib/backendApi', () => ({
  productionApi: {
    listMilkDropAlerts: apiMocks.listMilkDropAlerts,
    investigateMilkDropAlert: apiMocks.investigateMilkDropAlert,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn() },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MilkDropReports />
    </QueryClientProvider>,
  );
}

describe('MilkDropReports data handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listMilkDropAlerts.mockResolvedValue([{
      id: 8,
      date_time: '2026-09-14',
      cow_id: 3,
      cow_name: 'Malaika',
      cow_tag: 'C-003',
      missing_milk: 3,
      status: 'INVESTIGATING',
      selected_reasons: ['Not enough feed given'],
      investigation_notes: 'Feed ration corrected.',
    }]);
    apiMocks.investigateMilkDropAlert.mockResolvedValue({ id: 8, status: 'RESOLVED' });
  });

  it('normalizes and displays the cow name with its ear tag', () => {
    const report = normalizeMilkDropReport({
      id: 8,
      cow_id: 3,
      cow_name: 'Malaika',
      cow_tag: 'C-003',
      status: 'investigating',
    });

    expect(report.status).toBe('INVESTIGATING');
    expect(formatCowIdentity(report)).toBe('Malaika · C-003');
  });

  it('preserves saved investigation findings when normalizing aliases', () => {
    expect(normalizeMilkDropReport({
      alertId: 8,
      selectedReasons: ['Not enough feed given'],
      investigationNotes: 'Feed ration corrected.',
    })).toMatchObject({
      id: 8,
      selected_reasons: ['Not enough feed given'],
      investigation_notes: 'Feed ration corrected.',
    });
  });

  it('closes an investigating case through the backend status transition', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Investigating' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close Case' }));

    await waitFor(() => {
      expect(apiMocks.investigateMilkDropAlert).toHaveBeenCalledWith(8, {
        status: 'RESOLVED',
        selected_reasons: ['Not enough feed given'],
        notes: 'Feed ration corrected.',
      });
    });
  });
});