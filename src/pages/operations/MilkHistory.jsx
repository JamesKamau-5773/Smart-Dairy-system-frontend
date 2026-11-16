import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown } from 'lucide-react';
import { animalsApi, herdApi } from '../../lib/backendApi';
import { normalizeAnimal } from '../../lib/animalUtils';
import {
  filterMilkHistorySessions,
  normalizeMilkHistorySession,
} from '../../lib/milkUtils';
import { useTenant } from '../../hooks/useTenant';
import { milkCopy } from '../../i18n/milk';
import { productionCopy, sessionLabel } from '../../i18n/production';
import { ISO_DATE_FILTER, useUrlFilters } from '../../hooks/useUrlFilters';
import GroupedDateRows from '../../components/ui/GroupedDateRows';
import Skeleton from '../../components/ui/Skeleton';
import { CardSkeletons, ListLoadMessage, SlowLoadingHint, TableSkeletonRows } from '../../components/ui/ListLoadState';
import { getListLoadState } from '../../lib/listLoadState';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// TODO(BR-013): the daily totals for the chart are added up here from the cow's sessions; the
// backend should return the daily series with the history.
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

function MetricCard({ label, value, loading = false }) {
  return (
    <div className="card-machined p-5 bg-surface">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-ink-muted font-bold">{label}</div>
        {loading ? <Skeleton className="mt-1.5 h-6 w-20" /> : <div className="text-xl font-black text-ink">{value}</div>}
      </div>
    </div>
  );
}

const HISTORY_FILTERS = { date: '', status: 'all', session: 'all' };
const HISTORY_FILTER_VALUES = {
  date: ISO_DATE_FILTER,
  status: ['all', 'verified', 'pending', 'flagged'],
  session: ['all', 'morning', 'afternoon', 'evening'],
};

