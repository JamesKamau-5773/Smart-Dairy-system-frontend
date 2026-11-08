import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarClock, Download, FileText, History, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import PayPayrollModal from '../../components/forms/PayPayrollModal';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import SlidePanel from '../../components/ui/SlidePanel';
import { Skeleton } from '../../components/ui';
import { getApiErrorMessage, hrApi } from '../../lib/backendApi';
import { downloadBlob } from '../../lib/download';
import { offlineFailureMessage } from '../../lib/offlinePolicy';
import { canDownloadPayslips, lineStatusLabel, nextPayrollPeriod, payrollRunToCsv, periodLabel, periodPayDate, runStatus, sortRunsNewestFirst, statutoryBreakdown } from '../../lib/payroll';
import { roleLabel } from '../../lib/staffLabels';
import { tone } from '../../components/ui/tones';

const money = (value) => Number(value || 0).toLocaleString();

function Kpi({ title, value, Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-card border border-ink/10 bg-card p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
      </div>
      <Icon size={18} className="mt-1 text-brand" aria-hidden="true" />
    </div>
  );
}

function StatusChip({ status }) {
  const { label, tone: toneName } = runStatus(status);
  return <span className={`inline-flex rounded-badge px-2 py-0.5 text-xs font-semibold ${tone(toneName).chip}`}>{label}</span>;
}

// Totals are the backend's (`summary`); without them, none are shown rather than added up here.
function RunTotals({ summary, statutoryTotals }) {
  if (!summary) return null;
  const employer = statutoryTotals?.employerContributions;
  return (
    <>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink/10 px-5 py-4 text-sm sm:grid-cols-5">
      {[
        ['Base', summary.totalBase],
        ['Leave adjustments', -summary.totalLeave],
        ['Gross', summary.totalGross],
        ['Deductions', -summary.totalDeductions],
        ['Net pay', summary.totalNet],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
          <dd className={`tabular-nums ${label === 'Net pay' ? 'text-base font-bold text-ink' : 'text-ink'}`}>KES {money(value)}</dd>
        </div>
      ))}
    </dl>
    {statutoryTotals?.paye !== null && statutoryTotals?.paye !== undefined && (
      <p className="border-t border-ink/10 px-5 py-3 text-xs text-ink-muted">
        Deductions include PAYE KES {money(statutoryTotals.paye)}, NSSF KES {money(statutoryTotals.nssf)}, SHIF KES {money(statutoryTotals.shif)} and Housing Levy KES {money(statutoryTotals.housingLevy)}.
        {employer !== null && employer !== undefined && <> The farm also pays KES {money(employer)} in employer NSSF and Housing Levy.</>}
      </p>
    )}
    </>
  );
}

function LeaveNote({ line }) {
  if (!(line.approvedLeaveDays > 0 || line.overduePenaltyDays > 0)) return null;
  return (
    <span className="block text-xs text-ink-muted">
      {line.approvedLeaveDays > 0 ? `${line.approvedLeaveDays} leave days` : ''}
      {line.approvedLeaveDays > 0 && line.overduePenaltyDays > 0 ? ' · ' : ''}
      {line.overduePenaltyDays > 0 ? `${line.overduePenaltyDays} days overdue` : ''}
    </span>
  );
}

function StatutoryCell({ line }) {
  if (line.totalStatutory === null) return <span className="text-ink-muted">—</span>;
  return (
    <>
      {line.totalStatutory > 0 ? `−${money(line.totalStatutory)}` : '0'}
      <span className="block text-xs text-ink-muted">{statutoryBreakdown(line)}</span>
    </>
  );
}

function PayslipButton({ line, run, onDownload, pending }) {
  if (!canDownloadPayslips(run.status)) return null;
  return (
    <button type="button" onClick={() => onDownload(line)} disabled={pending} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-brand underline-offset-4 hover:underline disabled:opacity-50">
      <FileText size={14} aria-hidden="true" /> {pending ? 'Preparing…' : 'Payslip'}
    </button>
  );
}

