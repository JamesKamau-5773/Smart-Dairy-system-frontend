import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { formatDate } from '@/lib/dateFormat';
import { financeCopy } from '@/i18n/finance';
import { Calendar as CalendarIcon } from 'lucide-react';
import { getApiErrorMessage, reportsApi } from '@/lib/backendApi';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import MetricLabel from '@/components/finance/MetricLabel';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useTenant } from '@/hooks/useTenant';
import { getListLoadState, hasRowsToShow } from '@/lib/listLoadState';
import { formatCount, formatLitres } from '@/lib/numberFormat';
import { ListLoadNotices } from '@/components/ui/ListLoadState';
import Skeleton from '@/components/ui/Skeleton';

const KPI_CARDS = 4;
const copy = financeCopy.unitEconomics;

// Figures the backend didn't send are shown as "—", never as zero.
const isUnknown = (value) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value));
const formatAmount = (value) => (isUnknown(value) ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const formatKesAmount = (value) => (isUnknown(value) ? '—' : `KES ${formatAmount(value)}`);
const formatKesFixed = (value) => (isUnknown(value) ? '—' : `KES ${Number(value).toFixed(2)}`);
const formatRatio = (value) => (isUnknown(value) ? '—' : `${Number(value).toFixed(2)}x`);

function ReportSkeleton({ label }) {
  return (
    <div role="status" className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: KPI_CARDS }, (_, index) => <Skeleton key={index} className="h-28 w-full" aria-hidden="true" />)}
    </div>
  );
}

