import { useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck, Search, Filter, Activity, Milk, X, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { safetyApi } from '../../lib/backendApi';
import { Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';

const fetchHardlocks = async () => {
  return safetyApi.activeHardlocks();
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
  const [controlsOpen, setControlsOpen] = useState(true);

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
    CRITICAL: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    WARNING: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    CLEARED: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  };

  const severityLabel = {
    CRITICAL: 'Critical',
    WARNING: 'Warning',
    CLEARED: 'Cleared',
  };

  const safetyRows = filteredHardlocks.map((lock) => ({
    ...lock,
    clearanceDate: new Date(lock.lockExpires).toLocaleDateString(),
  }));

  return (
    <div className="animate-reveal mx-auto max-w-7xl space-y-4 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <section className="rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              <Activity size={12} /> Milk safety operations
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Milk Safety Board</h2>
            <p className="max-w-2xl text-sm leading-6 text-gray-600">
              Live list of cows whose milk must be isolated before collection, mixing, or sale.
            </p>
          </div>

          <div className={`flex items-center gap-3 rounded-md border px-4 py-3 ${hasCritical ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
            {hasCritical ? <ShieldAlert className="text-red-600" size={28} /> : <ShieldCheck className="text-emerald-600" size={28} />}
            <div>
              <p className={`text-sm font-semibold ${hasCritical ? 'text-red-800' : 'text-emerald-800'}`}>
                {hasCritical ? 'Do not mix flagged milk' : 'All active milk is clear'}
              </p>
              <p className="text-xs text-gray-500">
                {stats.total} {stats.total === 1 ? 'cow' : 'cows'} currently under monitoring
              </p>
            </div>
          </div>
        </div>

        <div className="grid border-b border-gray-200 bg-white md:grid-cols-4 md:divide-x md:divide-gray-200">
          {[
            { label: 'Total locks', value: stats.total, icon: Milk },
            { label: 'Critical', value: stats.critical, icon: AlertTriangle },
            { label: 'Warnings', value: stats.warning, icon: ShieldAlert },
            { label: 'Cleared', value: stats.cleared, icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{item.label}</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{item.value}</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-slate-700">
                  <Icon size={18} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
              <Search size={12} /> Search flagged records
            </div>
            <p className="mt-1 text-sm leading-6 text-gray-600">Find milk safety holds by cow, section, medication, or severity.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
              {activeFilterCount} active
            </span>
            <button
              type="button"
              onClick={() => setControlsOpen((current) => !current)}
              aria-expanded={controlsOpen}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              {controlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {controlsOpen ? 'Hide filters' : 'Show filters'}
            </button>
          </div>
        </div>

        {controlsOpen && (
          <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1.4fr_0.8fr_auto] lg:items-end">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                <Search size={12} /> Search records
              </span>
              <div className="relative">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="input-machined w-full pl-10"
                  placeholder="Cow name, tag, reason, or notes"
                />
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                <Filter size={12} /> Severity
              </span>
              <select className="input-machined w-full" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
                <option value="All">All severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="CLEARED">Cleared</option>
              </select>
            </label>

            <button type="button" onClick={() => { setQuery(''); setSeverityFilter('All'); }} className="btn-command h-[46px] bg-gray-900 text-white">
              Reset filters
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-gray-50">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                <th scope="col" className="px-5 py-3">Cow</th>
                <th scope="col" className="px-5 py-3">Tag</th>
                <th scope="col" className="px-5 py-3">Status</th>
                <th scope="col" className="px-5 py-3">Treatment</th>
                <th scope="col" className="px-5 py-3">Clearance date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading && Array.from({ length: 3 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-56" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))}

              {error && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-red-700">
                    Could not load the safety list. Please check your connection and retry.
                  </td>
                </tr>
              )}

              {!isLoading && !error && safetyRows.map((lock) => (
                <tr
                  key={lock.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLock(lock)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedLock(lock);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-gray-50 focus:bg-gray-50"
                >
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold text-gray-900">{lock.cowName}</p>
                    <p className="mt-1 text-xs text-gray-500">Section: {lock.section}</p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Link
                      to={`/operations/animal/${lock.cowId}`}
                      className="text-sm font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {lock.cowId}
                    </Link>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${severityTone[lock.severity] || severityTone.WARNING}`}>
                      {severityLabel[lock.severity] || lock.severity}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="text-sm font-medium text-gray-900">{lock.reason}</p>
                    <p className="mt-1 text-xs text-gray-500">{lock.medication}</p>
                  </td>
                  <td className="px-5 py-4 align-top text-sm text-gray-700">
                    {lock.clearanceDate}
                  </td>
                </tr>
              ))}

              {!isLoading && !error && safetyRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <ShieldCheck className="mx-auto mb-3 text-emerald-500" size={44} />
                    <p className="text-base font-semibold text-gray-900">No records match the current filters</p>
                    <p className="mt-1 text-sm text-gray-600">Try clearing the filters to see all milk safety alerts.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

          <Modal isOpen={!!selectedLock} onClose={() => setSelectedLock(null)} title="Milk Safety Details">
            {selectedLock && (
              <div className="space-y-6">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-3 text-slate-700">
                    <ShieldAlert size={18} />
                    <p className="text-xs font-bold uppercase tracking-wider">Safety Summary</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Cow</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedLock.cowName}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Tag</p>
                      <p className="text-sm text-gray-900">{selectedLock.cowId}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Severity</p>
                      <p className="text-sm text-gray-900">{selectedLock.severity}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Expires</p>
                      <p className="text-sm text-gray-900">{new Date(selectedLock.lockExpires).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-gray-200 bg-white p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Reason</p>
                    <p className="text-sm leading-6 text-gray-900">{selectedLock.reason}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Medication</p>
                    <p className="text-sm leading-6 text-gray-900">{selectedLock.medication}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-4 sm:col-span-2">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes</p>
                    <p className="text-sm leading-6 text-gray-900">{selectedLock.notes}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                  <button onClick={() => setSelectedLock(null)} className="btn-command inline-flex items-center gap-2 bg-gray-900 text-white">
                    <X size={16} /> Close
                  </button>
                </div>
              </div>
            )}
          </Modal>
    </div>
  );
}