import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Activity, Calendar, Droplets, ShieldAlert, TrendingUp, Search, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { animalsApi, herdApi } from '../../lib/backendApi';
import { normalizeAnimal } from '../../lib/animalUtils';
import {
  filterMilkHistorySessions,
  normalizeMilkHistorySession,
} from '../../lib/milkUtils';
import { useTenant } from '../../hooks/useTenant';
import GroupedDateRows from '../../components/ui/GroupedDateRows';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function buildMilkYieldTrend(sessions, range = 'all') {
  const dailyTotals = sessions.reduce((totals, entry) => {
    const date = String(entry.date ?? '').slice(0, 10);
    const liters = Number(entry.liters);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(liters)) return totals;
    totals[date] = (totals[date] ?? 0) + liters;
    return totals;
  }, {});

  const records = Object.entries(dailyTotals)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, liters]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      liters: Number(liters.toFixed(1)),
    }));

  if (range === 'all') return records;
  return records.slice(-Number(range));
}

function MetricCard({ label, value, icon: Icon, tone = 'brand' }) {
  const toneStyles = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-accent/10 text-accent-dark',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className="card-machined p-5 bg-surface flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneStyles[tone] || toneStyles.brand}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-ink-muted font-bold">{label}</div>
        <div className="text-xl font-black text-ink">{value}</div>
      </div>
    </div>
  );
}

