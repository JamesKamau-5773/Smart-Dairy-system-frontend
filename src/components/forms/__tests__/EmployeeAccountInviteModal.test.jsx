import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmployeeAccountInviteModal from '../EmployeeAccountInviteModal';

void React;

afterEach(cleanup);

describe('EmployeeAccountInviteModal', () => {
  it('creates a linked staff invitation and shows only the server-issued claim URL', async () => {
    const onInvite = vi.fn().mockResolvedValue({
      invite_url: '/claim-account?token=server-issued-token',
      expires_in_hours: 48,
      account: { id: 42, role: 'FARM_SUPERVISOR', is_active: false },
    });

    render(
      <EmployeeAccountInviteModal
        isOpen
        staff={{ id: 7, name: 'Mary Wanjiku', phoneNumber: '0712345678', accountStatus: 'NONE' }}
        onClose={vi.fn()}
        onInvite={onInvite}
        onProvision={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/system role/i), { target: { value: 'FARM_SUPERVISOR' } });
    fireEvent.click(screen.getByRole('button', { name: /generate link/i }));

    await waitFor(() => expect(onInvite).toHaveBeenCalledWith(7, {
      role: 'FARM_SUPERVISOR',
    }));
    expect(await screen.findByText(/server-issued-token/)).toBeTruthy();
    expect(screen.getByText(/expires in 48 hours and can be used once/i)).toBeTruthy();
  });

  it('labels an existing pending invitation as a reissue', () => {
    render(
      <EmployeeAccountInviteModal
        isOpen
        staff={{ id: 7, name: 'Mary Wanjiku', phoneNumber: '0712345678', accountStatus: 'INVITE_PENDING' }}
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onProvision={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /reissue invitation/i })).toBeTruthy();
  });

  it('provisions an account with a forced reset without retaining the password', async () => {
    const onProvision = vi.fn().mockResolvedValue({ account: { id: 42, account_status: 'ACTIVE' } });

    render(
      <EmployeeAccountInviteModal
        isOpen
        staff={{ id: 7, name: 'Mary Wanjiku', phoneNumber: '0712345678', accountStatus: 'NONE' }}
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onProvision={onProvision}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /provision directly/i }));
    fireEvent.change(screen.getByLabelText(/^temporary password$/i), { target: { value: 'SecurePass#2468' } });
    fireEvent.click(screen.getByRole('button', { name: /provision account/i }));

    await waitFor(() => expect(onProvision).toHaveBeenCalledWith(7, {
      role: 'FARM_HAND',
      password: 'SecurePass#2468',
      requires_password_reset: true,
    }));
    expect(await screen.findByText(/account provisioned/i)).toBeTruthy();
    expect(screen.queryByDisplayValue('SecurePass#2468')).toBeNull();
  });
});