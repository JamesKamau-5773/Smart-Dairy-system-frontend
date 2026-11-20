import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StaffRegistry from '../StaffRegistry';
import Payroll from '../Payroll';

void React;
afterEach(cleanup);

const staffState = vi.hoisted(() => ({ value: null }));
const hr = vi.hoisted(() => ({ getStaffingRecommendations: vi.fn(), payrollSummary: vi.fn(), getPayrollRun: vi.fn(), downloadPayslip: vi.fn(), runPayroll: vi.fn(), finalizePayrollRun: vi.fn(), payPayrollRun: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('../../../providers/StaffProvider', () => ({ useStaff: () => staffState.value }));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), hrApi: hr }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const member = (overrides) => ({ id: 1, name: 'Peter Otieno', role: 'FARM_HAND', phoneNumber: '0712345678', status: 'ACTIVE', accountStatus: 'ACTIVE', baseSalary: 15000, loanBalance: 0, ...overrides });
const withQuery = (ui) => <MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider></MemoryRouter>;

describe('StaffRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hr.getStaffingRecommendations.mockResolvedValue({ employee_count: 2, farm_size: 'SMALL', recommended_roles: {} });
    staffState.value = {
      staff: [member(), member({ id: 2, name: 'Mary Wanjiru', status: 'INACTIVE', accountStatus: 'NONE' })],
      isHydrating: false,
      editEmployee: vi.fn().mockResolvedValue({}),
      updateEmployeePageAccess: vi.fn().mockResolvedValue({}),
      offboardEmployee: vi.fn().mockResolvedValue({}),
      deleteEmployee: vi.fn().mockResolvedValue(),
      recordRepayment: vi.fn().mockResolvedValue({}),
      addEmployee: vi.fn(), inviteEmployeeAccount: vi.fn(), provisionEmployeeAccount: vi.fn(), issueAdvance: vi.fn(), verifyReturn: vi.fn(),
    };
  });

  it('shows words, not codes, and hides former staff until asked', () => {
    render(withQuery(<StaffRegistry />));
    const card = screen.getByRole('article', { name: 'Peter Otieno' });
    expect(within(card).getByText('Farmhand')).toBeTruthy();
    expect(within(card).getByText('Can sign in')).toBeTruthy();
    expect(screen.queryByRole('article', { name: 'Mary Wanjiru' })).toBeNull();

    fireEvent.click(screen.getByLabelText(/Show former staff \(1\)/));
    expect(within(screen.getByRole('article', { name: 'Mary Wanjiru' })).getByText('Former staff')).toBeTruthy();
  });

  it('shows a loading state, then an empty state with the next step', () => {
    staffState.value = { ...staffState.value, isHydrating: true };
    const { unmount } = render(withQuery(<StaffRegistry />));
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    unmount();
    staffState.value = { ...staffState.value, isHydrating: false, staff: [] };
    render(withQuery(<StaffRegistry />));
    expect(screen.getByRole('button', { name: /Add your first employee/ })).toBeTruthy();
  });

  it('offboards through the backend with an end date and reason', async () => {
    render(withQuery(<StaffRegistry />));
    fireEvent.click(within(screen.getByRole('article', { name: 'Peter Otieno' })).getByRole('button', { name: 'Offboard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Offboard Peter Otieno' });
    expect(within(dialog).getByText(/turns off their login/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'CONTRACT_ENDED' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Offboard' }));

    await waitFor(() => expect(staffState.value.offboardEmployee).toHaveBeenCalledWith(1, expect.objectContaining({ reason: 'CONTRACT_ENDED', end_date: expect.any(String) })));
    expect(staffState.value.updateEmployeePageAccess).not.toHaveBeenCalled();
  });

  it('needs a note when the reason is Other', async () => {
    render(withQuery(<StaffRegistry />));
    fireEvent.click(within(screen.getByRole('article', { name: 'Peter Otieno' })).getByRole('button', { name: 'Offboard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Offboard Peter Otieno' });
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'OTHER' } });
    expect(within(dialog).getByRole('button', { name: 'Offboard' }).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Note \(required/), { target: { value: 'Moved to Nakuru' } });
    expect(within(dialog).getByRole('button', { name: 'Offboard' }).disabled).toBe(false);
  });

  it('offers Offboard when a delete is refused because of history', async () => {
    staffState.value.deleteEmployee.mockRejectedValue(Object.assign(new Error('409'), {
      response: { status: 409, data: { code: 'HAS_HISTORY', error: 'Has history', history: ['payroll', 'advances'], can_offboard: true }, headers: {} },
    }));
    render(withQuery(<StaffRegistry />));
    fireEvent.click(within(screen.getByRole('article', { name: 'Peter Otieno' })).getByRole('button', { name: 'Delete (added by mistake)' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Delete Peter Otieno?' })).getByRole('button', { name: 'Delete' }));

    const refused = await screen.findByRole('dialog', { name: 'Peter Otieno can’t be deleted' });
    expect(within(refused).getAllByText(/payroll and advances on record/).length).toBeGreaterThan(0);
    fireEvent.click(within(refused).getByRole('button', { name: 'Offboard instead' }));
    expect(await screen.findByRole('dialog', { name: 'Offboard Peter Otieno' })).toBeTruthy();
  });

  it('records a cash repayment of an advance', async () => {
    staffState.value = { ...staffState.value, staff: [member({ loanBalance: 4000 })] };
    render(withQuery(<StaffRegistry />));
    fireEvent.click(within(screen.getByRole('article', { name: 'Peter Otieno' })).getByRole('button', { name: 'Record repayment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Record a repayment from Peter Otieno' });
    fireEvent.change(within(dialog).getByLabelText('Amount repaid (KES)'), { target: { value: '1500' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record repayment' }));
    await waitFor(() => expect(staffState.value.recordRepayment).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), expect.objectContaining({ amount: 1500 })));
  });

  it('won’t offboard someone who still owes an advance', async () => {
    staffState.value = { ...staffState.value, staff: [member({ loanBalance: 4000 })] };
    render(withQuery(<StaffRegistry />));
    fireEvent.click(within(screen.getByRole('article', { name: 'Peter Otieno' })).getByRole('button', { name: 'Offboard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Offboard Peter Otieno' });
    expect(within(dialog).getByText(/still owes KES 4,000/)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Offboard' }).disabled).toBe(true);
  });
});

describe('Payroll', () => {
  const finalized = {
    id: '2026-10', payrollYear: 2026, payrollMonth: 10, period: 'October 2026', status: 'FINALIZED', employees: 1, totalDisbursed: 26193.75,
    summary: { totalBase: 30000, totalLeave: 0, totalGross: 30000, totalDeductions: 3806.25, totalNet: 26193.75 },
    statutoryTotals: { paye: 731.25, nssf: 1800, shif: 825, housingLevy: 450, employerContributions: 2250 },
    lineItems: [{
      staffId: 1, name: 'Peter Otieno', role: 'FARM_HAND', base: 30000, leaveDeduction: 0, grossPay: 30000, daysPaid: null,
      paye: 731.25, nssfEmployee: 1800, shif: 825, housingLevyEmployee: 450, totalStatutory: 3806.25,
      advanceDeduction: 0, net: 26193.75, status: 'PENDING',
    }],
  };
  const summaryRow = { id: '2026-10', payrollYear: 2026, payrollMonth: 10, period: 'October 2026', status: 'FINALIZED', employees: 1, totalDisbursed: 26193.75 };

  beforeEach(() => {
    vi.clearAllMocks();
    staffState.value = {};
    hr.payrollSummary.mockResolvedValue({ runs: [summaryRow], nextPeriod: { id: '2026-11', payroll_year: 2026, payroll_month: 11, existing_status: null } });
    hr.getPayrollRun.mockResolvedValue(finalized);
    hr.payPayrollRun.mockResolvedValue({ ...finalized, status: 'PAID', paidAt: '2026-10-31T10:00:00Z' });
    hr.downloadPayslip.mockResolvedValue(new Blob(['%PDF']));
    URL.createObjectURL = vi.fn(() => 'blob:payslip');
    URL.revokeObjectURL = vi.fn();
  });

  it('loads history in one request and only the open run’s details', async () => {
    render(<Payroll />);
    expect(await screen.findByRole('heading', { name: 'October 2026 payroll' })).toBeTruthy();
    expect(hr.payrollSummary).toHaveBeenCalledTimes(1);
    expect(hr.getPayrollRun).toHaveBeenCalledTimes(1);
    expect(hr.getPayrollRun).toHaveBeenCalledWith('2026-10');
    expect(screen.getByRole('button', { name: /Create November 2026 payroll/ })).toBeTruthy();
  });

  it('shows the statutory deductions and what the farm pays as employer', async () => {
    render(<Payroll />);
    expect((await screen.findAllByText('PAYE 731.25 · NSSF 1,800 · SHIF 825 · Housing Levy 450')).length).toBeGreaterThan(0);
    expect(screen.getByText(/The farm also pays KES 2,250 in employer NSSF and Housing Levy/)).toBeTruthy();
  });

  it('opens the existing draft instead of creating a second one', async () => {
    hr.payrollSummary.mockResolvedValue({ runs: [summaryRow], nextPeriod: { id: '2026-11', payroll_year: 2026, payroll_month: 11, existing_status: 'Draft' } });
    render(<Payroll />);
    expect(await screen.findByRole('button', { name: /Open November 2026 draft/ })).toBeTruthy();
  });

  it('downloads a payslip from the backend once the run is finalized', async () => {
    render(<Payroll />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Payslip/ }))[0]);
    await waitFor(() => expect(hr.downloadPayslip).toHaveBeenCalledWith('2026-10', 1));
  });

  it('needs a payment reference before recording an M-Pesa payment, then sends it', async () => {
    render(<Payroll />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pay October 2026 payroll' });
    const pay = within(dialog).getByRole('button', { name: 'Record as paid' });
    expect(pay.disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText('Payment reference'), { target: { value: 'QJK1234567' } });
    fireEvent.click(pay);
    await waitFor(() => expect(hr.payPayrollRun).toHaveBeenCalledWith('2026-10', { payment_reference: 'M-Pesa: QJK1234567' }));
  });

  it('asks before finalizing a draft', async () => {
    hr.getPayrollRun.mockResolvedValue({ ...finalized, status: 'DRAFT' });
    render(<Payroll />);
    fireEvent.click(await screen.findByRole('button', { name: 'Finalize' }));
    expect(await screen.findByRole('dialog', { name: 'Finalize October 2026 payroll?' })).toBeTruthy();
    expect(hr.finalizePayrollRun).not.toHaveBeenCalled();
  });

  it('says it is loading rather than that there is no payroll', () => {
    hr.payrollSummary.mockReturnValue(new Promise(() => {}));
    render(<Payroll />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText('No payroll yet')).toBeNull();
  });
});
