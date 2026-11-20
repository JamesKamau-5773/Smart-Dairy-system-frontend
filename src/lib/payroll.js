import { formatMonthYear } from './dateFormat';
import { staffCopy } from '../i18n/staff';
// Payroll runs as the backend sends them (`/hr/payroll/runs`, normalised by
// normalizePayrollRun). Pure helpers for ordering, wording and export.

const yearMonth = (run) => ({
  year: Number(run?.payrollYear ?? run?.payroll_year),
  month: Number(run?.payrollMonth ?? run?.payroll_month),
});

const sortKey = (run) => {
  const { year, month } = yearMonth(run);
  return Number.isFinite(year) && Number.isFinite(month) ? year * 12 + month : -Infinity;
};

/** Newest period first, by the backend's year and month (not by list order). */
export function sortRunsNewestFirst(runs) {
  return [...(Array.isArray(runs) ? runs : [])].sort((a, b) => sortKey(b) - sortKey(a));
}

/**
 * The period the next run covers: the backend's `next_period` (payroll summary).
 * Only if a backend doesn't send it: the month after the newest run, from its
 * numeric year/month (never by parsing a month name, which depends on the locale).
 */
export function nextPayrollPeriod(runs, backendNext, now = new Date()) {
  const fromBackend = backendNext && yearMonth(backendNext);
  if (fromBackend && Number.isFinite(fromBackend.year) && Number.isFinite(fromBackend.month)) {
    return { payroll_year: fromBackend.year, payroll_month: fromBackend.month };
  }
  const latest = sortRunsNewestFirst(runs)[0];
  const { year, month } = yearMonth(latest);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return { payroll_year: now.getFullYear(), payroll_month: now.getMonth() + 1 };
  }
  return month === 12 ? { payroll_year: year + 1, payroll_month: 1 } : { payroll_year: year, payroll_month: month + 1 };
}

/** "November 2026" for a year/month, in the device's language. */
export function periodLabel({ payroll_year: year, payroll_month: month }) {
  return formatMonthYear(new Date(year, month - 1, 1));
}

/** The last day of the period, when salaries are usually paid. */
export function periodPayDate(period) {
  const lastDay = new Date(period.payroll_year, period.payroll_month, 0);
  return `${lastDay.getDate()} ${formatMonthYear(lastDay)}`;
}

export const RUN_STATUS = Object.freeze({
  // `tone` names a TONES entry (components/ui/tones), drawn by the status chip.
  DRAFT: { get label() { return staffCopy.payroll.runStatuses.DRAFT; }, tone: 'neutral' },
  FINALIZED: { get label() { return staffCopy.payroll.runStatuses.FINALIZED; }, tone: 'attention' },
  PAID: { get label() { return staffCopy.payroll.runStatuses.PAID; }, tone: 'info' },
});

export const runStatus = (status) => RUN_STATUS[String(status ?? '').toUpperCase()] ?? { label: String(status ?? ''), tone: 'neutral' };

export const lineStatusLabel = (status) => staffCopy.payroll.lineStatuses[String(status ?? '').toUpperCase()] ?? String(status ?? '');

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** The statutory deductions on a line, in the order a payslip lists them. */
export const STATUTORY_PARTS = Object.freeze([
  ['paye', 'PAYE'],
  ['nssfEmployee', 'NSSF'],
  ['shif', 'SHIF'],
  ['housingLevyEmployee', 'Housing Levy'],
]);

/** "PAYE 731 · NSSF 1,800 · …" from the backend's figures; '' when none were sent. */
export function statutoryBreakdown(line) {
  return STATUTORY_PARTS
    .filter(([key]) => line?.[key] !== null && line?.[key] !== undefined)
    .map(([key, label]) => `${key === 'housingLevyEmployee' ? staffCopy.payroll.housingLevy : label} ${Number(line[key]).toLocaleString()}`)
    .join(' · ');
}

/** Payslips exist once a run is finalized (the backend answers 409 for drafts). */
export const canDownloadPayslips = (status) => ['FINALIZED', 'PAID'].includes(String(status ?? '').toUpperCase());

/** The run as CSV (backend figures only), for the accountant or bank upload. */
export function payrollRunToCsv(run) {
  const header = ['Employee', 'Role', 'Base salary', 'Leave adjustment', 'Gross pay', 'PAYE', 'NSSF', 'SHIF', 'Housing Levy', 'Advance deductions', 'Net pay', 'Status'];
  const rows = (run?.lineItems ?? []).map((line) => [
    line.name, line.role, line.base, line.leaveDeduction, line.grossPay,
    line.paye, line.nssfEmployee, line.shif, line.housingLevyEmployee,
    line.advanceDeduction, line.net, lineStatusLabel(line.status),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
