import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MobileBottomNav from '../MobileBottomNav';

void React;

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(cleanup);

function renderAs(currentUser) {
  useAuth.mockReturnValue({ currentUser });
  return render(
    <MemoryRouter>
      <MobileBottomNav />
    </MemoryRouter>
  );
}

const tabLabels = () => screen.getAllByRole('link').map((link) => link.textContent);

describe('MobileBottomNav', () => {
  it('shows every tab to a single-farm owner, with Dashboard opening their landing page', () => {
    renderAs({ name: 'Owner', role: 'FARMER', tenant_type: 'single', tenant_id: 't1' });

    expect(tabLabels()).toEqual(['Dashboard', 'Production Log', 'Buyer List', 'Ledger']);
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/dashboard');
  });

  it('hides buyer and ledger tabs from a cooperative member farmer', () => {
    renderAs({ name: 'Member', role: 'FARMER', tenant_id: 't1', cooperative_id: 'c1' });

    expect(tabLabels()).toEqual(['Dashboard', 'Production Log']);
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/member/dashboard');
  });

  it('limits tabs by page_access when the backend assigns pages', () => {
    renderAs({ name: 'Clerk', role: 'CLERK', tenant_id: 't1', cooperative_id: 'c1', page_access: [] });

    expect(tabLabels()).toEqual(['Dashboard', 'Production Log']);
  });
});
