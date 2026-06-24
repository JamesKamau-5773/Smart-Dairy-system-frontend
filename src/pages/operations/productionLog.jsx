import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "../../hooks/useTenant";
import { QUERY_KEYS } from "../../providers/QueryProvider";
import apiClient from "../../lib/apiClient";
import { Plus, Beaker, AlertTriangle, ShieldCheck, Search, Filter, RotateCcw, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import FastMilkLog from "../../components/operations/FastMilkLog";
import { Link } from "react-router-dom";

export const DEFAULT_MILK_ROWS = [
  {
    id: 'milk-1',
    date: '2026-06-09',
    time: '06:45 AM',
    milker: 'MWANGI',
    cowId: 'C-102',
    cowName: 'LUNA',
    amount: '14.5',
    status: 'Verified',
  },
  {
    id: 'milk-2',
    date: '2026-06-09',
    time: '11:30 AM',
    milker: 'A. KIPRUTO',
    cowId: 'C-214',
    cowName: 'NALA',
    amount: '11.2',
    status: 'Pending',
  },
  {
    id: 'milk-3',
    date: '2026-06-08',
    time: '05:50 PM',
    milker: 'MWANGI',
    cowId: 'C-311',
    cowName: 'ZURI',
    amount: '9.8',
    status: 'Flagged',
  },
];

export function filterMilkRows(rows, filters) {
  return rows.filter((row) => {
    const rowAmount = Number(row.amount);
    const cowIdMatch = filters.cowId
      ? row.cowId.toLowerCase().includes(filters.cowId.toLowerCase())
      : true;
    const dateMatch = filters.date ? row.date === filters.date : true;
    const statusMatch = filters.status === 'all' ? true : row.status.toLowerCase() === filters.status.toLowerCase();
    const minMatch = filters.minAmount ? rowAmount >= Number(filters.minAmount) : true;
    const maxMatch = filters.maxAmount ? rowAmount <= Number(filters.maxAmount) : true;
    return cowIdMatch && dateMatch && statusMatch && minMatch && maxMatch;
  });
}

export default function YieldLog() {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const [showFastLog, setShowFastLog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [fastLogMode, setFastLogMode] = useState('create');
  const [milkRows, setMilkRows] = useState(() => DEFAULT_MILK_ROWS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    date: "",
    cowId: "",
    status: "all",
    minAmount: "",
    maxAmount: "",
  });

  const filteredMilkRows = useMemo(() => {
    return filterMilkRows(milkRows, filters);
  }, [filters, milkRows]);

  const summary = useMemo(() => {
    const verified = milkRows.filter((row) => row.status === 'Verified').length;
    const pending = milkRows.filter((row) => row.status === 'Pending').length;
    const flagged = milkRows.filter((row) => row.status === 'Flagged').length;
    const totalVolume = milkRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return {
      verified,
      pending,
      flagged,
      totalVolume: totalVolume.toFixed(1),
    };
  }, [milkRows]);

  const summaryTone = {
    brand: 'text-brand',
    success: 'text-success',
    warning: 'text-warning-dark',
    danger: 'text-danger',
  };

  const updateFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ date: '', cowId: '', status: 'all', minAmount: '', maxAmount: '' });
  };

  // Integrated Safety Check: Fetching active medical withdrawals
  const { data: hardlocksRaw } = useQuery({
    queryKey: QUERY_KEYS.HARDLOCKS(tenantId, farmId),
    queryFn: () =>
      apiClient.get("/veterinary/hardlocks/active").then((res) => res.data),
    enabled: !!farmId,
  });

  const hardlocks = Array.isArray(hardlocksRaw)
    ? hardlocksRaw
    : Array.isArray(hardlocksRaw?.items)
      ? hardlocksRaw.items
      : Array.isArray(hardlocksRaw?.data)
        ? hardlocksRaw.data
        : [];

  const handleFastLogSaved = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.YIELD_SUMMARY(tenantId, farmId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.YIELD_TREND(tenantId, farmId) });
  };

  const openCreateLog = () => {
    setFastLogMode('create');
    setSelectedRecord(null);
    setShowFastLog(true);
  };

  const openEditLog = (row) => {
    setFastLogMode('edit');
    setSelectedRecord(row);
    setShowFastLog(true);
  };

  const handleLogSave = (savedRecord) => {
    handleFastLogSaved();
    setMilkRows((prev) => {
      const normalizedRow = {
        id: savedRecord?.id || selectedRecord?.id || `milk-${Date.now()}`,
        date: savedRecord?.date || savedRecord?.milkingDate || selectedRecord?.date || new Date().toISOString().slice(0, 10),
        time: selectedRecord?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        milker: selectedRecord?.milker || 'MWANGI',
        cowId: savedRecord?.cowId || selectedRecord?.cowId || '',
        cowName: selectedRecord?.cowName || 'Updated Cow',
        amount: Number(savedRecord?.volume ?? savedRecord?.amount ?? selectedRecord?.amount ?? 0).toFixed(1),
        status: selectedRecord?.status || 'Pending',
      };

      if (fastLogMode === 'edit' && selectedRecord) {
        return prev.map((row) => (row.id === selectedRecord.id ? { ...row, ...normalizedRow } : row));
      }

      return [normalizedRow, ...prev];
    });
  };

  const handleLogDelete = (deletedRecord) => {
    handleFastLogSaved();
    setMilkRows((prev) => prev.filter((row) => row.id !== (deletedRecord?.id || selectedRecord?.id)));
  };

  return (
    <div className="animate-reveal space-y-6">
      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.95),rgba(255,255,255,0.98))] p-5 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-brand/10 text-brand text-[10px] font-semibold tracking-normal mb-4 rounded-md border border-brand/20">
              <Beaker size={12} /> Production Interface
            </div>
            <h2 className="font-display font-semibold text-4xl tracking-tight text-brand m-0">
              Daily <span className="text-ink/30">Milk Log</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Review milk entries, keep withdrawals visible, and work from a single place with filters and edit history.
            </p>
          </div>
          <div className="flex">
            <button
              type="button"
              onClick={openCreateLog}
              className="btn-command w-full sm:w-auto justify-center gap-2 whitespace-nowrap min-h-11 px-4 py-3 sm:px-5 sm:py-3"
            >
              <Plus size={10} className="shrink-0" />
              <span className="text-sm sm:text-base">Record Milk</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total volume', value: `${summary.totalVolume} L`, tone: 'brand' },
            { label: 'Verified entries', value: summary.verified, tone: 'success' },
            { label: 'Pending entries', value: summary.pending, tone: 'warning' },
            { label: 'Flagged entries', value: summary.flagged, tone: 'danger' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{item.label}</p>
              <p className={`mt-2 text-3xl font-black ${summaryTone[item.tone]}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {showFastLog && (
        <FastMilkLog
          mode={fastLogMode}
          record={selectedRecord}
          onClose={() => setShowFastLog(false)}
          onSaveSuccess={handleLogSave}
          onDeleteSuccess={handleLogDelete}
        />
      )}

      {hardlocks?.length > 0 && (
        <div className="card-machined bg-danger/5 border-danger !shadow-[0_10px_28px_rgba(239,68,68,0.22)] p-6 flex gap-6 items-start">
          <div className="p-3 bg-danger text-surface">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="font-display font-semibold text-danger tracking-tight text-lg">
              Cows on Medicine (Do Not Mix!)
            </h4>
            <p className="font-sans text-sm text-ink-normal mt-1 max-w-2xl">
              The system has identified <strong className="text-ink-strong">{hardlocks.length} cows</strong> currently under withdrawal periods.
              Milk entries for these specific IDs are restricted to prevent contamination of the batch.
            </p>
          </div>
        </div>
      )}

      <div className="card-machined p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
            aria-expanded={filtersOpen}
            aria-controls="production-filter-panel"
          >
            <Filter size={12} /> Production filters
            <ChevronDown
              size={12}
              className={`text-ink-muted transition-transform duration-300 ease-out motion-reduce:transition-none ${filtersOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="btn-ghost gap-2 px-3 py-1.5 text-xs"
          >
            <RotateCcw size={14} /> Reset filters
          </button>
        </div>

        {filtersOpen && (
          <div id="production-filter-panel" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Date
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => updateFilter('date', e.target.value)}
                  className="input-machined"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Cow ID
                <input
                  type="text"
                  value={filters.cowId}
                  onChange={(e) => updateFilter('cowId', e.target.value)}
                  placeholder="e.g. C-102"
                  className="input-machined"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Status
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="input-machined"
                >
                  <option value="all">All</option>
                  <option value="Verified">Verified</option>
                  <option value="Pending">Pending</option>
                  <option value="Flagged">Flagged</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Min Amount
                <input
                  type="number"
                  step="0.1"
                  value={filters.minAmount}
                  onChange={(e) => updateFilter('minAmount', e.target.value)}
                  placeholder="0.0"
                  className="input-machined"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Max Amount
                <input
                  type="number"
                  step="0.1"
                  value={filters.maxAmount}
                  onChange={(e) => updateFilter('maxAmount', e.target.value)}
                  placeholder="20.0"
                  className="input-machined"
                />
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Search size={14} />
              Showing {filteredMilkRows.length} of {DEFAULT_MILK_ROWS.length} records
            </div>
          </div>
        )}
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand text-surface">
              <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-surface/95">Time</th>
              <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-surface/95">Milker</th>
              <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-surface/95">Cow ID</th>
              <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-right text-surface/95">Amount</th>
              <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-center text-surface/95">Status</th>
              <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-right text-surface/95">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-ink/5">
            {filteredMilkRows.map((row) => (
              <tr key={row.id} style={{ animationDelay: '0.1s' }} className="animate-stagger group hover:bg-surface-raised transition-colors">
                <td className="p-5 font-sans text-xs text-ink-muted">{row.time}</td>
                <td className="p-5 font-sans text-xs font-medium text-ink">{row.milker}</td>
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <Link to={`/operations/animal/${row.cowId}/milk-history`} className="p-3 text-right font-sans text-1.8xl font-medium text-brand tabular-nums">
                      {row.cowId} ({row.cowName})
                    </Link>
                  </div>
                </td>
                <td className="p-3 text-right font-sans text-1.8xl font-medium text-brand tabular-nums">
                  {row.amount} <span className="text-[18px] opacity-100 ml-0.4">L</span>
                </td>
                <td className="p-5">
                  <div className="flex justify-center">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 border font-sans text-[11px] font-medium ${
                        row.status === 'Verified'
                          ? 'border-brand/20 bg-brand/5 text-brand'
                          : row.status === 'Pending'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-danger/20 bg-danger/5 text-danger'
                      }`}
                    >
                      <ShieldCheck size={10} /> {row.status}
                    </div>
                  </div>
                </td>
                <td className="p-5 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditLog(row)}
                      className="btn-secondary gap-1 px-3 py-2 text-xs"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setMilkRows((prev) => prev.filter((entry) => entry.id !== row.id))}
                      className="btn-danger gap-1 px-3 py-2 text-xs"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMilkRows.length === 0 && (
              <tr>
                <td className="p-6 text-center text-ink-muted" colSpan={6}>
                  No milk log entries match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}