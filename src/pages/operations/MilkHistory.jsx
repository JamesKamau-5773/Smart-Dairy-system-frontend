import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Activity, Calendar, Droplets, ShieldAlert, TrendingUp, Search, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import apiClient from '../../lib/apiClient';

export function filterMilkHistorySessions(sessions, filters) {
  const searchValue = filters.search.trim().toLowerCase();
  return sessions.filter((entry) => {
    const matchesSearch = searchValue
      ? [entry.date, entry.session, entry.milker, entry.status, entry.liters]
          .join(' ')
          .toLowerCase()
          .includes(searchValue)
      : true;
    const matchesDate = filters.date ? entry.date === filters.date : true;
    const matchesStatus = filters.status === 'all' ? true : entry.status.toLowerCase() === filters.status.toLowerCase();
    const matchesSession = filters.session === 'all' ? true : entry.session.toLowerCase() === filters.session.toLowerCase();
    return matchesSearch && matchesDate && matchesStatus && matchesSession;
  });
}

function MetricCard({ label, value, icon: Icon, tone = 'brand' }) {
  return (
    <div className="card-machined p-5 bg-surface flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${tone}/10 text-${tone}`}>
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    status: 'all',
    session: 'all',
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['milk-history', id],
    queryFn: () => apiClient.get(`/production/history/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  const fallbackHistory = {
    cowId: id,
    name: 'Unknown Cow',
    breed: 'Not available',
    average: '0.0 L/day',
    peak: '0.0 L/day',
    lastYield: '0.0 L',
    sessions: [],
  };

  const resolvedHistory = history || fallbackHistory;

  const filteredSessions = useMemo(
    () => filterMilkHistorySessions(resolvedHistory.sessions, filters),
    [filters, resolvedHistory.sessions],
  );

  const totalYield = filteredSessions.reduce((sum, entry) => sum + entry.liters, 0).toFixed(1);

  const clearFilters = () => setFilters({ search: '', date: '', status: 'all', session: 'all' });

  return (
    <div className="animate-reveal space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b border-ink/10 pb-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/operations/yield" className="p-2 hover:bg-surface-raised rounded-lg text-ink-muted transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand text-[10px] font-bold uppercase tracking-widest rounded-full mb-1">
              <Activity size={12} /> Milk Production History
            </div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand m-0 truncate">
              {id} <span className="text-ink-muted">({resolvedHistory.name})</span>
            </h2>
            <p className="text-sm text-ink-muted mt-1">Detailed yield history for the selected animal.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Cow" value={resolvedHistory.name} icon={Droplets} />
        <MetricCard label="Average Yield" value={resolvedHistory.average} icon={TrendingUp} />
        <MetricCard label="Peak Yield" value={resolvedHistory.peak} icon={Calendar} />
        <MetricCard label="Total Logged" value={`${totalYield} L`} icon={ShieldAlert} tone="accent" />
      </div>

      <div className="card-machined p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="group flex items-center gap-2 text-brand font-bold text-left"
            aria-expanded={filtersOpen}
            aria-controls="history-filter-panel"
          >
            <Filter size={16} /> Search & filter history
            <ChevronDown
              size={14}
              className={`text-ink-muted transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:translate-y-0.5 ${filtersOpen ? 'rotate-180' : ''}`}
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
                  <option value="midday">Midday</option>
                  <option value="evening">Evening</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Search size={14} />
              Showing {filteredSessions.length} of {resolvedHistory.sessions.length} sessions
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
          <div className="text-xs font-bold uppercase tracking-widest text-ink-muted">{resolvedHistory.breed}</div>
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
              {filteredSessions.map((entry, index) => (
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
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-ink-muted">
            No milk history matches the current filters.
          </div>
        )}
      </div>
    </div>
  );
}