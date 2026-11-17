import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/AuthContext';
import MobileBottomNav from '../MobileBottomNav';
import { activeNavRoute, activeTabId } from '../../lib/navRoutes';

void React;
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(cleanup);

const OWNER = { name: 'Owner', role: 'FARMER', tenant_type: 'single', tenant_id: 't1' };
const OWNER_LANDING = '/dashboard';

// Every route in App.jsx and the tab its page lights up for a single-farm owner (null: none).
// A new route must be added here; the first test fails until it is.
const EXPECTED_TAB = {
  '/register': null, '/login': null, '/demo': null, '/claim-account': null, '/forgot-password': null,
  '/reset-password': null, '/verify-email': null, '/auth/google/complete': null, '/verify-phone': null,
  '/reset-required-password': null, '/shared/statement/:token': null, 'app': null,
  'system-admin/dashboard': null, 'system-admin/cooperatives': null, 'system-admin': null,
  'cooperative-admin/members': null, 'cooperative-admin': null, 'member/dashboard': null,
  dashboard: 'dashboard',
  'operations/yield': 'production', 'operations/clerk': 'production',
  'operations/milk-usage': null, 'operations/routine': null, 'operations/schedule-planner': null, tasks: null, 'operations/herdsman': null,
  'operations/herd': null, 'operations/breeding': null, 'operations/records': null, 'operations/milk-drop-reports': null,
  'operations/animal/:id': null, 'operations/animal/:id/milk-history': null,
  feeding: null, 'feed-nutrition': null, 'feed-nutrition/mix': null, 'operations/feed-formulation': null, 'operations/nutrition': null,
  'operations/lab': null, 'operations/unit-conversions': null, 'settings/unit-conversions': null,
  'finance/buyers': 'buyers', 'finance/customers/:customerId': 'buyers', 'operations/buyers': 'buyers', 'operations/buyers/registry': 'buyers',
  'operations/customers': null, 'operations/inventory': null,
  'finance/ledger': 'ledger',
  'operations/reports': null, 'operations/reports/milk-inventory': null,
  'finance/reports/dairy-unit-economics': null, 'finance/reports/animal-economics': null,
  'operations/safety': null, 'hr/staff': null, 'hr/payroll': null,
  '*': null,
};

// Tests run from the repo root (vitest's root).
const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');
const APP_ROUTES = [...appSource.matchAll(/path="([^"]+)"/g)].map((match) => match[1]);

/** A concrete address for a route pattern. */
const addressFor = (route) => (route === '*' ? '/no-such-page' : `/${route.replace(/^\//, '')}`
  .replace(':id', '42').replace(':customerId', '7').replace(':token', 'abc'));

function renderAt(path, user = OWNER) {
  useAuth.mockReturnValue({ currentUser: user });
  return render(<MemoryRouter initialEntries={[path]}><MobileBottomNav /></MemoryRouter>);
}

describe('bottom nav active tab', () => {
  it('has an expectation for every route in App.jsx', () => {
    expect(APP_ROUTES.length).toBeGreaterThan(40);
    expect(APP_ROUTES.filter((route) => !(route in EXPECTED_TAB))).toEqual([]);
  });

  it.each(Object.entries(EXPECTED_TAB))('%s → %s', (route, tab) => {
    const address = addressFor(route);
    expect(activeTabId({ pathname: address, search: '' }, OWNER_LANDING)).toBe(tab);
    renderAt(address);
    const current = screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.textContent)).toEqual(tab ? [{ dashboard: 'Dashboard', production: 'Production Log', buyers: 'Buyer List', ledger: 'Ledger' }[tab]] : []);
  });

  it('puts Low milk alerts (and the cow pages) under Herd, which has no tab', () => {
    expect(activeNavRoute({ pathname: '/operations/milk-drop-reports', search: '' })).toMatchObject({ id: 'milkDrops', group: 'herd' });
    expect(activeNavRoute({ pathname: '/operations/animal/42', search: '' })).toMatchObject({ id: 'cowRegister', group: 'herd' });
  });

  it('lights Dashboard on a member farmer’s own landing page', () => {
    renderAt('/member/dashboard', { name: 'Member', role: 'FARMER', tenant_id: 't1', cooperative_id: 'c1' });
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBe('page');
  });

  it('resolves the most specific sidebar item (Milk Inventory, not Farm Reports)', () => {
    expect(activeNavRoute({ pathname: '/operations/reports/milk-inventory', search: '' }).id).toBe('milkInventory');
    expect(activeNavRoute({ pathname: '/operations/inventory', search: '?category=Bulk+Feed' }).id).toBe('ingredients');
    expect(activeNavRoute({ pathname: '/operations/inventory', search: '' }).id).toBe('inventory');
  });
});
