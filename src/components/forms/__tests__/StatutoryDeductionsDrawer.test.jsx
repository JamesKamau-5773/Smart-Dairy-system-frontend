import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmployeeDrawer from '../EmployeeDrawer';

void React;
afterEach(cleanup);

const staff = { id: 5, name: 'Peter Otieno', role: 'FARM_HAND', phoneNumber: '+254712345678', baseSalary: 15000, monthlyDeduction: 0, loanBalance: 0, status: 'ACTIVE' };
const openFinancials = (member, onSaveFinancials = vi.fn()) => {
  render(<EmployeeDrawer isOpen staff={member} onClose={vi.fn()} onSaveProfile={vi.fn()} onSaveFinancials={onSaveFinancials} onSaveMedical={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Financials/ }));
  return onSaveFinancials;
};

describe('statutory deductions on the employee drawer', () => {
  it('saves the switch with the salary', () => {
    const save = openFinancials({ ...staff, statutoryDeductionsEnabled: true });
    const toggle = screen.getByRole('checkbox', { name: /Deduct PAYE, NSSF, SHIF and Housing Levy/ });
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /Apply financial changes/ }));
    expect(save).toHaveBeenCalledWith(5, expect.objectContaining({ statutoryDeductionsEnabled: false }));
  });

  it('hides the switch when the backend did not say', () => {
    openFinancials({ ...staff, statutoryDeductionsEnabled: null });
    expect(screen.queryByRole('checkbox', { name: /Deduct PAYE/ })).toBeNull();
  });
});
