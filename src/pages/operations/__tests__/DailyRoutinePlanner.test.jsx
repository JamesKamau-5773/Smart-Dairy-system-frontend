import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DailyRoutinePlanner from '../DailyRoutinePlanner';
import { QueryProvider } from '../../../providers/QueryProvider';

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tnt_riftvalley_01', farmId: 'frm_rvd_main' }),
}));

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    routineApi: {
      ...actual.routineApi,
      listPlans: vi.fn().mockResolvedValue([]),
    },
  };
});

function renderWithProviders(ui) {
  return render(<QueryProvider>{ui}</QueryProvider>);
}

describe('DailyRoutinePlanner', () => {
  beforeEach(() => {
    localStorage.removeItem('operations_schedule_planner');
  });

  it('renders header and save button', () => {
    renderWithProviders(<DailyRoutinePlanner />);
    expect(screen.getByText('Daily Routine Planner')).toBeTruthy();
    expect(screen.getAllByText(/Save Routine|Save Planner|Save Schedule/i).length).toBeGreaterThan(0);
    // should show at least one task button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
