import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../hooks/useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { productionApi } from '../lib/backendApi';
import React, { Suspense, lazy, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { buildDailyTrend, metricFromSummary } from '../lib/dashboardUtils';
import { toLocalIsoDate } from '../lib/localDate';
import { getListLoadState, hasRowsToShow } from '../lib/listLoadState';
import { ListLoadNotices } from '../components/ui/ListLoadState';

// Components
const MilkTrendChart = lazy(() => import('../components/dashboard/MilkTrendChart'));
import ManagerInboxWidget from '../components/dashboard/ManagerInboxWidget';
import WelcomeChecklist from '../components/dashboard/WelcomeChecklist';
import MilestoneBanner from '../components/dashboard/MilestoneBanner';
import Money from '../components/ui/Money';
import { swahiliGreeting } from '../lib/welcomeProgress';
import { dashboardCopy } from '../i18n/dashboard';
import { Skeleton } from '@/components/ui';

const SummaryCard = ({ title, value, unit, loading = false }) => (
  <div className="glass-panel p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
    <div className="flex justify-between items-start z-10">
      <div className="space-y-1">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {title}
        </span>
        <div className="h-1 w-8 bg-brand rounded-full"></div>
      </div>
    </div>

    <div className="z-10 mt-4">
      {loading ? (
        <Skeleton className="h-12 w-3/5" />
      ) : (
        <>
          <div className="flex min-w-0 items-baseline break-words font-sans text-2xl font-black tracking-tight text-brand sm:text-3xl">
            {value}
            <span className="text-sm ml-2 font-bold text-ink-muted">{unit}</span>
          </div>
        </>
      )}
    </div>
  </div>
);
export default function CommandCenter() {
  const copy = dashboardCopy.summary;
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

  // The chart's daily litres come from the backend's daily totals for the chosen range (not
  // every milk record downloaded and added up). "All" asks for every recorded day.
  const trendRange = selectedRange === 'all'
    ? null
    : { from: toLocalIsoDate(dateRange.from), to: toLocalIsoDate(dateRange.to) };
  const trendParams = trendRange
    ? { levels: 'day', date_from: trendRange.from, date_to: trendRange.to }
    : { levels: 'day' };
  const trendQuery = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTION_GROUP_TOTALS(tenantId, farmId), 'dashboard-trend', trendParams],
    queryFn: () => productionApi.getGroupTotals(trendParams),
    enabled: !!farmId,
  });
  const trendState = getListLoadState(trendQuery);

  // All-time totals for the welcome checklist and milk milestones, from the backend. Keyed under
  // the milk rows, so every milk save refreshes it.
  const yieldTotalsQuery = useQuery({
    queryKey: [...QUERY_KEYS.YIELD_ROWS(tenantId, farmId), 'totals'],
    queryFn: () => productionApi.yieldTotals(),
    enabled: !!farmId,
  });
  const yieldTotals = yieldTotalsQuery.data;
  const trend = useMemo(
    () => buildDailyTrend(trendQuery.data, trendRange),
    // trendRange is rebuilt every render; its two strings are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trendQuery.data, trendRange?.from, trendRange?.to],
  );

  const selectTrendRange = (range) => {
    setSelectedRange(range);
    const today = new Date();
    if (range === 'all') return;
    setDateRange({ from: subDays(today, Number(range) - 1), to: today });
  };

  const summary = summaryQuery.data;
  const hasSummaryError = summaryQuery.isError;
  const isRetryingSummary = summaryQuery.isFetching;

  // Today's figures are the backend's (GET /production/summary). When it can't be reached they
  // show "—"; they are never worked out from the rows on this phone.
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
  ]);

  const cowsMilked = metricFromSummary(summary, [
    'cows_milked',
    'cowsMilked',
    'today_cows_milked',
    'todayCowsMilked',
    'milked_cows',
    'milkedCows',
  ]);

  const averageYieldPerCow = metricFromSummary(summary, [
    'average_yield_per_cow',
    'averageYieldPerCow',
    'avg_per_cow',
    'avgPerCow',
    'average_per_cow',
  ]);

  const profitPerLiter = metricFromSummary(summary, ['profit_per_liter', 'profitPerLiter']);
  const kesOrDash = (value) => (value === null || value === undefined ? '—' : `KES ${Number(value).toLocaleString()}`);

  const handleRetrySummary = async () => {
    await summaryQuery.refetch();
  };

  return (
    <div className="animate-entrance space-y-10 max-w-7xl mx-auto">
      
      <div className="flex justify-between items-end border-b border-ink/10 pb-4">
        <div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">{copy.title}</h2>
          <p className="font-sans text-sm text-ink-muted mt-1">{swahiliGreeting()} · {copy.liveData}</p>
        </div>
      </div>

      <WelcomeChecklist
        key={`welcome:${tenantId}:${farmId}`}
        tenantId={tenantId}
        farmId={farmId}
        milkRecordCount={yieldTotals?.totalRecords ?? null}
        milkLoaded={yieldTotalsQuery.isSuccess}
      />

      <MilestoneBanner
        key={`milestone:${tenantId}:${farmId}`}
        tenantId={tenantId}
        farmId={farmId}
        totalLitres={yieldTotals?.totalLitres ?? null}
        milkLoaded={yieldTotalsQuery.isSuccess}
      />

      <section>
        <ManagerInboxWidget />
      </section>

      {hasSummaryError && (
        <section className="rounded-xl border border-brand/20 bg-brand-50 px-4 py-3 text-sm text-brand-dark">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {copy.totalsFailed}
            </p>
            <button
              type="button"
              onClick={handleRetrySummary}
              disabled={isRetryingSummary}
              className="inline-flex items-center justify-center rounded-lg border border-brand/30 bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRetryingSummary ? copy.retrying : copy.retry}
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className="card-machined bg-surface p-5 border border-ink/5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">{copy.revenue}</p>
          <h3 className="mt-2 break-words text-xl font-black text-brand sm:text-2xl">
            {summaryQuery.isLoading ? copy.loading : hasSummaryError ? copy.unavailable : kesOrDash(summary?.revenue_total_kes)}
          </h3>
          {summary?.revenue_breakdown?.report_sales_revenue_kes != null && (
            <p className="mt-2 text-[11px] leading-4 text-ink-muted">
              {copy.reportReference(Number(summary.revenue_breakdown.report_sales_revenue_kes).toLocaleString())}
            </p>
          )}
        </div>
        <div className="card-machined bg-surface p-5 border border-ink/5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">{copy.feedCost}</p>
          <h3 className="mt-2 break-words text-xl font-black text-ink sm:text-2xl">
            {summaryQuery.isLoading ? copy.loading : hasSummaryError ? copy.unavailable : kesOrDash(summary?.feed_cost_total_kes)}
          </h3>
        </div>
        <div className="card-machined bg-brand/5 p-5 border-2 border-brand/20 ">
          <p className="text-xs font-bold text-brand uppercase tracking-wider">{copy.profit}</p>
          <h3 className="mt-2 break-words text-xl font-black text-brand sm:text-2xl">
            {summaryQuery.isLoading ? copy.loading : hasSummaryError ? copy.unavailable : kesOrDash(summary?.net_margin_kes)}
          </h3>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard title={copy.totalMilk} value={totalLitersToday === null ? '—' : totalLitersToday.toFixed(1)} unit={copy.liters} loading={summaryQuery.isLoading} />
        <SummaryCard title={copy.saleableMilk} value={summaryQuery.isLoading ? '—' : (summary?.saleable_liters ?? 0).toFixed(1)} unit={copy.liters} loading={summaryQuery.isLoading} />
        <SummaryCard title={copy.milkSold} value={summaryQuery.isLoading ? '—' : (summary?.total_sold_liters ?? 0).toFixed(1)} unit={copy.liters} loading={summaryQuery.isLoading} />
        <SummaryCard title={copy.milkRemaining} value={summaryQuery.isLoading ? '—' : (summary?.remaining_milk_liters ?? 0).toFixed(1)} unit={copy.liters} loading={summaryQuery.isLoading} />
        <SummaryCard title={copy.cowsMilked} value={cowsMilked ?? '—'} unit={copy.cows} loading={summaryQuery.isLoading} />
        <SummaryCard title={copy.averagePerCow} value={averageYieldPerCow ?? '—'} unit={copy.perCow} loading={summaryQuery.isLoading} />
        <SummaryCard title={copy.profitPerLiter} value={summaryQuery.isLoading ? '—' : <Money amount={profitPerLiter} currency={summary?.currency ?? 'KES'} />} loading={summaryQuery.isLoading} />
      </section>

      <div className="card-machined bg-surface p-8 border border-ink/10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h3 className="font-sans font-bold text-xl text-brand">

            {copy.trendTitle}
          </h3>
          <div className="inline-flex rounded-lg border border-ink/10 bg-surface p-1" role="group" aria-label={copy.trendRange}>
            {[['30', copy.ranges[30]], ['90', copy.ranges[90]], ['all', copy.ranges.all]].map(([value, label]) => (
              <button key={value} type="button" onClick={() => selectTrendRange(value)} aria-pressed={selectedRange === value} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${selectedRange === value ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-surface-raised hover:text-brand'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80 w-full bg-surface-warm/30 rounded-xl">
          {trendState !== 'ready' && (
            <ListLoadNotices state={trendState} label={copy.trendLabel} error={trendQuery.error} onRetry={trendQuery.refetch} />
          )}
          {trendState === 'loading' && <Skeleton className="h-full w-full" />}
          {hasRowsToShow(trendState) && (
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <MilkTrendChart data={trend} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