function getStatusBadge(status) {
  switch (status) {
    case 'under 1:1':
      return {
        label: copy.benchmarks.unprofitable,
        color: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case '1:1–2:1':
    case '1:1-2:1':
      return {
        label: copy.benchmarks.low,
        color: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case '2:1–3:1':
    case '2:1-3:1':
      return {
        label: copy.benchmarks.healthy,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case '3:1–4:1':
    case '3:1-4:1':
      return {
        label: copy.benchmarks.strong,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'above 4:1':
      return {
        label: copy.benchmarks.excellent,
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      };
    default:
      return {
        label: status || copy.notAvailable,
        color: 'bg-gray-50 text-gray-700 border-gray-200',
      };
  }
}

function CustomerSummary({ customerCount }) {
  const known = !isUnknown(customerCount);
  const count = Number(customerCount);

  return (
    <section
      aria-label={copy.summaryLabel}
      className="flex flex-col gap-3 border-l-4 border-brand bg-brand/5 px-4 py-4 text-ink sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div>
        <p className="text-xs font-bold uppercase text-brand">{copy.glance}</p>
        <p className="mt-1 text-base font-bold sm:text-lg">
          {known
            ? <>{copy.gainedBefore}<span className="font-mono tabular-nums text-brand">{formatCount(count)}</span>{copy.gainedAfter(count)}</>
            : <>{copy.gainedUnknown}</>}
        </p>
      </div>
      <p className="text-sm font-medium text-ink-muted">{copy.summaryHint}</p>
    </section>
  );
}

function normalizeDairyUnitEconomics(response) {
  const payload = response?.data ?? response ?? {};
  const inputs = payload.inputs ?? {};
  const operational = payload.operational ?? {};
  const receivables = payload.receivables ?? {};
  const dataQuality = payload.data_quality ?? {};
  const results = payload.results ?? payload.result ?? payload;

  return {
    ...inputs,
    ...operational,
    ...results,
    marketing_spend_kes: inputs.marketing_spend_kes ?? inputs.sales_marketing_spend_kes,
    new_customers_acquired: inputs.new_customers_acquired,
    customer_lifespan_months: inputs.customer_lifespan_months,
    liters_purchased_per_month: operational.liters_per_month_per_account,
    gross_margin_per_liter_kes: operational.gross_margin_per_liter_kes,
    active_accounts: operational.active_accounts_total,
    total_liters_sold: operational.liters_sold_total,
    total_revenue: operational.revenue_total_kes,
    customer_delivery_revenue: operational.revenue_b2c_deliveries_kes,
    buyer_sales_revenue: operational.revenue_b2b_sales_kes,
    total_production_cost: operational.production_cost_total_kes,
    production_cost_per_liter: operational.production_cost_per_liter_kes,
    realized_contribution_total: operational.realized_contribution_total_kes,
    realized_ltv_kes: results.realized_ltv_kes ?? results.ltv_kes,
    forecast_ltv_kes: results.forecast_ltv_kes,
    current_net_receivables: receivables.current_net_balance_kes,
    outstanding_before_credits: receivables.current_outstanding_kes,
    customer_credits: receivables.current_customer_credit_kes,
    data_quality: dataQuality,
  };
}

export default function DairyUnitEconomicsReport() {
  const { tenantId, farmId } = useTenant();
  const [activeTab, setActiveTab] = React.useState('tenant'); // 'tenant' | 'by-farm' | 'calculator'

  // Date filter state
  const [date, setDate] = React.useState({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  // Optional query override state
  const [overrides, setOverrides] = React.useState({
    marketing_spend_kes: '',
    new_customers_acquired: '',
    customer_lifespan_months: '',
  });

  // Direct calculator form state
  const [calcForm, setCalcForm] = React.useState({
    sales_marketing_spend_kes: '',
    new_customers_acquired: '',
    liters_purchased_per_month: '',
    gross_margin_per_liter_kes: '',
    customer_lifespan_months: '12',
  });
  const [calcResult, setCalcResult] = React.useState(null);

  const queryParams = {
    start_date: date?.from ? format(date.from, 'yyyy-MM-dd') : undefined,
    end_date: date?.to ? format(date.to, 'yyyy-MM-dd') : undefined,
    marketing_spend_kes: overrides.marketing_spend_kes || undefined,
    new_customers_acquired: overrides.new_customers_acquired || undefined,
    customer_lifespan_months: overrides.customer_lifespan_months || undefined,
  };

  // 1. Tenant Report Query
  const tenantQuery = useQuery({
    queryKey: ['dairyUnitEconomics', tenantId, farmId, queryParams],
    queryFn: () => reportsApi.getDairyUnitEconomics(queryParams),
    enabled: activeTab === 'tenant',
  });

  // 2. By Farm Report Query
  const byFarmQuery = useQuery({
    queryKey: ['dairyUnitEconomicsByFarm', tenantId, farmId, queryParams],
    queryFn: () => reportsApi.getDairyUnitEconomicsByFarm(queryParams),
    enabled: activeTab === 'by-farm',
  });

  // 3. Calculator Mutation
  const calcMutation = useMutation({
    mutationFn: (payload) => reportsApi.calculateDairyUnitEconomics(payload),
    onSuccess: (data) => {
      setCalcResult(normalizeDairyUnitEconomics(data));
      toast.success(copy.calculated);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, copy.calculationFailed));
    },
  });

  const handleCalcSubmit = (e) => {
    e.preventDefault();
    const payload = {
      sales_marketing_spend_kes: Number(calcForm.sales_marketing_spend_kes),
      new_customers_acquired: Number(calcForm.new_customers_acquired),
      liters_purchased_per_month: Number(calcForm.liters_purchased_per_month),
      gross_margin_per_liter_kes: Number(calcForm.gross_margin_per_liter_kes),
      customer_lifespan_months: Number(calcForm.customer_lifespan_months),
    };
    calcMutation.mutate(payload);
  };

  const tenantState = getListLoadState(tenantQuery);
  const byFarmState = getListLoadState(byFarmQuery);
  const byFarmData = byFarmQuery.data;
  const activeData = normalizeDairyUnitEconomics(tenantQuery.data);

  return (
    <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-ink m-0">
            {copy.title}
          </h1>
          <p className="text-sm font-medium text-ink-muted mt-2 max-w-2xl">
            {copy.subtitle}
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex bg-surface-subtle p-1 rounded-xl border border-ink/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tenant')}
            className={cn(
              'px-4 py-2 rounded-lg transition-all',
              activeTab === 'tenant' ? 'bg-surface-warm  text-brand font-bold' : 'text-ink-muted hover:text-ink'
            )}
          >
            {copy.tabs.tenant}
          </button>
          <button
            onClick={() => setActiveTab('by-farm')}
            className={cn(
              'px-4 py-2 rounded-lg transition-all',
              activeTab === 'by-farm' ? 'bg-surface-warm  text-brand font-bold' : 'text-ink-muted hover:text-ink'
            )}
          >
            {copy.tabs.byFarm}
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={cn(
              'px-4 py-2 rounded-lg transition-all',
              activeTab === 'calculator' ? 'bg-surface-warm  text-brand font-bold' : 'text-ink-muted hover:text-ink'
            )}
          >

  {copy.tabs.calculator}
          </button>
        </div>
      </div>

      {activeTab === 'tenant' && hasRowsToShow(tenantState) && (
        <CustomerSummary customerCount={activeData.new_customers_acquired} />
      )}

      {/* Date & Parameter Controls for Reports */}
      {activeTab !== 'calculator' && (
        <div className="card-machined p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">

  {copy.period}
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      'w-[260px] justify-start text-left font-normal rounded-md border-ink/20 text-xs',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {formatDate(date.from)} - {formatDate(date.to)}
                        </>
                      ) : (
                        formatDate(date.from)
                      )
                    ) : (
                      <span>{copy.pickRange}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Parameter Overrides */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                  {copy.marketingSpend}
                </label>
                <input
                  type="number"
                  placeholder={copy.autoLedger}
                  value={overrides.marketing_spend_kes}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, marketing_spend_kes: e.target.value }))}
                  className="input-machined w-full text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                  {copy.newCustomers}
                </label>
                <input
                  type="number"
                  placeholder={copy.autoSales}
                  value={overrides.new_customers_acquired}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, new_customers_acquired: e.target.value }))}
                  className="input-machined w-full text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                  {copy.lifespan}
                </label>
                <input
                  type="number"
                  placeholder={copy.defaultLifespan}
                  value={overrides.customer_lifespan_months}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, customer_lifespan_months: e.target.value }))}
                  className="input-machined w-full text-xs py-1.5"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: TENANT OVERVIEW */}
      {activeTab === 'tenant' && (
        <div className="space-y-6">
          {tenantState !== 'ready' && (
            <div className="card-machined overflow-hidden !p-0">
              <ListLoadNotices state={tenantState} label={copy.figuresLabel} error={tenantQuery.error} onRetry={tenantQuery.refetch} />
            </div>
          )}
          {tenantState === 'loading' && <ReportSkeleton label={copy.calculating} />}
          {!hasRowsToShow(tenantState) ? null : (
            <>
              {/* Primary KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* CAC Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      <MetricLabel explanation={copy.cacHelp}>
                        {copy.cac}
                      </MetricLabel>
                    </span>
                  </div>
                  <div>
                    <div className={cn(
                      'text-2xl font-black font-mono tabular-nums',
                      Number(activeData.cac_kes ?? 0) > 0 ? 'text-ink' : 'text-amber-700'
                    )}>
                      {activeData.cac_kes != null ? `KES ${Number(activeData.cac_kes).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : copy.notAvailable}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">
                      {copy.cacHint}
                    </p>
                  </div>
                </div>

                {/* LTV Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      <MetricLabel explanation={copy.ltvHelp}>
                        {copy.ltv}
                      </MetricLabel>
                    </span>
                  </div>
                  <div>
                    <div className={cn(
                      'text-2xl font-black font-mono tabular-nums',
                      Number(activeData.realized_ltv_kes ?? 0) > 0
                        ? 'text-emerald-700'
                        : Number(activeData.realized_ltv_kes ?? 0) < 0 ? 'text-rose-700' : 'text-ink-muted'
                    )}>
                      {formatKesAmount(activeData.realized_ltv_kes)}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">
                      {copy.ltvHint}
                    </p>
                  </div>
                </div>

                {/* LTV:CAC Ratio Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      <MetricLabel explanation={copy.ratioHelp}>
                        {copy.ratio}
                      </MetricLabel>
                    </span>
                  </div>
                  <div>
                    <div className={cn(
                      'text-3xl font-black font-mono tabular-nums',
                      Number(activeData.ltv_to_cac_ratio ?? 0) >= 3
                        ? 'text-emerald-700'
                        : activeData.ltv_to_cac_ratio != null ? 'text-amber-700' : 'text-ink-muted'
                    )}>
                      {activeData.ltv_to_cac_ratio != null
                        ? Number(activeData.ltv_to_cac_ratio).toFixed(2)
                        : copy.notAvailable}{activeData.ltv_to_cac_ratio != null && 'x'}
                    </div>
                    <div className="mt-2">
                      {(() => {
                        const status = activeData.benchmark_status || activeData.status;
                        const badge = getStatusBadge(status);
                        return (
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px]',
                              badge.color
                            )}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Operational Volume Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">{copy.currentCustomers}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-ink font-mono tabular-nums">
                      {formatCount(activeData.active_accounts)}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">
                      {activeData.liters_per_month_per_account != null
                        ? copy.perAccount(Number(activeData.liters_per_month_per_account).toFixed(1))
                        : copy.accounts}
                    </p>
                  </div>
                </div>
              </div>

              {(activeData.data_quality.zero_price_delivery_count > 0 ||
                activeData.data_quality.zero_price_billable_liters > 0 ||
                activeData.data_quality.has_recorded_production_costs === false ||
                activeData.data_quality.has_recorded_marketing_spend === false) && (
                <div className="border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <p className="font-bold">{copy.qualityTitle}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {activeData.data_quality.zero_price_delivery_count > 0 && <li><span className="font-mono tabular-nums">{activeData.data_quality.zero_price_delivery_count}</span>{copy.unpricedDeliveries}</li>}
                    {activeData.data_quality.zero_price_billable_liters > 0 && <li><span className="font-mono tabular-nums">{activeData.data_quality.zero_price_billable_liters}</span>{copy.unpricedLitres}</li>}
                    {activeData.data_quality.has_recorded_production_costs === false && <li>{copy.noProductionCosts}</li>}
                    {activeData.data_quality.has_recorded_marketing_spend === false && <li>{copy.noMarketing}</li>}
                  </ul>
                </div>
              )}

              {/* Detailed Breakdown Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-machined p-6 space-y-4">
                  <h3 className="font-sans font-bold text-lg text-ink border-b border-ink/10 pb-3">
                    {copy.salesTitle}
                  </h3>
                  <dl className="divide-y divide-ink/10 text-sm [&_dd]:font-mono [&_dd]:tabular-nums">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.salesSpend}</dt>
                      <dd className={cn(
                        'font-bold',
                        activeData.data_quality.has_recorded_marketing_spend === false || Number(activeData.marketing_spend_kes ?? 0) === 0
                          ? 'text-amber-700'
                          : 'text-ink'
                      )}>
                        {activeData.data_quality.has_recorded_marketing_spend === false
                          ? copy.notRecorded
                          : (activeData.marketing_spend_kes != null ? `KES ${Number(activeData.marketing_spend_kes).toLocaleString()}` : copy.notRecorded)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.newAcquired}</dt>
                      <dd className="font-bold text-ink">
                        {formatCount(activeData.new_customers_acquired)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.litresSold}</dt>
                      <dd className="font-bold text-ink">
                        {formatLitres(activeData.total_liters_sold)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.litresPerCustomer}</dt>
                      <dd className="font-bold text-ink">
                        {isUnknown(activeData.liters_purchased_per_month) ? '—' : `${Number(activeData.liters_purchased_per_month).toFixed(2)} L`}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="card-machined p-6 space-y-4">
                  <h3 className="font-sans font-bold text-lg text-ink border-b border-ink/10 pb-3">
                    {copy.profitTitle}
                  </h3>
                  <dl className="divide-y divide-ink/10 text-sm [&_dd]:font-mono [&_dd]:tabular-nums">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.profitPerLiter}</dt>
                      <dd className={cn(
                        'font-bold',
                        Number(activeData.gross_margin_per_liter_kes ?? 0) > 0
                          ? 'text-emerald-700'
                          : Number(activeData.gross_margin_per_liter_kes ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                      )}>
                        {formatKesFixed(activeData.gross_margin_per_liter_kes)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.assumedLifespan}</dt>
                      <dd className="font-bold text-ink">
                        {isUnknown(activeData.customer_lifespan_months) ? '—' : copy.months(activeData.customer_lifespan_months)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.projected}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.forecast_ltv_kes != null ? `KES ${Number(activeData.forecast_ltv_kes).toLocaleString()}` : copy.notAvailable}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.totalRevenue}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.total_revenue != null ? `KES ${Number(activeData.total_revenue).toLocaleString()}` : copy.notAvailable}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.deliveryRevenue}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.customer_delivery_revenue != null ? `KES ${Number(activeData.customer_delivery_revenue).toLocaleString()}` : copy.notAvailable}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.buyerRevenue}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.buyer_sales_revenue != null ? `KES ${Number(activeData.buyer_sales_revenue).toLocaleString()}` : copy.notAvailable}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.productionCost}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.data_quality.has_recorded_production_costs === false
                          ? copy.noCosts
                          : (activeData.total_production_cost != null ? `KES ${Number(activeData.total_production_cost).toLocaleString()}` : copy.notAvailable)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.receivables}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.current_net_receivables != null ? `KES ${Number(activeData.current_net_receivables).toLocaleString()}` : copy.notAvailable}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.outstanding}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.outstanding_before_credits != null ? `KES ${Number(activeData.outstanding_before_credits).toLocaleString()}` : copy.notAvailable}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">{copy.credits}</dt>
                      <dd className="font-bold text-ink">
                        {activeData.customer_credits != null ? `KES ${Number(activeData.customer_credits).toLocaleString()}` : copy.notAvailable}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: BY FARM VIEW */}
      {activeTab === 'by-farm' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 ">
            <div>
              <span className="font-bold">{copy.farmModelTitle}</span> {copy.farmModel}
            </div>
          </div>

          {byFarmState !== 'ready' && (
            <div className="card-machined overflow-hidden !p-0">
              <ListLoadNotices state={byFarmState} label={copy.farmFigures} error={byFarmQuery.error} onRetry={byFarmQuery.refetch} />
            </div>
          )}
          {byFarmState === 'loading' && <ReportSkeleton label={copy.loadingFarms} />}
          {!hasRowsToShow(byFarmState) ? null : (
            <div className="card-machined min-w-0 p-3 sm:p-6">
              <table className="hidden w-full text-left text-sm border-collapse md:table">
                <thead>
                  <tr className="border-b border-ink/10 text-[11px] font-bold uppercase text-ink-muted">
                    <th className="py-3 px-4">{copy.farmColumns.name}</th>
                    <th className="py-3 px-4">{copy.farmColumns.cac}</th>
                    <th className="py-3 px-4">{copy.farmColumns.ltv}</th>
                    <th className="py-3 px-4">{copy.farmColumns.ratio}</th>
                    <th className="py-3 px-4">{copy.farmColumns.status}</th>
                    <th className="py-3 px-4">{copy.farmColumns.perLiter}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {Array.isArray(byFarmData?.farms || byFarmData?.data || byFarmData) &&
                  (byFarmData?.farms || byFarmData?.data || byFarmData).length > 0 ? (
                    (byFarmData?.farms || byFarmData?.data || byFarmData).map((farm, i) => {
                      const status = farm.benchmark_status || farm.status;
                      const badge = getStatusBadge(status);
                      return (
                        <tr key={farm.farm_id || farm.id || i} className="hover:bg-surface-subtle transition-colors">
                          <td className="py-3 px-4 font-bold text-ink">
                            {farm.farm_name || farm.name || copy.primaryFarm}
                          </td>
                          <td className={cn(
                            'py-3 px-4 font-mono tabular-nums',
                            Number(farm.cac_kes ?? farm.cac ?? 0) > 0 ? 'text-ink' : 'text-amber-700'
                          )}>
                            {formatAmount(farm.cac_kes ?? farm.cac)}
                          </td>
                          <td className={cn(
                            'py-3 px-4 font-mono tabular-nums',
                            Number(farm.ltv_kes ?? farm.ltv ?? 0) > 0
                              ? 'text-emerald-700'
                              : Number(farm.ltv_kes ?? farm.ltv ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                          )}>
                            {formatAmount(farm.ltv_kes ?? farm.ltv)}
                          </td>
                          <td className="py-3 px-4 font-bold text-brand font-mono tabular-nums">
                            {formatRatio(farm.ltv_to_cac_ratio)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-xs', badge.color)}>
                              {badge.label}
                            </span>
                          </td>
                          <td className={cn(
                            'py-3 px-4 font-mono tabular-nums',
                            Number(farm.gross_margin_per_liter_kes ?? 0) > 0
                              ? 'text-emerald-700'
                              : Number(farm.gross_margin_per_liter_kes ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                          )}>
                            {formatKesFixed(farm.gross_margin_per_liter_kes)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-ink-muted">
                        {copy.noFarms}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="space-y-3 md:hidden">
                {Array.isArray(byFarmData?.farms || byFarmData?.data || byFarmData) && (byFarmData?.farms || byFarmData?.data || byFarmData).length > 0
                  ? (byFarmData?.farms || byFarmData?.data || byFarmData).map((farm, i) => {
                    const status = farm.benchmark_status || farm.status;
                    const badge = getStatusBadge(status);
                    return <article key={farm.farm_id || farm.id || i} className="min-w-0 rounded-xl border border-ink/10 bg-surface p-4">
                      <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 break-words text-sm font-bold text-ink">{farm.farm_name || farm.name || copy.primaryFarm}</h3><span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[10px]', badge.color)}>{badge.label}</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-surface-raised p-3 text-xs">
                        <div><p className="text-ink-muted">{copy.customerCost}</p><p className="mt-1 font-semibold tabular-nums text-ink">{formatKesAmount(farm.cac_kes ?? farm.cac)}</p></div>
                        <div><p className="text-ink-muted">{copy.profitPerCustomer}</p><p className="mt-1 font-semibold tabular-nums text-brand">{formatKesAmount(farm.ltv_kes ?? farm.ltv)}</p></div>
                        <div><p className="text-ink-muted">{copy.profitVsCost}</p><p className="mt-1 font-semibold tabular-nums text-ink">{formatRatio(farm.ltv_to_cac_ratio)}</p></div>
                        <div><p className="text-ink-muted">{copy.profitPerL}</p><p className="mt-1 font-semibold tabular-nums text-brand">{formatKesFixed(farm.gross_margin_per_liter_kes)}</p></div>
                      </div>
                    </article>;
                  })
                  : <p className="p-5 text-center text-sm text-ink-muted">{copy.noFarms}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECT CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="card-machined p-6 space-y-5">
            <div className="border-b border-ink/10 pb-3">
              <h3 className="font-sans font-bold text-lg text-ink">

  {copy.calculatorTitle}
              </h3>
              <p className="text-xs text-ink-muted mt-1">
                {copy.calculatorHint}
              </p>
            </div>

            <form onSubmit={handleCalcSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  {copy.spendInput}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder={`${copy.example} 50000`}
                  value={calcForm.sales_marketing_spend_kes}
                  onChange={(e) => setCalcForm((p) => ({ ...p, sales_marketing_spend_kes: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  {copy.customersInput}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder={`${copy.example} 10`}
                  value={calcForm.new_customers_acquired}
                  onChange={(e) => setCalcForm((p) => ({ ...p, new_customers_acquired: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  {copy.litresInput}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  placeholder={`${copy.example} 120`}
                  value={calcForm.liters_purchased_per_month}
                  onChange={(e) => setCalcForm((p) => ({ ...p, liters_purchased_per_month: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  {copy.marginInput}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder={`${copy.example} 15.50`}
                  value={calcForm.gross_margin_per_liter_kes}
                  onChange={(e) => setCalcForm((p) => ({ ...p, gross_margin_per_liter_kes: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  {copy.lifespanInput}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder={`${copy.example} 12`}
                  value={calcForm.customer_lifespan_months}
                  onChange={(e) => setCalcForm((p) => ({ ...p, customer_lifespan_months: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={calcMutation.isPending}
                  className="btn-command w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2"
                >
                  {calcMutation.isPending ? copy.calculatingShort : copy.calculate}
                </button>
              </div>
            </form>
          </div>

          {/* Results Card */}
          <div className="card-machined p-6 space-y-5 bg-surface-warm flex flex-col justify-between">
            <div>
              <div className="border-b border-ink/10 pb-3">
                <h3 className="font-sans font-bold text-lg text-ink">
                  {copy.outcome}
                </h3>
                <p className="text-xs text-ink-muted mt-1">
                  {copy.outcomeHint}
                </p>
              </div>

              {calcResult ? (
                <div className="mt-5 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-subtle rounded-xl border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase block">{copy.cac}</span>
                      <span className={cn(
                        'text-2xl font-black font-mono tabular-nums mt-1 block',
                        Number(calcResult.cac_kes ?? calcResult.cac ?? 0) > 0 ? 'text-ink' : 'text-amber-700'
                      )}>
                        {formatKesAmount(calcResult.cac_kes ?? calcResult.cac)}
                      </span>
                    </div>

                    <div className="p-4 bg-surface-subtle rounded-xl border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase block">{copy.ltv}</span>
                      <span className={cn(
                        'text-2xl font-black font-mono tabular-nums mt-1 block',
                        Number(calcResult.ltv_kes ?? calcResult.ltv ?? 0) > 0
                          ? 'text-emerald-700'
                          : Number(calcResult.ltv_kes ?? calcResult.ltv ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                      )}>
                        {formatKesAmount(calcResult.ltv_kes ?? calcResult.ltv)}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 bg-surface-subtle rounded-xl border border-ink/10 space-y-3">
                    <span className="text-[11px] font-bold text-ink-muted uppercase block">{copy.ratio}</span>
                    <div className={cn(
                      'font-mono text-3xl font-semibold tabular-nums',
                      Number(calcResult.ltv_to_cac_ratio ?? 0) >= 3
                        ? 'text-emerald-700'
                        : calcResult.ltv_to_cac_ratio != null ? 'text-amber-700' : 'text-ink-muted'
                    )}>
                      {formatRatio(calcResult.ltv_to_cac_ratio)}
                    </div>
                    <div>
                      {(() => {
                        const status = calcResult.benchmark_status || calcResult.status;
                        const badge = getStatusBadge(status);
                        return (
                          <span className={cn('inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold', badge.color)}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-ink-muted text-xs space-y-2">
                  <p>{copy.emptyResult}</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-brand/5 border border-brand/10 rounded-lg text-[11px] text-ink-muted">
              <span className="font-bold text-brand">{copy.targetTitle}</span> {copy.targetBefore}<span className="font-bold text-ink font-mono tabular-nums">3:1</span>{copy.targetAfter}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