function PayrollLines({ run, onPayslip, payslipPending }) {
  const lines = run.lineItems ?? [];
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-left">
          <thead className="border-b border-ink/10 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              <th scope="col" className="px-5 py-3">Employee</th>
              <th scope="col" className="px-5 py-3 text-right">Base</th>
              <th scope="col" className="px-5 py-3 text-right">Leave</th>
              <th scope="col" className="px-5 py-3 text-right">Gross</th>
              <th scope="col" className="px-5 py-3 text-right">Statutory</th>
              <th scope="col" className="px-5 py-3 text-right">Advances</th>
              <th scope="col" className="px-5 py-3 text-right">Net pay</th>
              <th scope="col" className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {lines.map((line) => (
              <tr key={line.staffId}>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-semibold text-ink">{line.name}</p>
                  <p className="text-xs text-ink-muted">{roleLabel(line.role)}</p>
                </td>
                <td className="px-5 py-3.5 text-right text-sm tabular-nums text-ink">{money(line.base)}</td>
                <td className="px-5 py-3.5 text-right text-sm tabular-nums text-ink">
                  {line.leaveDeduction > 0 ? `−${money(line.leaveDeduction)}` : '0'}
                  <LeaveNote line={line} />
                </td>
                <td className="px-5 py-3.5 text-right text-sm tabular-nums text-ink">
                  {money(line.grossPay)}
                  {line.daysPaid !== null && <span className="block text-xs text-ink-muted">{line.daysPaid} days paid</span>}
                </td>
                <td className="px-5 py-3.5 text-right text-sm tabular-nums text-ink"><StatutoryCell line={line} /></td>
                <td className="px-5 py-3.5 text-right text-sm tabular-nums text-ink">{line.advanceDeduction > 0 ? `−${money(line.advanceDeduction)}` : '0'}</td>
                <td className="px-5 py-3.5 text-right text-sm font-bold tabular-nums text-ink">{money(line.net)}</td>
                <td className="px-5 py-3.5 text-sm text-ink-muted">
                  {lineStatusLabel(line.status)}
                  <span className="block"><PayslipButton line={line} run={run} onDownload={onPayslip} pending={payslipPending === line.staffId} /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {lines.map((line) => (
          <article key={line.staffId} className="rounded-card border border-ink/10 p-4" aria-label={line.name}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold text-ink">{line.name}</h4>
                <p className="text-xs text-ink-muted">{roleLabel(line.role)}</p>
              </div>
              <span className="text-xs text-ink-muted">{lineStatusLabel(line.status)}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-ink-muted">Base</dt><dd className="font-semibold tabular-nums text-ink">KES {money(line.base)}</dd></div>
              <div><dt className="text-ink-muted">Leave</dt><dd className="font-semibold tabular-nums text-ink">KES {money(line.leaveDeduction)}</dd><LeaveNote line={line} /></div>
              <div><dt className="text-ink-muted">Gross</dt><dd className="font-semibold tabular-nums text-ink">KES {money(line.grossPay)}</dd>{line.daysPaid !== null && <dd className="text-ink-muted">{line.daysPaid} days paid</dd>}</div>
              <div><dt className="text-ink-muted">Advances</dt><dd className="font-semibold tabular-nums text-ink">KES {money(line.advanceDeduction)}</dd></div>
              <div className="col-span-2"><dt className="text-ink-muted">Statutory deductions</dt><dd className="font-semibold tabular-nums text-ink"><StatutoryCell line={line} /></dd></div>
              <div className="col-span-2 border-t border-ink/10 pt-2"><dt className="text-ink-muted">Net pay</dt><dd className="text-base font-bold tabular-nums text-ink">KES {money(line.net)}</dd></div>
            </dl>
            <div className="mt-2"><PayslipButton line={line} run={run} onDownload={onPayslip} pending={payslipPending === line.staffId} /></div>
          </article>
        ))}
      </div>
    </>
  );
}

export default function Payroll() {
  const confirmation = useConfirmation();
  const [runs, setRuns] = useState([]);
  const [backendNext, setBackendNext] = useState(null);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [activeRunId, setActiveRunId] = useState(null);
  // Full runs (lines and totals) by id, fetched only when opened.
  const [details, setDetails] = useState({});
  const [detailError, setDetailError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(null); // 'run' | 'finalize' | 'pay'
  const [payslipPending, setPayslipPending] = useState(null);

  // Bumped by "Try again"; the effect reloads whenever it changes.
  const [reloadKey, setReloadKey] = useState(0);

  // One request for the history and the next period (backend `runs/summary`).
  useEffect(() => {
    let cancelled = false;
    hrApi.payrollSummary()
      .then(({ runs: summaryRuns, nextPeriod: next }) => {
        if (cancelled) return;
        const ordered = sortRunsNewestFirst(summaryRuns);
        setRuns(ordered);
        setBackendNext(next);
        setActiveRunId((current) => current ?? ordered[0]?.id ?? null);
        setLoadError('');
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(getApiErrorMessage(error, 'Payroll runs could not be loaded.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!activeRunId || details[activeRunId]) return undefined;
    let cancelled = false;
    hrApi.getPayrollRun(activeRunId)
      .then((run) => { if (!cancelled) setDetails((current) => ({ ...current, [run.id]: run })); })
      .catch((error) => { if (!cancelled) setDetailError(getApiErrorMessage(error, 'This payroll run could not be loaded.')); });
    return () => {
      cancelled = true;
    };
  }, [activeRunId, details]);

  const retry = () => {
    setStatus('loading');
    setDetailError('');
    setDetails({});
    setReloadKey((key) => key + 1);
  };

  const activeSummary = useMemo(() => runs.find((run) => run.id === activeRunId) ?? runs[0] ?? null, [runs, activeRunId]);
  const activeRun = activeSummary ? details[activeSummary.id] ?? null : null;
  const nextPeriod = useMemo(() => nextPayrollPeriod(runs, backendNext), [runs, backendNext]);
  const nextLabel = periodLabel(nextPeriod);
  // The backend says when the next period already has a draft; open it instead of creating another.
  const nextDraftId = backendNext?.existing_status ? backendNext.id : null;

  const replaceRun = (updated) => {
    setDetails((current) => ({ ...current, [updated.id]: updated }));
    setRuns((current) => sortRunsNewestFirst([updated, ...current.filter((run) => run.id !== updated.id)]));
  };

  const downloadPayslip = async (line) => {
    setPayslipPending(line.staffId);
    try {
      const pdf = await hrApi.downloadPayslip(activeRun.id, line.staffId);
      downloadBlob(pdf, `payslip-${activeRun.id}-${line.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `${line.name}'s payslip could not be downloaded.`));
    } finally {
      setPayslipPending(null);
    }
  };

  const runPayroll = async () => {
    if (nextDraftId) {
      setActiveRunId(nextDraftId);
      return;
    }
    const confirmed = await confirmation.confirm({
      title: `Create the ${nextLabel} payroll?`,
      message: 'It works out pay from current salaries, approved leave, statutory deductions (PAYE, NSSF, SHIF, Housing Levy) and advance repayments. Nothing is paid until you finalize it and record the payment.',
      confirmText: 'Create payroll',
      type: 'info',
    });
    if (!confirmed) return;
    setBusy('run');
    try {
      const created = await hrApi.runPayroll(nextPeriod);
      replaceRun(created);
      setActiveRunId(created.id);
      toast.success(created.message || `${nextLabel} payroll created as a draft.`);
    } catch (error) {
      toast.error(offlineFailureMessage(error, 'The payroll run was not created.') || getApiErrorMessage(error, 'The payroll run was not created.'));
    } finally {
      setBusy(null);
    }
  };

  const finalize = async () => {
    const confirmed = await confirmation.confirm({
      title: `Finalize ${activeRun.period} payroll?`,
      message: `${activeRun.employees} employees, KES ${money(activeRun.totalDisbursed)} net pay. After this the amounts can’t change.`,
      confirmText: 'Finalize',
      type: 'warning',
    });
    if (!confirmed) return;
    setBusy('finalize');
    try {
      replaceRun(await hrApi.finalizePayrollRun(activeRun.id));
      toast.success('Payroll finalized. Pay staff, then record the payment.');
    } catch (error) {
      toast.error(offlineFailureMessage(error, 'The payroll run was not finalized.') || getApiErrorMessage(error, 'The payroll run was not finalized.'));
    } finally {
      setBusy(null);
    }
  };

  const recordPayment = async (payload) => {
    setBusy('pay');
    try {
      replaceRun(await hrApi.payPayrollRun(activeRun.id, payload));
      setPayOpen(false);
      toast.success(`${activeRun.period} payroll recorded as paid.`);
    } catch (error) {
      toast.error(offlineFailureMessage(error, 'Nothing was recorded as paid.') || getApiErrorMessage(error, 'The payment was not recorded.'));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    downloadBlob(new Blob([payrollRunToCsv(activeRun)], { type: 'text/csv;charset=utf-8' }), `payroll-${activeRun.id}.csv`);
  };

  const runStatusCode = String(activeRun?.status ?? '').toUpperCase();

  return (
    <div className="animate-reveal space-y-5 p-4 sm:p-8">
      <Confirmation {...confirmation} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">People</p>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Payroll</h1>
          <p className="mt-1 text-sm text-ink-muted">Monthly pay, statutory deductions, leave and advance repayments.</p>
        </div>
        <button type="button" onClick={runPayroll} disabled={busy !== null || status !== 'ready'} className="btn-command gap-2 self-start text-sm">
          <Banknote size={16} aria-hidden="true" /> {busy === 'run' ? 'Creating…' : nextDraftId ? `Open ${nextLabel} draft` : `Create ${nextLabel} payroll`}
        </button>
      </header>

      {status === 'loading' && <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-24 w-full" />)}</div>}
      {status === 'error' && <AlertBanner type="danger" message={loadError} onRetry={retry} />}

      {status === 'ready' && !activeSummary && (
        <section className="card-machined p-6">
          <p className="text-base font-bold text-ink">No payroll yet</p>
          <p className="mt-1 text-sm text-ink-muted">Create the {nextLabel} payroll to work out each employee’s pay. You can check it before anything is paid.</p>
        </section>
      )}

      {status === 'ready' && activeSummary && !activeRun && (
        detailError
          ? <AlertBanner type="danger" message={detailError} onRetry={retry} />
          : <div className="space-y-3" aria-busy="true"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>
      )}

      {status === 'ready' && activeRun && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Kpi title={`Net pay · ${activeRun.period}`} value={`KES ${money(activeRun.totalDisbursed)}`} Icon={Banknote} />
            <Kpi title="Employees in this run" value={activeRun.employees} Icon={Users} />
            <Kpi title={`Next payroll · ${nextLabel}`} value={periodPayDate(nextPeriod)} Icon={CalendarClock} />
          </div>

          <section className="card-machined overflow-hidden" aria-labelledby="active-run-title">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="active-run-title" className="text-base font-bold text-ink">{activeRun.period} payroll</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <StatusChip status={activeRun.status} />
                  {activeRun.paidAt && <span>Paid {new Date(activeRun.paidAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {runStatusCode === 'DRAFT' && (
                  <button type="button" onClick={finalize} disabled={busy !== null} className="btn-command text-sm">{busy === 'finalize' ? 'Finalizing…' : 'Finalize'}</button>
                )}
                {runStatusCode === 'FINALIZED' && (
                  <button type="button" onClick={() => setPayOpen(true)} disabled={busy !== null} className="btn-command text-sm">Record payment</button>
                )}
                <button type="button" onClick={exportCsv} className="btn-secondary gap-2 text-sm"><Download size={15} aria-hidden="true" /> Export CSV</button>
                {runs.length > 1 && (
                  <button type="button" onClick={() => setHistoryOpen(true)} className="btn-ghost gap-2 text-sm"><History size={15} aria-hidden="true" /> Earlier runs ({runs.length - 1})</button>
                )}
              </div>
            </div>
            <PayrollLines run={activeRun} onPayslip={downloadPayslip} payslipPending={payslipPending} />
            <RunTotals summary={activeRun.summary} statutoryTotals={activeRun.statutoryTotals} />
          </section>
        </>
      )}

      {payOpen && activeRun && (
        <PayPayrollModal run={activeRun} onClose={() => setPayOpen(false)} onConfirm={recordPayment} isPending={busy === 'pay'} />
      )}

      <SlidePanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Payroll history" subtitle="Open an earlier run to review or export it.">
        <ul className="space-y-2">
          {runs.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => { setActiveRunId(run.id); setHistoryOpen(false); }}
                aria-current={run.id === activeSummary?.id ? 'true' : undefined}
                className={`flex w-full items-center justify-between gap-3 rounded-card border px-4 py-3 text-left ${run.id === activeSummary?.id ? 'border-brand bg-brand-50' : 'border-ink/10 hover:bg-brand-50'}`}
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{run.period || periodLabel({ payroll_year: run.payrollYear ?? run.payroll_year, payroll_month: run.payrollMonth ?? run.payroll_month })}</span>
                  <StatusChip status={run.status} />
                </span>
                <span className="text-right text-sm font-semibold tabular-nums text-ink">KES {money(run.totalDisbursed)}</span>
              </button>
            </li>
          ))}
        </ul>
      </SlidePanel>
    </div>
  );
}
