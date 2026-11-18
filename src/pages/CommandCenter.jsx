import { useQuery } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { useTenant } from '../hooks/useTenant';
import { useDailySummary } from '../hooks/useDailySummary';
import { TREND_RANGES, useMilkTrend } from '../hooks/useMilkTrend';
import { useSessionDismissal } from '../hooks/useSessionDismissal';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { productionApi } from '../lib/backendApi';
import { hasRowsToShow } from '../lib/listLoadState';
import { ListLoadNotices } from '../components/ui/ListLoadState';

// Components
const MilkTrendChart = lazy(() => import('../components/dashboard/MilkTrendChart'));
import ManagerInboxWidget from '../components/dashboard/ManagerInboxWidget';
import WelcomeChecklist from '../components/dashboard/WelcomeChecklist';
import MilestoneBanner from '../components/dashboard/MilestoneBanner';
import StatCard from '../components/dashboard/StatCard';
import InlineAlert from '../components/dashboard/InlineAlert';
import { MILK_CARDS, MONEY_CARDS, statCardProps } from '../components/dashboard/dailySummaryCards';
import { swahiliGreeting } from '../lib/welcomeProgress';
import { todayLocalIso } from '../lib/localDate';
import { dashboardCopy } from '../i18n/dashboard';
import { Skeleton } from '@/components/ui';
import { shellCopy } from '../i18n/shell';

// Where "Record milk" goes: the same milk entry page as the herdsman's "Record milk" button.
const RECORD_MILK_PATH = '/operations/clerk';

// The money region and the milk grid share one column grid (2 on phones and tablets, 4 on
// desktop) and one padding, so their columns line up.
const REGION = 'rounded-card border border-ink/10 bg-surface-warm/30 p-3 sm:p-4';
const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4';

export default function CommandCenter() {
  const copy = dashboardCopy.summary;
  const { tenantId, farmId } = useTenant();
  const daily = useDailySummary();
  const milkTrend = useMilkTrend();

  // All-time totals for the welcome checklist and milk milestones, from the backend. Keyed under
  // the milk rows, so every milk save refreshes it.
  const yieldTotalsQuery = useQuery({
    queryKey: [...QUERY_KEYS.YIELD_ROWS(tenantId, farmId), 'totals'],
    queryFn: () => productionApi.yieldTotals(),
    enabled: !!farmId,
  });
  const yieldTotals = yieldTotalsQuery.data;

  const cardProps = (card) => statCardProps(card, daily.figures, { copy });

  // "No milking recorded yet today": only once the backend has answered that no cows were
  // milked, and hidden for the rest of the session (per farm and day) once dismissed.
  const [noMilkDismissed, dismissNoMilk] = useSessionDismissal(`jivu:dashboard:no-milk:${tenantId}:${farmId}:${todayLocalIso()}`);
  const showNoMilkNotice = daily.hasRecordsToday === false && !noMilkDismissed;

  return (
    <div className="animate-entrance space-y-10 max-w-7xl mx-auto">
      
      <div className="flex justify-between items-end border-b border-ink/10 pb-4">
        <div>
          <h1 className="text-page-title text-brand m-0">{/* The sidebar's label for this page: one key for both. */}{shellCopy.nav.items.commandCenter}</h1>
          <p className="text-body text-ink-muted mt-1">{swahiliGreeting()} · {copy.liveData}</p>
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

      {daily.isError && (
        <section className="rounded-xl border border-brand/20 bg-brand-50 px-4 py-3 text-body text-brand-dark">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {copy.totalsFailed}
            </p>
            <button
              type="button"
              onClick={daily.retry}
              disabled={daily.isRetrying}
              className="inline-flex items-center justify-center rounded-lg border border-brand/30 bg-surface px-3 py-1.5 text-control text-brand-dark transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {daily.isRetrying ? copy.retrying : copy.retry}
            </button>
          </div>
        </section>
      )}

      {/* Money: Daily profit first and widest, Today's feed cost last (order in MONEY_CARDS). */}
      <section className={REGION} aria-label={copy.moneyRegion}>
        <div className={GRID}>
          {MONEY_CARDS.map((card) => (
            <StatCard
              key={card.id}
              {...cardProps(card)}
              variant={card.variant}
              loading={daily.isLoading}
              className={card.variant === 'primary' ? 'col-span-2' : ''}
            />
          ))}
        </div>
      </section>

      {/* Milk: one flat grid, always all seven cards in fixed places (order in MILK_CARDS). */}
      <section className={REGION} aria-label={copy.milkRegion}>
        {showNoMilkNotice && (
          <InlineAlert
            className="mb-3 sm:mb-4"
            message={copy.noMilkToday}
            actionLabel={copy.recordMilk}
            actionTo={RECORD_MILK_PATH}
            onDismiss={dismissNoMilk}
            dismissLabel={copy.dismissNoMilk}
          />
        )}
        <div className={GRID}>
          {MILK_CARDS.map((card) => (
            <StatCard key={card.id} {...cardProps(card)} loading={daily.isLoading} />
          ))}
        </div>
      </section>

      <div className="card-machined bg-surface p-8 border border-ink/10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h2 className="text-section-title text-brand">
            {copy.trendTitle}
          </h2>
          <div className="inline-flex rounded-lg border border-ink/10 bg-surface p-1" role="group" aria-label={copy.trendRange}>
            {TREND_RANGES.map((value) => (
              <button key={value} type="button" onClick={() => milkTrend.selectRange(value)} aria-pressed={milkTrend.selectedRange === value} className={`rounded-md px-3 py-1.5 text-control transition-colors ${milkTrend.selectedRange === value ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-surface-raised hover:text-brand'}`}>
                {copy.ranges[value]}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80 w-full bg-surface-warm/30 rounded-xl">
          {milkTrend.state !== 'ready' && (
            <ListLoadNotices state={milkTrend.state} label={copy.trendLabel} error={milkTrend.error} onRetry={milkTrend.retry} />
          )}
          {milkTrend.state === 'loading' && <Skeleton className="h-full w-full" />}
          {hasRowsToShow(milkTrend.state) && (
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <MilkTrendChart data={milkTrend.trend} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
