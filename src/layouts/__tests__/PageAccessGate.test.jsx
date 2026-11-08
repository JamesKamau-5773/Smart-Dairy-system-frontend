// Plan locks are decided by the backend's `entitlements.features`, keyed by page-access key.
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PageAccessGate from '../PageAccessGate';
import { useAuth } from '../../contexts/AuthContext';
import { PAGE_ROUTES, PAGE_TITLES } from '../../lib/pageRoutes';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(cleanup);

const OWNER = { id: 1, role: 'FARMER', tenant_id: 3, farm_id: 4, tenant_type: 'single' };

function renderAt(path, entitlements) {
  useAuth.mockReturnValue({ currentUser: { ...OWNER, entitlements } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PageAccessGate><p>The page</p></PageAccessGate>
    </MemoryRouter>,
  );
}

describe('PageAccessGate and the farm plan', () => {
  it('shows the page while the plan is unknown', () => {
    renderAt('/hr/payroll', undefined);
    expect(screen.getByText('The page')).toBeTruthy();
  });

  it('shows the page when the plan includes that area', () => {
    renderAt('/hr/payroll', { features: ['payroll'] });
    expect(screen.getByText('The page')).toBeTruthy();
  });

  it('explains a page whose area the plan leaves out, on every page of that area', () => {
    renderAt('/finance/reports/animal-economics', { plan: { name: 'Starter' }, features: ['herd'] });
    expect(screen.queryByText('The page')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Reports isn’t in your plan' })).toBeTruthy();
  });

  it('never locks pages outside the access list', () => {
    renderAt('/profile', { features: [] });
    expect(screen.getByText('The page')).toBeTruthy();
  });

  it('names every access-controlled area', () => {
    PAGE_ROUTES.forEach(([, key]) => expect(PAGE_TITLES[key]).toBeTruthy());
  });
});