export default function MilkHistory() {
  const { id } = useParams();
  const { tenantId, farmId } = useTenant();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    status: 'all',
    session: 'all',
  });

  const { data: history, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['milk-history', tenantId, farmId, id],
    queryFn: async () => {
      let resolvedId = id;
      const herd = await herdApi.list({ per_page: 200 });
      const selectedCow = herd.find((cow) => [cow.id, cow.recordId, cow.tag, cow.tag_number, cow.tagNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase() === String(id).toLowerCase()));
      if (selectedCow?.id != null) resolvedId = selectedCow.id;
      else if (selectedCow?.recordId != null) resolvedId = selectedCow.recordId;

      const [animal, sessions] = await Promise.all([
        animalsApi.get(resolvedId),
        animalsApi.milkHistory(resolvedId),
      ]);

      const resolvedAnimal = sessions?.animal ?? animal;

      return {
        animal: resolvedAnimal ? normalizeAnimal(resolvedAnimal, id) : null,
        sessions: Array.isArray(sessions?.sessions) ? sessions.sessions.map(normalizeMilkHistorySession) : [],
        stats: sessions?.stats ?? null,
      };
    },
    enabled: !!tenantId && !!farmId && !!id,
  });

  const resolvedHistory = history || null;
  
  // Safely extract sessions to guarantee it is always an array
  const safeSessions = Array.isArray(resolvedHistory?.sessions) ? resolvedHistory.sessions : [];

  const filteredSessions = useMemo(
    () => filterMilkHistorySessions(safeSessions, filters),
    [filters, safeSessions],
  );

  const totalYield = filteredSessions.reduce((sum, entry) => sum + Number(entry.liters || 0), 0).toFixed(1);
  const totalSessions = safeSessions.length;
  const [trendRange, setTrendRange] = useState('30');
  const trendData = useMemo(() => buildMilkYieldTrend(safeSessions, trendRange), [safeSessions, trendRange]);

  const { averageYield, peakYield } = useMemo(() => {
    const backendStats = resolvedHistory?.stats;

    // Prefer backend-computed stats (source of truth).
    if (backendStats?.average_yield != null && backendStats?.peak_yield != null) {
      return {
        averageYield: `${Number(backendStats.average_yield).toFixed(1)} L/day`,
        peakYield: `${Number(backendStats.peak_yield).toFixed(1)} L/day`,
      };
    }

    // Fallback: derive client-side during the backend migration window.
    if (safeSessions.length === 0) return { averageYield: '0.0 L/day', peakYield: '0.0 L/day' };

    const dailyTotals = safeSessions.reduce((acc, entry) => {
      const day = entry.date ? String(entry.date).slice(0, 10) : 'unknown';
      acc[day] = (acc[day] || 0) + Number(entry.liters || 0);
      return acc;
    }, {});

    const dailyValues = Object.values(dailyTotals);
    const totalAllLiters = dailyValues.reduce((s, v) => s + v, 0);
    const avg = (totalAllLiters / dailyValues.length).toFixed(1);
    const peak = Math.max(...dailyValues).toFixed(1);

    return { averageYield: `${avg} L/day`, peakYield: `${peak} L/day` };
  }, [resolvedHistory?.stats, safeSessions]);

  const clearFilters = () => setFilters({ search: '', date: '', status: 'all', session: 'all' });

  if (isError) {
    return (
      <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
          <p className="font-semibold">Unable to load this cow&apos;s milk history.</p>
          <p className="mt-1 text-danger/80">{error?.response?.data?.error || error?.message || 'Please try again.'}</p>
          <button type="button" onClick={() => refetch()} className="btn-command mt-4">Retry</button>
        </div>
      </div>
    );
  }

  if (!isLoading && !resolvedHistory) {
    return (
      <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-dashed border-ink/10 bg-surface p-6 text-sm text-ink-muted">
          No milk history is available for this animal yet.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.95),rgba(255,255,255,0.98))] p-5 sm:p-6 ">
        <div className="flex items-center justify-between border-b border-ink/10 pb-5 gap-4">
          <div className="flex items-center gap-4 min-w-0">
          <Link to="/operations/yield" className="p-2 hover:bg-surface-raised rounded-lg text-ink-muted transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand text-[10px] font-bold uppercase tracking-widest rounded-full mb-1">
              <Activity size={12} /> Milk Production History
            </div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand m-0 truncate">
              {id} <span className="text-ink-muted">({resolvedHistory?.animal?.name || 'Unknown Cow'})</span>
            </h2>
            <p className="text-sm text-ink-muted mt-1">Detailed yield history for the selected animal.</p>
          </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Total Milkings</p>
            <p className="text-2xl font-black text-ink">{totalSessions}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Cow" value={resolvedHistory?.animal?.name || 'Unknown Cow'} icon={Droplets} />
        <MetricCard label="Average Yield" value={averageYield} icon={TrendingUp} />
        <MetricCard label="Peak Yield" value={peakYield} icon={Calendar} />
        <MetricCard label="Total Logged" value={`${totalYield} L`} icon={ShieldAlert} tone="accent" />
      </div>

      <section className="card-machined overflow-hidden bg-surface">
        <div className="flex flex-col gap-3 border-b border-ink/10 bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-brand"><TrendingUp size={18} /> Production trend</h3>
            <p className="mt-1 text-xs text-ink-muted">Daily milk volume for {resolvedHistory?.animal?.name || 'this cow'}.</p>
          </div>
          <div className="inline-flex rounded-lg border border-ink/10 bg-surface p-1" role="group" aria-label="Production trend range">
            {[['30', '30 days'], ['90', '90 days'], ['all', 'All time']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setTrendRange(value)} aria-pressed={trendRange === value} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${trendRange === value ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-surface-raised hover:text-brand'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-96 px-3 py-4 sm:px-5">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" L" />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)} L`, 'Daily production']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="liters" name="Daily Production" stroke="#38BDF8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">No dated production data is available for this cow.</div>
          )}
        </div>
      </section>

      <div className="card-machined p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink  transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
            aria-expanded={filtersOpen}
            aria-controls="history-filter-panel"
          >
            <Filter size={12} /> Search & filter history
            <ChevronDown
              size={12}
              className={`text-ink-muted transition-transform duration-300 ease-out motion-reduce:transition-none ${filtersOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand"
          >
            <RotateCcw size={14} /> Reset filters
          </button>
        </div>

        {filtersOpen && (
          <div id="history-filter-panel" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <label className="space-y-1 text-xs font-semibold text-ink-muted xl:col-span-2">
                Search
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    placeholder="Search date, session, milker, status..."
                    className="input-machined pl-9"
                  />
                </div>
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Date
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
                  className="input-machined"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Status
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="input-machined"
                >
                  <option value="all">All</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="flagged">Flagged</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                Session
                <select
                  value={filters.session}
                  onChange={(e) => setFilters((prev) => ({ ...prev, session: e.target.value }))}
                  className="input-machined"
                >
                  <option value="all">All</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Search size={14} />
              Showing {filteredSessions.length} of {totalSessions} sessions
            </div>
          </div>
        )}
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="p-5 border-b border-ink/10 bg-surface-raised flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-brand text-lg m-0">Milk Session Records</h3>
            <p className="text-sm text-ink-muted">Most recent milking sessions first.</p>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-ink-muted">{resolvedHistory?.animal?.breed || resolvedHistory?.breed || 'Not available'}</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-ink-muted">Loading milk history…</div>
        ) : filteredSessions.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand text-surface">
                <th className="p-4 text-xs uppercase tracking-[0.12em]">Date</th>
                <th className="p-4 text-xs uppercase tracking-[0.12em]">Session</th>
                <th className="p-4 text-xs uppercase tracking-[0.12em]">Milker</th>
                <th className="p-4 text-xs uppercase tracking-[0.12em] text-right">Liters</th>
                <th className="p-4 text-xs uppercase tracking-[0.12em] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 bg-white">
              <GroupedDateRows
                items={filteredSessions}
                getDate={(entry) => entry.date}
                colSpan={5}
                renderGroupMeta={(items) => `${items.length} ${items.length === 1 ? 'session' : 'sessions'} / ${items.reduce((sum, item) => sum + Number(item.liters || 0), 0).toFixed(1)} L`}
                renderItem={(entry, index) => (
                <tr key={`${entry.date}-${entry.session}-${index}`} className="hover:bg-surface-raised transition-colors">
                  <td className="p-4 text-sm text-ink-muted font-medium">{entry.date}</td>
                  <td className="p-4 text-sm font-semibold text-ink">{entry.session}</td>
                  <td className="p-4 text-sm font-medium text-ink">{entry.milker}</td>
                  <td className="p-4 text-sm font-black text-brand text-right tabular-nums">{entry.liters} L</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-brand/20 bg-brand/5 text-brand text-[11px] font-medium">
                      {entry.status}
                    </span>
                  </td>
                </tr>
                )}
                empty={null}
              />
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-ink-muted bg-surface-warm/30">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand mb-3">
              <Search size={18} />
            </div>
            <p className="font-semibold text-ink">No milk history matches the current filters.</p>
            <p className="text-sm mt-1 leading-6">Try clearing the filters or searching by date, milker, session, or status.</p>
            <button type="button" onClick={clearFilters} className="btn-command bg-surface-raised text-ink mt-4">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}