import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Sidebar';
import { getDefaultStaffPageAccess } from '../../lib/staffOnboarding';

void React;

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
// FarmSwitcher loads farms from the backend; it is not under test here.
vi.mock('../FarmSwitcher', () => ({ default: () => null }));
afterEach(cleanup);

// Staff accounts carry backend-assigned page_access; a herdsman gets the FARM_HAND defaults.
const herdsman = {
  name: 'Herdsman',
  role: 'Herdsman',
  tenant_id: 't1',
  farm_id: 'f1',
  farm_name: 'F1',
  page_access: getDefaultStaffPageAccess('FARM_HAND'),
};

function renderAs(currentUser) {
  useAuth.mockReturnValue({ currentUser });
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('does not show customer, finance or payroll pages to farmhands', () => {
    renderAs(herdsman);
    expect(screen.queryByRole('link', { name: 'Customer Management' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ledger' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Payroll' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Cow Register' }).length).toBeGreaterThan(0);
  });

  it('shows Customer Management for farmer', () => {
    renderAs({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' });
    expect(screen.getAllByRole('link', { name: 'Customer Management' }).length).toBeGreaterThan(0);
  });

  it('shows staff onboarding for a cooperative farmer', () => {
    renderAs({
      name: 'Farm Owner',
      role: 'FARMER',
      tenant_type: 'cooperative',
      tenant_id: 't1',
      cooperative_id: 't1',
      farm_id: 'f1',
    });

    expect(screen.getAllByRole('link', { name: 'Staff Registry' }).length).toBeGreaterThan(0);
  });

  it('shows Customer Management for primary admin', () => {
    renderAs({ name: 'Admin', role: 'PRIMARY_ADMIN', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' });
    expect(screen.getAllByRole('link', { name: 'Customer Management' }).length).toBeGreaterThan(0);
  });

  it('shows Farm Task View for farmer', () => {
    renderAs({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' });
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });

  it('shows Farm Task View for herdsman', () => {
    renderAs(herdsman);
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });
});
