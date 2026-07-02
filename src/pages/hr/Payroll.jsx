import React, { useState, useMemo, useEffect } from 'react';
import { hrApi } from '../../lib/backendApi';
import { Calendar, CheckCircle, Clock, Users, Banknote, CalendarClock, History } from 'lucide-react';
import { useStaff } from '../../providers/StaffProvider';
import SlidePanel from '../../components/ui/SlidePanel';
import { buildPayrollRun, toPayrollRow } from '../../lib/payroll';

const formatMoney = (value) => Number(value || 0).toLocaleString();

const PayrollActions = ({ onRunPayroll, nextPayrollPeriod }) => (
  <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <h2 className="font-display text-3xl font-extrabold tracking-tight text-gray-900 m-0">Payroll</h2>
      <p className="text-sm font-medium text-gray-600 mt-1">Process and review monthly staff payments, leave adjustments, and advance repayments.</p>
    </div>
    <button 
      onClick={onRunPayroll} 
      className="flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-slate-800"
    >
      Run {nextPayrollPeriod} Payroll
    </button>
  </div>
);

const PayrollKPI = ({ title, value, icon: Icon }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-4">
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{title}</span>
      <p className="mt-1 text-3xl font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-slate-700">
      <Icon size={18} />
    </div>
  </div>
);