export default function MilkHistory() {
  const { id } = useParams();
  const { tenantId, farmId } = useTenant();
  // Date, status and session live in the address. The search stays here: it matches the
  // milker, which can be a phone number, and those never go in a URL.
  const { filters: urlFilters, setFilters: setUrlFilters, resetFilters: resetUrlFilters, hasActiveFilters } = useUrlFilters(HISTORY_FILTERS, { allowed: HISTORY_FILTER_VALUES });
  const [search, setSearch] = useState('');
  const filters = useMemo(() => ({ ...urlFilters, search }), [urlFilters, search]);
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  const { data: history, isLoading, error, refetch, status, fetchStatus } = useQuery({
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

  // The cow's figures are the backend's, over her whole history (not just the filtered rows).
  const backendStats = resolvedHistory?.stats ?? {};
  const copy = milkCopy.history;
  const litresText = (value, suffix = 'L') => (value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(1)} ${suffix}`);
  const totalYield = litresText(backendStats.total_logged);
  const totalSessions = backendStats.session_count ?? '—';
  const [trendRange, setTrendRange] = useState('30');
  const trendData = useMemo(() => buildMilkYieldTrend(safeSessions, trendRange), [safeSessions, trendRange]);

  const averageYield = litresText(backendStats.average_yield, copy.perDay);
  const peakYield = litresText(backendStats.peak_yield, copy.perDay);

  const clearFilters = () => { setSearch(''); resetUrlFilters(); };

  const loadState = getListLoadState({ status, fetchStatus, data: history });

  if (loadState === 'error' || loadState === 'offline') {
    return (
      <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
        <div className="card-machined bg-surface">
          <ListLoadMessage state={loadState} label={copy.loadLabel} error={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  if (!isLoading && !resolvedHistory) {
    return (
      <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-dashed border-ink/10 bg-surface p-6 text-sm text-ink-muted">
          {copy.empty}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.95),rgba(255,255,255,0.98))] p-5 sm:p-6 ">
        <div className="flex items-center justify-between border-b border-ink/10 pb-5 gap-4">
          <div className="flex items-center gap-4 min-w-0">
          <Link to="/operations/yield" aria-label={copy.back} className="p-2 hover:bg-surface-raised rounded-lg text-ink-muted transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand m-0 truncate">
              {id} <span className="text-ink-muted">({resolvedHistory?.animal?.name || copy.unknownCow})</span>
            </h2>
            <p className="text-sm text-ink-muted mt-1">{copy.subtitle}</p>
          </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{copy.totalMilkings}</p>
            <p className="text-2xl font-black text-ink">{totalSessions}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard loading={isLoading} label={copy.cow} value={resolvedHistory?.animal?.name || copy.unknownCow} />
        <MetricCard loading={isLoading} label={copy.averageYield} value={averageYield} />
        <MetricCard loading={isLoading} label={copy.peakYield} value={peakYield} />
        <MetricCard loading={isLoading} label={copy.totalLogged} value={totalYield} />
      </div>

      <section className="card-machined overflow-hidden bg-surface">
        <div className="flex flex-col gap-3 border-b border-ink/10 bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-brand">
            {copy.trendTitle}</h3>
            <p className="mt-1 text-xs text-ink-muted">{copy.trendSubtitle(resolvedHistory?.animal?.name || copy.thisCow)}</p>
          </div>
          <div className="inline-flex rounded-lg border border-ink/10 bg-surface p-1" role="group" aria-label={copy.trendRange}>
            {[['30', copy.ranges[30]], ['90', copy.ranges[90]], ['all', copy.ranges.all]].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setTrendRange(value)} aria-pressed={trendRange === value} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${trendRange === value ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-surface-raised hover:text-brand'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-96 px-3 py-4 sm:px-5">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" L" />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)} L`, copy.dailyProduction]}
                  labelFormatter={(label) => copy.dateLabel(label)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="liters" name={copy.dailyProductionLegend} stroke="#38BDF8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">{copy.noTrend}</div>
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

  {copy.searchAndFilter}
            <ChevronDown
              size={12}
              aria-hidden="true"
              className={`text-ink-muted transition-transform duration-300 ease-out motion-reduce:transition-none ${filtersOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center text-xs font-semibold text-ink-muted hover:text-brand"
          >

  {copy.resetFilters}
          </button>
        </div>

        {filtersOpen && (
          <div id="history-filter-panel" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <label className="space-y-1 text-xs font-semibold text-ink-muted xl:col-span-2">
                {copy.search}
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand" aria-hidden="true" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="input-machined pl-10"
                  />
                </div>
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                {copy.date}
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setUrlFilters({ date: e.target.value })}
                  className="input-machined"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                {copy.status}
                <select
                  value={filters.status}
                  onChange={(e) => setUrlFilters({ status: e.target.value })}
                  className="input-machined"
                >
                  <option value="all">{copy.all}</option>
                  <option value="verified">{productionCopy.statuses.Verified}</option>
                  <option value="pending">{productionCopy.statuses.Pending}</option>
                  <option value="flagged">{productionCopy.statuses.Flagged}</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-ink-muted">
                {copy.session}
                <select
                  value={filters.session}
                  onChange={(e) => setUrlFilters({ session: e.target.value })}
                  className="input-machined"
                >
                  <option value="all">{copy.all}</option>
                  <option value="morning">{productionCopy.sessions.morning}</option>
                  <option value="afternoon">{productionCopy.sessions.afternoon}</option>
                  <option value="evening">{productionCopy.sessions.evening}</option>
                </select>
              </label>
            </div>

            <div className="text-xs text-ink-muted">
              {copy.showing(filteredSessions.length, totalSessions)}
            </div>
          </div>
        )}
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-ink/10 bg-surface-raised p-5 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h3 className="font-bold text-brand text-lg m-0">{copy.recordsTitle}</h3>
            <p className="text-sm text-ink-muted">{copy.recordsSubtitle}</p>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-ink-muted">{resolvedHistory?.animal?.breed || resolvedHistory?.breed || copy.notAvailable}</div>
        </div>

        {isLoading ? (
          <div aria-busy="true">
            <SlowLoadingHint label={copy.loadingLabel} />
            <table className="hidden w-full md:table"><tbody><TableSkeletonRows columns={5} /></tbody></table>
            <div className="divide-y divide-ink/10 md:hidden"><CardSkeletons /></div>
          </div>
        ) : filteredSessions.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="bg-brand text-white">
                    <th className="p-4 text-xs uppercase tracking-[0.12em]">{copy.columns.date}</th>
                    <th className="p-4 text-xs uppercase tracking-[0.12em]">{copy.columns.session}</th>
                    <th className="p-4 text-xs uppercase tracking-[0.12em]">{copy.columns.milker}</th>
                    <th className="p-4 text-right text-xs uppercase tracking-[0.12em]">{copy.columns.liters}</th>
                    <th className="p-4 text-center text-xs uppercase tracking-[0.12em]">{copy.columns.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5 bg-surface">
                  <GroupedDateRows
                    items={filteredSessions}
                    getDate={(entry) => entry.date}
                    colSpan={5}
                    // TODO(BR-013): per-day totals should come from the backend's daily series.
                    renderGroupMeta={(items) => copy.dayMeta(items.length, items.reduce((sum, item) => sum + Number(item.liters || 0), 0).toFixed(1))}
                    renderItem={(entry, index) => (
                      <tr key={`${entry.date}-${entry.session}-${index}`} className="transition-colors hover:bg-surface-raised">
                        <td className="p-4 text-sm font-medium text-ink-muted">{entry.date}</td>
                        <td className="p-4 text-sm font-semibold text-ink">{sessionLabel(entry.session)}</td>
                        <td className="p-4 text-sm font-medium text-ink">{entry.milker}</td>
                        <td className="p-4 text-right text-sm font-black tabular-nums text-brand">{entry.liters} L</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded border border-brand/20 bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-dark">
                            {productionCopy.statuses[entry.status] ?? entry.status}
                          </span>
                        </td>
                      </tr>
                    )}
                    empty={null}
                  />
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-ink/10 bg-surface md:hidden">
              {filteredSessions.map((entry, index) => (
                <article key={`${entry.date}-${entry.session}-${index}`} className="min-w-0 space-y-3 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <time className="text-xs text-ink-muted">{entry.date}</time>
                      <h4 className="mt-1 break-words font-semibold text-ink">{copy.sessionTitle(sessionLabel(entry.session))}</h4>
                    </div>
                    <span className="shrink-0 rounded border border-brand/20 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-dark">{productionCopy.statuses[entry.status] ?? entry.status}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 text-xs">
                    <div className="min-w-0"><dt className="text-ink-muted">{copy.columns.milker}</dt><dd className="mt-1 break-words font-medium text-ink">{entry.milker || '—'}</dd></div>
                    <div className="min-w-0"><dt className="text-ink-muted">{copy.columns.liters}</dt><dd className="mt-1 break-words font-mono font-bold tabular-nums text-brand">{entry.liters} L</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="p-10 text-center text-ink-muted bg-surface-warm/30">
            <p className="font-semibold text-ink">{copy.noMatches}</p>
            <p className="text-sm mt-1 leading-6">{copy.noMatchesHint}</p>
            <button type="button" onClick={clearFilters} className="btn-command bg-surface-raised text-ink mt-4">
              {copy.clearFilters}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
