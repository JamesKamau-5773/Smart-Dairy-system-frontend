import React from 'react';
import { render, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FastMilkLog from '../FastMilkLog';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TenantProvider } from '../../../contexts/TenantContext';
import { QueryProvider } from '../../../providers/QueryProvider';

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tnt_riftvalley_01', farmId: 'frm_rvd_main' }),
}));

vi.mock('../../../lib/apiClient', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    safetyApi: {
      ...actual.safetyApi,
      activeHardlocks: vi.fn().mockResolvedValue([]),
    },
  };
});

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TenantProvider>
          <QueryProvider>{ui}</QueryProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('FastMilkLog', () => {
  beforeEach(() => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Tester', role: 'Herdsman', tenant_id: 'tnt_riftvalley_01', farm_id: 'frm_rvd_main', farm_name: 'Rift Valley Dairies', token: 'mock' }));
  });

  it('renders header and disabled save without inputs', () => {
    renderWithProviders(<FastMilkLog />);
    expect(screen.getByText(/Record Milk/i)).toBeTruthy();
    const save = screen.getByRole('button', { name: /Save Record/i });
    expect(save.disabled).toBeTruthy();
  });

  it('renders without demo herd options when live cow data is unavailable', async () => {
    renderWithProviders(<FastMilkLog />);

    await waitFor(() => {
      expect(screen.getAllByRole('option').every((option) => option.textContent === 'Choose cow...')).toBe(true);
    });
  });

  it('renders edit actions when opened with an existing record', () => {
    renderWithProviders(
      <FastMilkLog
        mode="edit"
        record={{ id: 'milk-1', cowId: 'C-102', amount: '14.5', session: 'morning' }}
      />,
    );

    expect(screen.getByText(/Edit Milk Record/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Update Record/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Delete Record/i })).toBeTruthy();
  });
});
