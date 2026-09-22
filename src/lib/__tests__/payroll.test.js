import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiClientMock = vi.hoisted(() => ({
  request: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  default: apiClientMock,
  resolveBackendAssetUrl: vi.fn(),
}));

import { hrApi, normalizePayrollRun } from '../backendApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('normalizePayrollRun', () => {
  it('preserves line items and totals from a payroll run response envelope', () => {
    const result = normalizePayrollRun({
      message: 'Payroll run already exists.',
      lineItems: [{
        staffId: 1,
        staffName: 'domic',
        baseSalary: 7000,
        grossPay: 7000,
        netPay: 7000,
        status: 'ACTIVE',
      }],
      run: {
        id: '2026-09',
        payrollMonth: 9,
        payrollYear: 2026,
        staffCount: 1,
        status: 'Draft',
        totalGrossPay: 7000,
        totalNetPay: 7000,
      },
      summary: {
        staff_count: 1,
        total_deductions: 0,
        total_gross_pay: 7000,
        total_leave_deductions: 0,
        total_net_pay: 7000,
      },
    });

    expect(result).toMatchObject({
      id: '2026-09',
      period: 'September 2026',
      employees: 1,
      totalDisbursed: 7000,
      status: 'DRAFT',
      message: 'Payroll run already exists.',
      summary: {
        totalBase: 7000,
        totalLeave: 0,
        totalGross: 7000,
        totalDeductions: 0,
        totalNet: 7000,
      },
    });
    expect(result.lineItems).toEqual([
      expect.objectContaining({ staffId: 1, name: 'domic', base: 7000, grossPay: 7000, net: 7000 }),
    ]);
  });
});

describe('hrApi.listPayrollRuns', () => {
  it('hydrates list summaries with line items from each run detail', async () => {
    apiClientMock.request.mockResolvedValueOnce({
      data: [{
        id: '2026-09',
        payrollMonth: 9,
        payrollYear: 2026,
        staffCount: 1,
        totalNetPay: 7000,
      }],
    });
    apiClientMock.get.mockResolvedValueOnce({
      data: {
        run: {
          id: '2026-09',
          payrollMonth: 9,
          payrollYear: 2026,
          staffCount: 1,
          totalNetPay: 7000,
        },
        lineItems: [{ staffId: 1, staffName: 'domic', baseSalary: 7000, netPay: 7000 }],
      },
    });

    const result = await hrApi.listPayrollRuns();

    expect(apiClientMock.get).toHaveBeenCalledWith('/hr/payroll/runs/2026-09');
    expect(result[0]).toMatchObject({ employees: 1, totalDisbursed: 7000 });
    expect(result[0].lineItems).toEqual([
      expect.objectContaining({ staffId: 1, name: 'domic', base: 7000, net: 7000 }),
    ]);
  });
});