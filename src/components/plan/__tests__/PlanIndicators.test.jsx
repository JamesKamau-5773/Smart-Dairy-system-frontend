import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LockedFeature from '../LockedFeature';
import { useAuth } from '../../../contexts/AuthContext';

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(cleanup);

const signedInWith = (entitlements) => useAuth.mockReturnValue({ currentUser: { id: 1, entitlements } });

describe('LockedFeature', () => {
  const page = <p>Payroll page</p>;

  it('shows the page when the plan includes the feature', () => {
    signedInWith({ features: ['payroll'] });
    render(<LockedFeature feature="payroll" title="Payroll">{page}</LockedFeature>);
    expect(screen.getByText('Payroll page')).toBeTruthy();
  });

  it('shows the page while the plan is unknown: the backend still enforces access', () => {
    signedInWith(undefined);
    render(<LockedFeature feature="payroll" title="Payroll">{page}</LockedFeature>);
    expect(screen.getByText('Payroll page')).toBeTruthy();
  });

  it('explains a locked feature with the backend’s upgrade link', () => {
    signedInWith({ plan: { id: 'starter', name: 'Starter' }, features: ['herd'], upgrade_url: 'https://maziwasmart.co.ke/plans' });
    render(<LockedFeature feature="payroll" title="Payroll">{page}</LockedFeature>);

    expect(screen.queryByText('Payroll page')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Payroll isn’t in your plan' })).toBeTruthy();
    expect(screen.getByText(/Your Starter plan doesn’t include Payroll/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See plans and upgrade' }).getAttribute('href')).toBe('https://maziwasmart.co.ke/plans');
  });

  it('offers the support number when there is no upgrade link', () => {
    signedInWith({ features: ['herd'] });
    render(<LockedFeature feature="payroll" title="Payroll">{page}</LockedFeature>);
    expect(screen.getByRole('link', { name: /0758 763 260/ }).getAttribute('href')).toBe('tel:+254758763260');
  });
});
