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

  it('does not show Customer Billing for herdsman', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Test', role: 'Herdsman', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.queryAllByRole('link', { name: 'Customer Billing' }).length).toBe(0);
  });

  it('shows Customer Billing for farmer', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByRole('link', { name: 'Customer Billing' }).length).toBeGreaterThan(0);
  });

  it('shows Customer Billing for primary admin', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Admin', role: 'PRIMARY_ADMIN', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByRole('link', { name: 'Customer Billing' }).length).toBeGreaterThan(0);
  });

  it('shows Herdsman View for farmer', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByText('Herdsman View').length).toBeGreaterThan(0);
  });

  it('shows My Tasks for herdsman', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Herdsman', role: 'Herdsman', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByText('My Tasks').length).toBeGreaterThan(0);
  });
});
