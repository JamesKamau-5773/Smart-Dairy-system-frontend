import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Baby, CalendarDays, Droplets, RotateCcw, Users } from 'lucide-react';
import { productionApi } from '../../lib/backendApi';
import { formatCowIdentity } from '../../lib/cowIdentity';
import {
  filterMilkDispositions,
  summarizeConsumptionByCalf,
  summarizeMilkDispositions,
  todayLocalIso,
} from '../../lib/milkDisposition';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import CalfMilkFeedModal from '../../components/operations/CalfMilkFeedModal';
import MilkDispositionHistory from '../../components/operations/MilkDispositionHistory';

void React;

const PAGE_SIZE = 12;
const EMPTY_FILTERS = { calfId: '', from: '', to: '' };
const EMPTY_RECORDS = [];

export default function MilkUsage() {
  const { tenantId, farmId } = useTenant();
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const dispositionsQuery = useQuery({
    queryKey: QUERY_KEYS.MILK_DISPOSITIONS(tenantId, farmId),
    queryFn: () => productionApi.listMilkDispositions(),
    enabled: !!tenantId && !!farmId,
  });

  const records = Array.isArray(dispositionsQuery.data) ? dispositionsQuery.data : EMPTY_RECORDS;
  const summary = useMemo(() => summarizeMilkDispositions(records), [records]);
  const calfTotals = useMemo(() => summarizeConsumptionByCalf(records), [records]);
  const filteredRecords = useMemo(() => filterMilkDispositions(records, filters), [records, filters]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filteredLiters = filteredRecords.reduce((total, record) => total + record.liters, 0);

  const calfOptions = useMemo(() => {
    const options = new Map();
    records.forEach((record) => {
      if (record.calfId) options.set(String(record.calfId), record);
    });
    return Array.from(options.values()).sort((a, b) => formatCowIdentity({ cowName: a.calfName, cowTag: a.calfTag })
      .localeCompare(formatCowIdentity({ cowName: b.calfName, cowTag: b.calfTag })));
  }, [records]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  return (
    <div className="animate-reveal space-y-6">
      <section className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.95),rgba(255,255,255,0.98))] p-5  sm:p-6">
        <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-brand/20 bg-brand/10 px-2 py-1 text-[10px] font-semibold text-brand">
              <Droplets size={12} /> Milk Operations
            </div>
            <h1 className="m-0 font-display text-4xl font-semibold tracking-tight text-brand">
              Milk <span className="text-ink/30">Usage</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Review milk allocated to calves without mixing usage records into production entries.</p>
          </div>
          <button type="button" onClick={() => setShowFeedModal(true)} className="btn-command w-full justify-center gap-2 whitespace-nowrap px-5 py-3 sm:w-auto">
            <Baby size={16} /> Feed Calf
          </button>
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Fed today', value: `${summary.todayLiters.toFixed(2)} L`, icon: Droplets },
            { label: 'Fed this month', value: `${summary.monthLiters.toFixed(2)} L`, icon: CalendarDays },
            { label: 'Calves served', value: summary.calfCount, icon: Users },
            { label: 'Feeding records', value: summary.recordCount, icon: Baby },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start justify-between rounded-2xl border border-ink/10 bg-surface p-4 ">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-brand">{value}</p>
              </div>
              <Icon size={18} className="mt-1 text-brand" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white/90 px-5 py-4 backdrop-blur" aria-label="Milk usage filters">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="form-control">
            <span className="label-text">Calf</span>
            <select value={filters.calfId} onChange={(event) => updateFilter('calfId', event.target.value)} className="input-machined w-full">
              <option value="">All calves</option>
              {calfOptions.map((record) => (
                <option key={record.calfId} value={record.calfId}>{formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}</option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text">From</span>
            <input type="date" value={filters.from} max={filters.to || todayLocalIso()} onChange={(event) => updateFilter('from', event.target.value)} className="input-machined w-full" />
          </label>
          <label className="form-control">
            <span className="label-text">To</span>
            <input type="date" value={filters.to} min={filters.from || undefined} max={todayLocalIso()} onChange={(event) => updateFilter('to', event.target.value)} className="input-machined w-full" />
          </label>
          <div className="flex items-end">
            <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="btn-ghost w-full justify-center gap-2 py-3">
              <RotateCcw size={14} /> Reset filters
            </button>
          </div>
        </div>
      </section>

      {calfTotals.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white/90 backdrop-blur" aria-labelledby="calf-summary-heading">
          <div className="border-b border-ink/10 px-5 py-4">
            <h2 id="calf-summary-heading" className="font-semibold text-ink">Consumption by calf</h2>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead className="sticky top-0 bg-surface-raised text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                <tr><th className="px-5 py-3">Calf</th><th className="px-5 py-3 text-right">Feedings</th><th className="px-5 py-3 text-right">Total milk</th></tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {calfTotals.map((calf) => (
                  <tr key={calf.calfId}>
                    <td className="px-5 py-3 text-sm font-semibold text-ink">{formatCowIdentity({ cowName: calf.calfName, cowTag: calf.calfTag })}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums text-ink-muted">{calf.feedings}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-ink">{calf.liters.toFixed(2)} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <MilkDispositionHistory
        records={pageRecords}
        isLoading={dispositionsQuery.isLoading}
        error={dispositionsQuery.error}
        onRecord={() => setShowFeedModal(true)}
        title="Feeding history"
        totalCount={filteredRecords.length}
        totalLiters={filteredLiters}
        footer={filteredRecords.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-ink-muted">Page {currentPage} of {pageCount}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="btn-ghost px-3 py-2 text-xs disabled:opacity-40">Previous</button>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="btn-secondary px-3 py-2 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        ) : null}
      />

      <CalfMilkFeedModal isOpen={showFeedModal} onClose={() => setShowFeedModal(false)} />
    </div>
  );
}