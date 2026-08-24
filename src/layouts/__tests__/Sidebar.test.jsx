import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { TenantProvider } from '../../contexts/TenantContext';
import Sidebar from '../Sidebar';

void React;

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TenantProvider>{ui}</TenantProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  beforeEach(() => sessionStorage.removeItem('jivu_user'));

  it('shows Customer Management for herdsman', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Test', role: 'Herdsman', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    // canViewCustomers = canViewAdminControls || FARMER; a single-tenant herdsman
    // passes canViewAdminControls (isSingleTenantUser), so the link IS shown.
    expect(screen.getAllByRole('link', { name: 'Customer Management' }).length).toBeGreaterThan(0);
  });

  it('shows Customer Management for farmer', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByRole('link', { name: 'Customer Management' }).length).toBeGreaterThan(0);
  });

  it('shows Customer Management for primary admin', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Admin', role: 'PRIMARY_ADMIN', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByRole('link', { name: 'Customer Management' }).length).toBeGreaterThan(0);
  });

  it('shows Farm Task View for farmer', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });

  it('shows Farm Task View for herdsman', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Herdsman', role: 'Herdsman', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });
});
