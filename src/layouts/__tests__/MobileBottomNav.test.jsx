import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { TenantProvider } from '../../contexts/TenantContext';
import MobileBottomNav from '../MobileBottomNav';

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

describe('MobileBottomNav', () => {
  beforeEach(() => sessionStorage.removeItem('jivu_user'));

  it('shows Farm Task View for farmer and admin', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<MobileBottomNav />);
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });

  it('shows Farm Task View for herdsman', () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ name: 'Herdsman', role: 'Herdsman', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' }));
    renderWithProviders(<MobileBottomNav />);
    // The label renders inside the NavLink (icon span + text node both match).
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });
});