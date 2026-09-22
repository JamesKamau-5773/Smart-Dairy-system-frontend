import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmployeeDrawer from '../EmployeeDrawer';

void React;

afterEach(cleanup);

const staff = {
  id: 7,
  name: 'Dominic Kamau',
  role: 'Farm Hand',
  phoneNumber: '0712345678',
  status: 'ACTIVE',
  baseSalary: 7000,
};

describe('EmployeeDrawer profile form', () => {
  it('formats and submits the employee phone using the backend canonical value', async () => {
    const onSaveProfile = vi.fn();

    render(
      <EmployeeDrawer
        isOpen
        staff={staff}
        onClose={vi.fn()}
        onSaveProfile={onSaveProfile}
        onSaveFinancials={vi.fn()}
        onSaveMedical={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/phone number/i).value).toBe('0712 345 678');
    expect(screen.getByLabelText(/job role/i).value).toBe('FARM_HAND');

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '0712' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    expect(await screen.findByText(/enter a valid kenyan mobile number/i)).toBeTruthy();
    expect(onSaveProfile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+254712345678' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(onSaveProfile).toHaveBeenCalledWith(7, expect.objectContaining({
      name: 'Dominic Kamau',
      role: 'FARM_HAND',
      phoneNumber: '254712345678',
      status: 'ACTIVE',
    })));
  });
});