const PayrollTable = ({ run, onMarkAsPaid }) => {
  const summary = useMemo(() => {
    const rows = run.details.map(toPayrollRow);
    return {
      totalBase: rows.reduce((acc, row) => acc + row.base, 0),
      totalLeave: rows.reduce((acc, row) => acc + row.leaveDeduction, 0),
      totalGross: rows.reduce((acc, row) => acc + row.grossPay, 0),
      totalDeductions: rows.reduce((acc, row) => acc + row.advanceDeduction, 0),
      totalNet: rows.reduce((acc, row) => acc + row.net, 0),
      rows,
    };
  }, [run.details]);

  return (
  <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
    <div className="flex flex-col gap-2 border-b border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <Calendar size={16} /> Payroll for {run.period}
        </h3>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Accounting flow: base salary → leave adjustment → gross pay → deductions → net pay</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
        <History size={12} /> {run.details.length} employees
      </span>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full table-fixed text-left">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          <tr>
            <th className="px-5 py-3 w-44">Employee</th>
            <th className="px-5 py-3 text-right tabular-nums w-28">Base Salary</th>
            <th className="px-5 py-3 text-right tabular-nums w-28">Leave Adjustments</th>
            <th className="px-5 py-3 text-right tabular-nums w-28">Gross Pay</th>
            <th className="px-5 py-3 text-right tabular-nums w-28">Deductions</th>
            <th className="px-5 py-3 text-right tabular-nums w-28">Net Pay</th>
            <th className="px-5 py-3 text-center w-24">Status</th>
            <th className="px-5 py-3 text-right w-28">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {summary.rows.map((item) => (
            <tr key={item.staffId} className="hover:bg-gray-50/70 transition-colors">
              <td className="px-5 py-4 align-top">
                <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">{item.role}</div>
              </td>
              <td className="px-5 py-4 text-right font-medium tabular-nums text-gray-700 align-top">{formatMoney(item.base)}</td>
              <td className={`px-5 py-4 text-right tabular-nums font-medium align-top ${item.leaveDeduction > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                {item.leaveDeduction > 0 ? `-${formatMoney(item.leaveDeduction)}` : '0'}
                {(item.approvedLeaveDays > 0 || item.overduePenaltyDays > 0) && (
                  <p className="mt-1 text-[10px] font-medium normal-case tracking-normal text-gray-500">
                    {item.approvedLeaveDays > 0 ? `${item.approvedLeaveDays} approved` : 'No approved leave'}
                    {item.overduePenaltyDays > 0 ? ` + ${item.overduePenaltyDays} overdue` : ''}
                  </p>
                )}
              </td>
              <td className="px-5 py-4 text-right tabular-nums font-semibold text-gray-900 align-top">{formatMoney(item.grossPay)}</td>
              <td className={`px-5 py-4 text-right tabular-nums font-medium align-top ${item.advanceDeduction > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                {formatMoney(item.advanceDeduction)}
              </td>
              <td className="px-5 py-4 text-right tabular-nums font-semibold text-gray-900 align-top">{formatMoney(item.net)}</td>
              <td className="px-5 py-4 text-center align-top">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                  item.status === 'PAID' ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'
                }`}>
                  {item.status === 'PAID' ? <CheckCircle size={14} /> : <Clock size={14} />}
                  {item.status}
                </span>
              </td>
              <td className="px-5 py-4 text-right align-top">
                {item.status === 'PENDING' && (
                  <button 
                    onClick={() => onMarkAsPaid(item.staffId)}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Mark Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
          <tr>
            <td className="px-5 py-3">Totals</td>
            <td className="px-5 py-3 text-right tabular-nums">{formatMoney(summary.totalBase)}</td>
            <td className="px-5 py-3 text-right tabular-nums text-red-700">-{formatMoney(summary.totalLeave)}</td>
            <td className="px-5 py-3 text-right tabular-nums">{formatMoney(summary.totalGross)}</td>
            <td className="px-5 py-3 text-right tabular-nums text-amber-700">{formatMoney(summary.totalDeductions)}</td>
            <td className="px-5 py-3 text-right tabular-nums text-gray-900">{formatMoney(summary.totalNet)}</td>
            <td className="px-5 py-3" />
            <td className="px-5 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  );
};

export default function Payroll() {
  const { staff, reduceLoanBalance } = useStaff();
  const [allRuns, setAllRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRuns = async () => {
      try {
        const records = await hrApi.listPayrollRuns();

        if (cancelled) {
          return;
        }

        const normalizedRuns = Array.isArray(records) ? records : [];
        setAllRuns(normalizedRuns);
        setActiveRunId((current) => current ?? normalizedRuns[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load payroll runs.', error);
          setAllRuns([]);
          setActiveRunId(null);
        }
      }
    };

    loadRuns();

    return () => {
      cancelled = true;
    };
  }, []);

  // Derive active run and history from state
  const activeRun = useMemo(() => allRuns.find((r) => r.id === activeRunId) || allRuns[0] || null, [allRuns, activeRunId]);
  const payrollHistory = useMemo(() => (activeRun ? allRuns.filter((r) => r.id !== activeRun.id) : allRuns), [allRuns, activeRun]);

  const getNextPayrollPeriod = (latestRun) => {
      const [monthStr, yearStr] = latestRun.period.split(' ');
      const date = new Date(`${monthStr} 1, ${yearStr}`);
      date.setMonth(date.getMonth() + 1);
      const nextMonth = date.toLocaleString('default', { month: 'long' });
      const nextYear = date.getFullYear();
      return { period: `${nextMonth} ${nextYear}`, date: date };
  };

  const handleRunPayroll = () => {
    const latestRun = allRuns[0];
    const { period: nextPeriod, date: nextDate } = getNextPayrollPeriod(latestRun);
    const [month, year] = nextPeriod.split(' ');

    const payrollStaff = staff.filter(s => s.status !== 'INACTIVE');
    const newRun = buildPayrollRun(payrollStaff, nextPeriod, new Date(year, nextDate.getMonth() + 1, 0).toISOString().split('T')[0]);

    setAllRuns(prevRuns => [newRun, ...prevRuns]);
    setActiveRunId(newRun.id);
  };

  const handleMarkAsPaid = (staffIdToPay) => {
    setAllRuns(prevRuns => 
      prevRuns.map(run => {
        if (run.id === activeRunId) {
          const updatedDetails = run.details.map(employee => {
            if (employee.staffId === staffIdToPay) {
              // When marking as paid, also reduce the central loan balance.
              reduceLoanBalance(staffIdToPay, employee.advanceDeduction ?? employee.deductions);
              return { ...employee, status: 'PAID' };
            }
            return employee;
          });
          const newTotal = updatedDetails
            .filter(e => e.status === 'PAID')
            .reduce((acc, emp) => acc + emp.net, 0);

          return { ...run, details: updatedDetails, totalDisbursed: newTotal };
        }
        return run;
      })
    );
  };

  const nextPayrollInfo = useMemo(() => {
    if (!allRuns.length) return { period: 'Next run', displayDate: 'No payroll runs available yet' };
    const { period, date } = getNextPayrollPeriod(allRuns[0]);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return {
        period,
        displayDate: `${date.toLocaleString('default', { month: 'long' })} ${lastDay}, ${date.getFullYear()}`
    };
  }, [allRuns]);

  if (!activeRun) {
    return (
      <div className="animate-reveal min-h-full bg-[#F7F6F3] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] rounded-md border border-gray-200 bg-white p-8 text-sm text-gray-600">
          No payroll runs are available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-reveal min-h-full bg-[#F7F6F3] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <PayrollActions onRunPayroll={handleRunPayroll} nextPayrollPeriod={nextPayrollInfo.period} />

        <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-none">
          <div className="grid divide-y divide-gray-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            <PayrollKPI title={`Total Payroll (${activeRun.period.split(' ')[0]})`} value={`KSh ${activeRun.totalDisbursed.toLocaleString()}`} icon={Banknote} />
            <PayrollKPI title="Active Staff" value={`${activeRun.employees} Employees`} icon={Users} />
            <PayrollKPI title="Next Payroll Date" value={nextPayrollInfo.displayDate} icon={CalendarClock} />
          </div>
        </section>

        <section className="space-y-4 rounded-md border border-gray-200 bg-white shadow-none">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Calendar size={16} /> Current payroll run
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">{activeRun.period} • {activeRun.employees} employees</p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:bg-gray-50"
            >
              <History size={12} /> View history
            </button>
          </div>

          <div className="px-0 pb-0">
            <PayrollTable run={activeRun} onMarkAsPaid={handleMarkAsPaid} />
          </div>
        </section>
      </div>

      <SlidePanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Payroll History"
        subtitle="Review prior payroll runs without leaving the current ledger."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Historical runs</p>
            <span className="text-xs font-medium text-gray-500 tabular-nums">{payrollHistory.length} archived</span>
          </div>

          <div className="space-y-2">
            {allRuns.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => setActiveRunId(run.id)}
                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                  activeRunId === run.id
                    ? 'border-slate-900 bg-slate-50 text-gray-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{run.period}</p>
                  <p className="mt-1 text-xs text-gray-500">Processed on {run.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Net payout</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">KSh {run.totalDisbursed.toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
