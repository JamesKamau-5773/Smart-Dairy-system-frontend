import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../hooks/useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import apiClient from '../lib/apiClient';
import { financeApi, productionApi } from '../lib/backendApi';
import { Activity, Droplets, TrendingUp, DollarSign, LineChart as ChartIcon } from 'lucide-react';
import React, { Suspense, lazy, useMemo } from 'react';

// Components
const MilkTrendChart = lazy(() => import('../components/dashboard/MilkTrendChart'));
import ManagerInboxWidget from '../components/dashboard/ManagerInboxWidget';
import Money from '../components/ui/Money';
import { Skeleton } from '../components/ui';

const SummaryCard = ({ title, value, unit, icon: Icon, trend, loading = false }) => (
  <div className="glass-panel p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-brand">
      <Icon size={64} strokeWidth={1} />
    </div>
    
    <div className="flex justify-between items-start z-10">
      <div className="space-y-1">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {title}
        </span>
        <div className="h-1 w-8 bg-brand rounded-full"></div>
      </div>
      <div className="p-2 border border-ink/10 bg-surface rounded-lg shadow-sm">
        <Icon size={18} className="text-brand" />
      </div>
    </div>

    <div className="z-10 mt-4">
      {loading ? (
        <Skeleton className="h-12 w-3/5" />
      ) : (
        <>
          <div className="font-sans text-5xl font-black text-brand tracking-tight flex items-baseline">
            {value}
            <span className="text-sm ml-2 font-bold text-ink-muted">{unit}</span>
          </div>
          {trend && (
            <div className="mt-2 inline-flex items-center gap-2 bg-brand/5 px-2 py-1 rounded border border-brand/10">
              <span className="font-sans text-[11px] font-bold text-brand tracking-wide">{trend}</span>
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

function parseAmount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractYieldAmount(row) {
  return parseAmount(
    row?.amount
      ?? row?.volume
      ?? row?.liters
      ?? row?.milk_volume
      ?? row?.milkVolume
      ?? row?.yield_amount
      ?? row?.yieldAmount
      ?? row?.volume_liters
      ?? row?.volumeLiters
      ?? row?.quantity
      ?? row?.qty
      ?? 0
  );
}

function extractYieldDate(row) {
  const raw = row?.date
    ?? row?.milkingDate
    ?? row?.milking_date
    ?? row?.created_at
    ?? row?.createdAt
    ?? row?.recorded_at
    ?? row?.recordedAt
    ?? row?.logged_at
    ?? row?.loggedAt
    ?? row?.entry_date
    ?? row?.entryDate
    ?? row?.timestamp;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function extractYieldCowId(row) {
  return String(
    row?.cow_id
      ?? row?.cowId
      ?? row?.animal_id
      ?? row?.animalId
      ?? row?.cow_tag
      ?? row?.cowTag
      ?? row?.tag_number
      ?? row?.tagNumber
      ?? ''
  ).trim();
}

function metricFromSummary(summary, keys) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (summary[key] !== undefined && summary[key] !== null) {
      const parsed = Number.parseFloat(summary[key]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function buildTrendData(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const totalsByDate = new Map();

  rows.forEach((row) => {
    const date = extractYieldDate(row);
    if (!date) {
      return;
    }

    const current = totalsByDate.get(date) ?? 0;
    totalsByDate.set(date, current + extractYieldAmount(row));
  });

  return Array.from(totalsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, value]) => ({
      date,
      value: Number(value.toFixed(1)),
    }));
}

export default function FarmDashboard() {
  const { tenantId, farmId } = useTenant();

  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.YIELD_SUMMARY(tenantId, farmId),
    queryFn: () => productionApi.summary(),
    enabled: !!farmId,
  });

  const trendQuery = useQuery({
    queryKey: QUERY_KEYS.YIELD_TREND(tenantId, farmId),
    queryFn: () => productionApi.listYield(),
    enabled: !!farmId,
  });

  const trend = buildTrendData(trendQuery.data);

  const financeQuery = useQuery({
    queryKey: QUERY_KEYS.UNIT_COST(tenantId, farmId),
    queryFn: () => financeApi.unitCost(),
    enabled: !!farmId,
  });

  const dashboardSummaryQuery = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_SUMMARY(tenantId, farmId),
    queryFn: () => apiClient.get('/v1/dashboard/summary').then((res) => res.data),
    enabled: !!farmId,
  });

  const summary = summaryQuery.data;
  const finance = financeQuery.data;
  const dashboardSummary = dashboardSummaryQuery.data;
  const hasSummaryError = summaryQuery.isError;
  const hasDashboardError = dashboardSummaryQuery.isError;
  const isRetryingSummary = summaryQuery.isFetching || dashboardSummaryQuery.isFetching;

  const derivedTodaySummary = useMemo(() => {
    const rows = Array.isArray(trendQuery.data) ? trendQuery.data : [];
    const today = new Date().toISOString().slice(0, 10);

    const todayRows = rows.filter((row) => extractYieldDate(row) === today);
    const total = todayRows.reduce((acc, row) => acc + extractYieldAmount(row), 0);
    const uniqueCows = new Set(todayRows.map(extractYieldCowId).filter(Boolean)).size;

    return {
      totalLitersToday: Number(total.toFixed(1)),
      cowsMilked: uniqueCows,
      averagePerCow: uniqueCows > 0 ? Number((total / uniqueCows).toFixed(1)) : 0,
    };
  }, [trendQuery.data]);

  const totalLitersToday = metricFromSummary(summary, [
    'total_liters_today',
    'totalLitersToday',
    'today_total_liters',
    'todayTotalLiters',
    'total_liters',
    'totalLiters',
    'total_volume',
    'totalVolume',
  ]) ?? derivedTodaySummary.totalLitersToday;

  const cowsMilked = metricFromSummary(summary, [
    'cows_milked',
    'cowsMilked',
    'today_cows_milked',
    'todayCowsMilked',
    'milked_cows',
    'milkedCows',
  ]) ?? derivedTodaySummary.cowsMilked;

  const averageYieldPerCow = metricFromSummary(summary, [
    'average_yield_per_cow',
    'averageYieldPerCow',
    'avg_per_cow',
    'avgPerCow',
    'average_per_cow',
  ]) ?? derivedTodaySummary.averagePerCow;

  const handleRetrySummary = async () => {
    await Promise.all([summaryQuery.refetch(), dashboardSummaryQuery.refetch()]);
  };

  return (
    <div className="animate-entrance space-y-10 max-w-7xl mx-auto">
      
      <div className="flex justify-between items-end border-b border-ink/10 pb-4">
        <div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">Daily Summary</h2>
          <p className="font-sans text-sm text-ink-muted mt-1">Live Farm Data</p>
        </div>
      </div>

      <section>
        <ManagerInboxWidget />
      </section>

      {(hasSummaryError || hasDashboardError) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Some dashboard totals are unavailable right now. Check the backend responses for
              {' '}
              <span className="font-bold">/api/production/summary</span>
              {' '}
              and
              {' '}
              <span className="font-bold">/api/v1/dashboard/summary</span>.
            </p>
            <button
              type="button"
              onClick={handleRetrySummary}
              disabled={isRetryingSummary}
              className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRetryingSummary ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-machined bg-surface p-5 border border-ink/5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Milk Sales</p>
          <h3 className="text-2xl font-black text-brand mt-2">
            {dashboardSummaryQuery.isLoading ? 'Loading...' : hasDashboardError ? 'Unavailable' : `KES ${(dashboardSummary?.today_revenue_kes ?? 0).toLocaleString()}`}
          </h3>
        </div>
        <div className="card-machined bg-surface p-5 border border-ink/5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Feed Cost</p>
          <h3 className="text-2xl font-black text-ink mt-2">
            {dashboardSummaryQuery.isLoading ? 'Loading...' : hasDashboardError ? 'Unavailable' : `KES ${(dashboardSummary?.today_feed_cost_kes ?? 0).toLocaleString()}`}
          </h3>
        </div>
        <div className="card-machined bg-brand/5 p-5 border-2 border-brand/20 shadow-sm">
          <p className="text-xs font-bold text-brand uppercase tracking-wider">Daily Profit</p>
          <h3 className="text-2xl font-black text-brand mt-2">
            {dashboardSummaryQuery.isLoading ? 'Loading...' : hasDashboardError ? 'Unavailable' : `KES ${(dashboardSummary?.net_margin_kes ?? 0).toLocaleString()}`}
          </h3>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Milk (Today)" value={hasSummaryError ? '—' : totalLitersToday} unit="Liters" icon={Droplets} trend={summary?.variance_from_yesterday} loading={summaryQuery.isLoading} />
        <SummaryCard title="Cows Milked" value={hasSummaryError ? '—' : cowsMilked} unit="Cows" icon={Activity} loading={summaryQuery.isLoading} />
        <SummaryCard title="Avg. per Cow" value={hasSummaryError ? '—' : averageYieldPerCow} unit="L/cow" icon={TrendingUp} loading={summaryQuery.isLoading} />
        <SummaryCard title="Profit per Liter" value={financeQuery.isLoading ? '—' : <Money amount={finance?.margin ?? 0} currency={finance?.currency ?? 'KES'} />} icon={DollarSign} loading={financeQuery.isLoading} />
      </section>

      <div className="card-machined bg-surface p-8 border border-ink/10">
        <h3 className="font-sans font-bold text-xl text-brand mb-8 flex items-center gap-2">
          <ChartIcon size={20} className="text-accent" /> Milk Production Trend 
        </h3>
        <div className="h-80 w-full bg-surface-warm/30 rounded-xl">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <MilkTrendChart data={trend} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}