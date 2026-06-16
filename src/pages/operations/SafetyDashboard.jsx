import { useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck, Search, Filter, CalendarDays, Activity, Milk, Eye, X, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import { Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';

const fetchHardlocks = async () => {
  // This will be replaced with a real API call.
  // For now, it uses the mock defined in `handlers.js`.
  const res = await apiClient.get('/veterinary/hardlocks/active');
  return res.data;
};

function normalizeHardlock(lock) {
  return {
    id: lock.id,
    cowName: lock.cow_name ?? 'Unknown cow',
    cowId: lock.cow_id ?? 'Unknown ID',
    reason: lock.reason ?? 'Not provided',
    severity: lock.severity ?? 'WARNING',
    lockExpires: lock.lock_expires,
    section: lock.section ?? 'Main herd',
    medication: lock.medication ?? 'Not specified',
    updatedAt: lock.updated_at ?? lock.lock_expires,
    updatedBy: lock.updated_by ?? 'Veterinary team',
    notes: lock.notes ?? 'No additional notes available.',
  };
}

export default function MilkSafetyBoard() {
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedLock, setSelectedLock] = useState(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  const { data: hardlocksRaw, isLoading, error } = useQuery({
    queryKey: ['vet_hardlocks'],
    queryFn: fetchHardlocks,
  });

  const hardlocks = Array.isArray(hardlocksRaw)
    ? hardlocksRaw
    : Array.isArray(hardlocksRaw?.items)
      ? hardlocksRaw.items
      : Array.isArray(hardlocksRaw?.data)
        ? hardlocksRaw.data
        : [];

      const normalizedHardlocks = useMemo(() => hardlocks.map(normalizeHardlock), [hardlocks]);

      const filteredHardlocks = useMemo(() => {
        const search = query.trim().toLowerCase();

        return normalizedHardlocks.filter((lock) => {
          const matchesSearch = !search || [lock.cowName, lock.cowId, lock.reason, lock.section, lock.medication, lock.notes]
            .join(' ')
            .toLowerCase()
            .includes(search);
          const matchesSeverity = severityFilter === 'All' || lock.severity === severityFilter;
          return matchesSearch && matchesSeverity;
        });
      }, [normalizedHardlocks, query, severityFilter]);
      const activeFilterCount = [query.trim(), severityFilter !== 'All'].filter(Boolean).length;

      const stats = useMemo(() => {
        const critical = normalizedHardlocks.filter((lock) => lock.severity === 'CRITICAL').length;
        const warning = normalizedHardlocks.filter((lock) => lock.severity === 'WARNING').length;
        const cleared = normalizedHardlocks.filter((lock) => lock.severity === 'CLEARED').length;
        return {
          total: normalizedHardlocks.length,
          critical,
          warning,
          cleared,
        };
      }, [normalizedHardlocks]);

      const hasCritical = stats.critical > 0;

      const severityTone = {
        CRITICAL: 'bg-[#fff1f2] text-[#b91c1c] border-[#fecdd3]',
        WARNING: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
        CLEARED: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
      };

  return (
        <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
          <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(241,250,249,0.95),rgba(255,255,255,0.98))] p-5 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
                  <Activity size={12} /> Milk Safety Operations
                </div>
                <h2 className="font-sans text-3xl font-black tracking-tight text-brand sm:text-4xl">Milk Safety Board</h2>
                <p className="max-w-2xl text-sm leading-6 text-ink-muted">
                  Live list of cows whose milk must be isolated before collection, mixing, or sale.
                </p>
              </div>

              <div className={`flex items-center gap-4 rounded-2xl border bg-surface/90 p-4 ${hasCritical ? 'border-danger/30' : 'border-success/30'}`}>
                {hasCritical ? <ShieldAlert className="text-danger" size={32} /> : <ShieldCheck className="text-success" size={32} />}
                <div>
                  <p className={`font-bold text-xl ${hasCritical ? 'text-danger' : 'text-success'}`}>
                    {hasCritical ? 'Do not mix flagged milk' : 'All active milk is clear'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {stats.total} {stats.total === 1 ? 'cow' : 'cows'} currently under monitoring
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total locks', value: stats.total, icon: Milk },
                { label: 'Critical', value: stats.critical, icon: AlertTriangle },
                { label: 'Warnings', value: stats.warning, icon: ShieldAlert },
                { label: 'Cleared', value: stats.cleared, icon: CheckCircle2 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{item.label}</p>
                        <p className="mt-2 text-3xl font-black text-ink">{item.value}</p>
                      </div>
                      <div className="rounded-2xl border border-white/60 bg-white/80 p-3 text-brand shadow-sm">
                        <Icon size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-ink/10 bg-surface/90 p-4 sm:p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      <Search size={12} /> Search flagged records
                    </div>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">Find milk safety holds by cow, section, medication, or severity.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-ink/10 bg-surface-warm/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      {activeFilterCount} active
                    </span>
                    <button
                      type="button"
                      onClick={() => setControlsOpen((current) => !current)}
                      aria-expanded={controlsOpen}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
                    >
                      {controlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {controlsOpen ? 'Hide filters' : 'Show filters'}
                    </button>
                  </div>
                </div>

                {controlsOpen && (
                  <div className="grid gap-4 pt-4 lg:grid-cols-[1.2fr_0.6fr_auto] lg:items-end">
                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                        <Search size={12} /> Search flagged records
                      </span>
                      <div className="relative">
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          className="input-machined w-full pl-10"
                          placeholder="Cow name, tag, reason, or notes"
                        />
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                      </div>
                    </label>

                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                        <Filter size={12} /> Severity
                      </span>
                      <select className="input-machined w-full" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
                        <option value="All">All severities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="WARNING">Warning</option>
                        <option value="CLEARED">Cleared</option>
                      </select>
                    </label>

                    <button type="button" onClick={() => { setQuery(''); setSeverityFilter('All'); }} className="btn-command bg-surface-raised text-ink h-[46px]">
                      Reset filters
                    </button>
                  </div>
                )}
              </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card-machined bg-surface/80 p-6 rounded-xl space-y-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
            {error && (
              <div className="col-span-full rounded-2xl border border-danger/20 bg-danger/5 p-5 text-danger">
                Could not load the safety list. Please check your connection and retry.
              </div>
            )}

            {filteredHardlocks.map((lock) => (
              <button
                key={lock.id}
                type="button"
                onClick={() => setSelectedLock(lock)}
                className={`card-machined bg-surface/90 p-6 rounded-xl border-l-4 text-left transition-transform hover:-translate-y-0.5 ${lock.severity === 'CRITICAL' ? 'border-danger' : 'border-warning'}`}
              >
                <div className="flex justify-between items-start gap-4">
              <div>
                    <p className="font-bold text-lg text-ink-strong">{lock.cowName}</p>
                <p className="font-mono text-xs text-ink-muted">
                      <Link to={`/operations/animal/${lock.cowId}`} className="text-brand font-bold hover:underline" onClick={(event) => event.stopPropagation()}>
                        Tag: {lock.cowId}
                  </Link>
                </p>
              </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${severityTone[lock.severity] || severityTone.WARNING}`}>
                    {lock.severity}
              </span>
            </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-ink-strong">Treated for: {lock.reason}</p>
                  <p className="text-xs text-ink-muted">Section: {lock.section}</p>
                  <p className="text-xs text-ink-muted">
                    Medicine clears on: {new Date(lock.lockExpires).toLocaleDateString()}
              </p>
            </div>
              </button>
        ))}

            {!isLoading && !error && filteredHardlocks.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-ink/10 rounded-2xl bg-surface-warm/30">
                 <ShieldCheck className="mx-auto text-success/50 mb-3" size={48} />
                 <p className="text-lg font-bold text-ink-strong">No records match the current filters</p>
                 <p className="text-sm text-ink-muted mt-1">Try clearing the filters to see all milk safety alerts.</p>
          </div>
        )}
      </div>

          <Modal isOpen={!!selectedLock} onClose={() => setSelectedLock(null)} title="Milk Safety Details">
            {selectedLock && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-ink/10 bg-surface-warm/40 p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-3 text-brand">
                    <ShieldAlert size={18} />
                    <p className="text-xs font-bold uppercase tracking-wider">Safety Summary</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Cow</p>
                      <p className="text-sm font-semibold text-brand">{selectedLock.cowName}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Tag</p>
                      <p className="text-sm text-ink-strong">{selectedLock.cowId}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Severity</p>
                      <p className="text-sm text-ink-strong">{selectedLock.severity}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Expires</p>
                      <p className="text-sm text-ink-strong">{new Date(selectedLock.lockExpires).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Reason</p>
                    <p className="text-sm leading-6 text-ink-strong">{selectedLock.reason}</p>
                  </div>
                  <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Medication</p>
                    <p className="text-sm leading-6 text-ink-strong">{selectedLock.medication}</p>
                  </div>
                  <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Notes</p>
                    <p className="text-sm leading-6 text-ink-strong">{selectedLock.notes}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-ink/10 pt-4">
                  <button onClick={() => setSelectedLock(null)} className="btn-command bg-surface-raised text-ink inline-flex items-center gap-2">
                    <X size={16} /> Close
                  </button>
                </div>
              </div>
            )}
          </Modal>
    </div>
  );
}