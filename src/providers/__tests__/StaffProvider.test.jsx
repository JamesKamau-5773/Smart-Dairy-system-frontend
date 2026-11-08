import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffProvider } from '../StaffProvider';

void React;
afterEach(cleanup);

const auth = vi.hoisted(() => ({ currentUser: null }));
const hr = vi.hoisted(() => ({ listStaff: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', activeFarm: { id: 'f1' } }) }));
vi.mock('../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), hrApi: hr }));

describe('StaffProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hr.listStaff.mockResolvedValue([]);
  });

  it('doesn’t ask for the staff list for staff without the staff or payroll pages', async () => {
    auth.currentUser = { id: 2, role: 'FARM_HAND', page_access: ['production', 'feeding'] };
    render(<StaffProvider><p>page</p></StaffProvider>);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(hr.listStaff).not.toHaveBeenCalled();
  });

  it.each([
    ['an owner (no page restrictions)', { id: 1, role: 'FARMER' }],
    ['staff with payroll access', { id: 3, role: 'FARM_MANAGER', page_access: ['payroll'] }],
  ])('loads it for %s', async (_, user) => {
    auth.currentUser = user;
    render(<StaffProvider><p>page</p></StaffProvider>);
    await waitFor(() => expect(hr.listStaff).toHaveBeenCalledTimes(1));
  });
});
