import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../hooks/useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { productionApi } from '../lib/backendApi';
import { Activity, Droplets, TrendingUp, DollarSign, LineChart as ChartIcon, ShoppingCart, Archive } from 'lucide-react';
import React, { Suspense, lazy, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { buildTrendData, extractYieldCowId, extractYieldDate, extractYieldAmount, metricFromSummary } from '../lib/dashboardUtils';

// Components
const MilkTrendChart = lazy(() => import('../components/dashboard/MilkTrendChart'));
import ManagerInboxWidget from '../components/dashboard/ManagerInboxWidget';
import Money from '../components/ui/Money';
import { Skeleton } from '@/components/ui';

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
      <div className="p-2 border border-ink/10 bg-surface rounded-lg ">
        <Icon size={18} className="text-brand" />
      </div>
    </div>

    <div className="z-10 mt-4">
      {loading ? (
        <Skeleton className="h-12 w-3/5" />
      ) : (
        <>
          <div className="font-sans text-3xl font-black text-brand tracking-tight flex items-baseline">
            {value}
            <span className="text-sm ml-2 font-bold text-ink-muted">{unit}</span>
          </div>
        </>
      )}
    </div>
  </div>
);
export default function CommandCenter() {
  const { tenantId, farmId } = useTenant();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [selectedRange, setSelectedRange] = useState('30');

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

  const trend = useMemo(() => buildTrendData(trendQuery.data, dateRange), [trendQuery.data, dateRange]);

  const selectTrendRange = (range) => {
    setSelectedRange(range);
    const today = new Date();
    if (range === 'all') {
      const dates = (Array.isArray(trendQuery.data) ? trendQuery.data : [])
        .map(extractYieldDate)
        .filter(Boolean)
        .sort();
      setDateRange({
        from: dates.length > 0 ? new Date(`${dates[0]}T00:00:00`) : subDays(today, 29),
        to: today,
      });
      return;
    }
    setDateRange({ from: subDays(today, Number(range) - 1), to: today });
  };

  const summary = summaryQuery.data;
  const hasSummaryError = summaryQuery.isError;
  const isRetryingSummary = summaryQuery.isFetching;

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
    'production_total_liters',
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

  const profitPerLiter = useMemo(() => {
    return summary?.profit_per_liter ?? summary?.profitPerLiter ?? 0;
  }, [summary]);

  const handleRetrySummary = async () => {
    await summaryQuery.refetch();
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

      {hasSummaryError && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Some dashboard totals are unavailable right now. Check the backend responses for
              {' '}
              <span className="font-bold">/api/production/summary</span>
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
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Transaction Revenue</p>
          <h3 className="text-2xl font-black text-brand mt-2">
            {summaryQuery.isLoading ? 'Loading...' : hasSummaryError ? 'Unavailable' : `KES ${(summary?.revenue_total_kes ?? 0).toLocaleString()}`}
          </h3>
          {summary?.revenue_breakdown?.report_sales_revenue_kes != null && (
            <p className="mt-2 text-[11px] leading-4 text-ink-muted">
              Report reference: KES {Number(summary.revenue_breakdown.report_sales_revenue_kes).toLocaleString()}
            </p>
          )}
        </div>
        <div className="card-machined bg-surface p-5 border border-ink/5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Feed Cost</p>
          <h3 className="text-2xl font-black text-ink mt-2">
            {summaryQuery.isLoading ? 'Loading...' : hasSummaryError ? 'Unavailable' : `KES ${(summary?.feed_cost_total_kes ?? 0).toLocaleString()}`}
          </h3>
        </div>
        <div className="card-machined bg-brand/5 p-5 border-2 border-brand/20 ">
          <p className="text-xs font-bold text-brand uppercase tracking-wider">Daily Profit</p>
          <h3 className="text-2xl font-black text-brand mt-2">
            {summaryQuery.isLoading ? 'Loading...' : hasSummaryError ? 'Unavailable' : `KES ${(summary?.net_margin_kes ?? 0).toLocaleString()}`}
          </h3>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Milk (Today)" value={summaryQuery.isLoading ? '—' : totalLitersToday.toFixed(1)} unit="Liters" icon={Droplets} loading={summaryQuery.isLoading} />
        <SummaryCard title="Saleable Milk (Today)" value={summaryQuery.isLoading ? '—' : (summary?.saleable_liters ?? 0).toFixed(1)} unit="Liters" icon={Droplets} loading={summaryQuery.isLoading} />
        <SummaryCard title="Milk Sold (Today)" value={summaryQuery.isLoading ? '—' : (summary?.total_sold_liters ?? 0).toFixed(1)} unit="Liters" icon={ShoppingCart} loading={summaryQuery.isLoading} />
        <SummaryCard title="Milk Remaining" value={summaryQuery.isLoading ? '—' : (summary?.remaining_milk_liters ?? 0).toFixed(1)} unit="Liters" icon={Archive} loading={summaryQuery.isLoading} />
        <SummaryCard title="Cows Milked" value={hasSummaryError ? '—' : (summary?.cows_milked ?? cowsMilked)} unit="Cows" icon={Activity} loading={summaryQuery.isLoading} />
        <SummaryCard title="Avg. per Cow" value={hasSummaryError ? '—' : averageYieldPerCow} unit="L/cow" icon={TrendingUp} loading={summaryQuery.isLoading} />
        <SummaryCard title="Profit per Liter" value={summaryQuery.isLoading ? '—' : <Money amount={profitPerLiter} currency={summary?.currency ?? 'KES'} />} icon={DollarSign} loading={summaryQuery.isLoading} />
      </section>

      <div className="card-machined bg-surface p-8 border border-ink/10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h3 className="font-sans font-bold text-xl text-brand flex items-center gap-2">
            <ChartIcon size={20} className="text-accent" /> Milk Production Trend
          </h3>
          <div className="inline-flex rounded-lg border border-ink/10 bg-surface p-1" role="group" aria-label="Milk production trend range">
            {[['30', '30 days'], ['90', '90 days'], ['all', 'All time']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => selectTrendRange(value)} aria-pressed={selectedRange === value} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${selectedRange === value ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-surface-raised hover:text-brand'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80 w-full bg-surface-warm/30 rounded-xl">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <MilkTrendChart data={trend} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
