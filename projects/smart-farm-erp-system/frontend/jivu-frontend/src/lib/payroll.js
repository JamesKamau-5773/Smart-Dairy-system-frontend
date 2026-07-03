import { getApprovedLeaveDays, getOverduePenaltyDays, getTotalLeaveDays } from './staffLeave';

const DEFAULT_MONTH_DAYS = 30;

export function calculateLeaveDeduction(staffMember) {
  const unpaidLeaveDays = getTotalLeaveDays(staffMember);

  if (!unpaidLeaveDays) {
    return 0;
  }

  return Math.round((Number(staffMember?.baseSalary || 0) / DEFAULT_MONTH_DAYS) * unpaidLeaveDays);
}

export function calculateAdvanceDeduction(staffMember) {
  const monthlyDeduction = Number(staffMember?.monthlyDeduction || 0);
  const loanBalance = Number(staffMember?.loanBalance || 0);

  return Math.min(loanBalance, monthlyDeduction);
}

export function toPayrollRow(item) {
  const leaveDeduction = Number(item.leaveDeduction ?? 0);
  const advanceDeduction = Number(item.advanceDeduction ?? item.deductions ?? 0);
  const grossPay = Number(item.grossPay ?? item.base - leaveDeduction);
  const netPay = Number(item.net ?? Math.max(0, grossPay - advanceDeduction));

  return {
    ...item,
    leaveDeduction,
    advanceDeduction,
    grossPay,
    net: netPay,
    approvedLeaveDays: Number(item.approvedLeaveDays ?? 0),
    overduePenaltyDays: Number(item.overduePenaltyDays ?? 0),
    leaveAdjustmentDays: Number(item.leaveAdjustmentDays ?? 0),
    deductions: leaveDeduction + advanceDeduction,
  };
}

export function buildPayrollRun(staffMembers, period, date) {
  const payrollDate = new Date(date);
  const details = staffMembers.map((staffMember) => {
    const approvedLeaveDays = getApprovedLeaveDays(staffMember);
    const overduePenaltyDays = getOverduePenaltyDays(staffMember, payrollDate);
    const leaveAdjustmentDays = approvedLeaveDays + overduePenaltyDays;
    const leaveDeduction = Math.round((Number(staffMember.baseSalary || 0) / DEFAULT_MONTH_DAYS) * leaveAdjustmentDays);
    const advanceDeduction = calculateAdvanceDeduction(staffMember);
    const grossPay = Math.max(0, Number(staffMember.baseSalary || 0) - leaveDeduction);

    return {
      staffId: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      base: Number(staffMember.baseSalary || 0),
      approvedLeaveDays,
      overduePenaltyDays,
      leaveAdjustmentDays,
      leaveDeduction,
      grossPay,
      advanceDeduction,
      deductions: leaveDeduction + advanceDeduction,
      net: Math.max(0, grossPay - advanceDeduction),
      status: 'PENDING',
    };
  });

  return {
    id: `run_${date.slice(0, 7).replace('-', '_')}`,
    date,
    period,
    employees: staffMembers.length,
    details,
    totalDisbursed: details.reduce((acc, row) => acc + row.net, 0),
  };
}
