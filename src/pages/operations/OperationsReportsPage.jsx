import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartColumn, ChevronDown, Check, DollarSign, Droplets, Filter, Layers3, RotateCcw, Search, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { financeApi, reportsApi } from '@/lib/backendApi';
import { useTenant } from '@/hooks/useTenant';
import { QUERY_KEYS } from '@/providers/QueryProvider';
import { getListLoadState, hasRowsToShow } from '@/lib/listLoadState';
import { ListLoadMessage, SlowLoadingHint, StaleDataNotice } from '@/components/ui/ListLoadState';
import { cn } from '@/lib/utils';
import { formatMoneyText } from '@/components/ui/Money';
import MoneyFlowChart from '@/components/finance/MoneyFlowChart';
import { REPORT_PERIODS, getRangeForPeriod, isValidRange } from './reports/dashboardRange';
import { formatDate } from '@/lib/dateFormat';
import { financeCopy } from '@/i18n/finance';

const copy = financeCopy.reports;

const numberFormatter = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 1,
});

// A figure the backend didn't send is unknown: "—", never 0.
const toFigure = (value) => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));

// One currency format app-wide ("KES 1,234.00"), from the shared Money helper.
const formatCurrency = (value) => formatMoneyText(toFigure(value));

function formatNumber(value) {
  const amount = toFigure(value);
  return amount === null ? '—' : numberFormatter.format(amount);
}

/** "1,234.5 L"; just "—" when unknown (no unit after a dash). */
const formatLitresFigure = (value) => (toFigure(value) === null ? '—' : `${formatNumber(value)} L`);

/** Adds figures from several buyers; unknown if any of them is unknown. */
const sumFigures = (left, right) => {
  const a = toFigure(left);
  const b = toFigure(right);
  return a === null || b === null ? null : a + b;
};

function normalizeSummary(payload = {}) {
  const summary = payload?.summary ?? payload ?? {};

  return {
    total_amount_paid: toFigure(summary.total_amount_paid),
    recognized_sales: toFigure(summary.recognized_sales),
    posted_costs: toFigure(summary.posted_costs),
    net_profit: toFigure(summary.net_profit),
    outstanding_receivables: toFigure(summary.outstanding_receivables),
    customer_credit: toFigure(summary.customer_credit),
    total_income: toFigure(summary.total_income),
    total_costs: toFigure(summary.total_costs),
    total_profit: toFigure(summary.total_profit),
    total_produced: toFigure(summary.total_produced),
    total_sold: toFigure(summary.total_sold),
    total_unsold: toFigure(summary.total_unsold),
    milk_delivered_liters: toFigure(summary.milk_delivered_liters),
    revenue_kes: toFigure(summary.revenue_kes),
    amount_paid_kes: toFigure(summary.amount_paid_kes),
    outstanding_balance_kes: toFigure(summary.outstanding_balance_kes),
  };
}

/**
 * Combines the backend's report responses into what the dashboard shows.
 * TODO(BR-012): with several buyers selected, their figures are added up here; the backend
 * should accept several buyer ids and return the combined figures.
 */
function combineDashboardData({
  ledger: ledgerData,
  milkInventory: milkInventoryData,
  dairyEconomics: dairyEconomicsData,
  buyerPerformance: buyerPerformanceData,
}) {
  const aggregatedBuyerPerformance = buyerPerformanceData.length
    ? buyerPerformanceData.reduce((summary, buyerSummary) => ({
        buyer: buyerSummary?.buyer ?? summary.buyer,
        summary: {
          milk_delivered_liters: sumFigures(summary.summary?.milk_delivered_liters, buyerSummary?.summary?.milk_delivered_liters),
          revenue_kes: sumFigures(summary.summary?.revenue_kes, buyerSummary?.summary?.revenue_kes),
          amount_paid_kes: sumFigures(summary.summary?.amount_paid_kes, buyerSummary?.summary?.amount_paid_kes),
          outstanding_balance_kes: sumFigures(summary.summary?.outstanding_balance_kes, buyerSummary?.summary?.outstanding_balance_kes),
        },
        daily_records: [...(summary.daily_records ?? []), ...(buyerSummary?.daily_records ?? [])],
      }), {
        summary: { milk_delivered_liters: 0, revenue_kes: 0, amount_paid_kes: 0, outstanding_balance_kes: 0 },
        daily_records: [],
      })
    : null;

  // Combine raw summaries before normalizing to prevent overwriting with zeroes
  const combinedSummary = {
    ...(ledgerData?.summary || {}),
    ...(milkInventoryData?.summary || {}),
    ...(dairyEconomicsData?.summary || {}),
    ...(aggregatedBuyerPerformance?.summary || {}),
  };

  return {
    ledger: ledgerData,
    milkInventory: milkInventoryData,
    dairyEconomics: dairyEconomicsData,
    buyerPerformance: aggregatedBuyerPerformance,
    summary: normalizeSummary(combinedSummary),
  };
}

function SummaryCard({ label, value, icon: Icon, accentClass = 'text-brand' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 font-sans text-2xl font-black text-slate-900 tabular-nums">{value}</p>
        </div>
        <div className={cn('rounded-full bg-slate-50 p-3', accentClass)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function OperationsReportsPage() {
  const { tenantId, farmId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') || 'daily';
  const startDateValue = searchParams.get('start_date');
  const endDateValue = searchParams.get('end_date');
  const buyerId = searchParams.get('buyer_id');
  const searchQuery = searchParams.get('q') || '';
  
  const [searchValue, setSearchValue] = useState(searchQuery);

  const selectedBuyerIds = useMemo(() => {
    if (!buyerId) return [];
    return buyerId.split(',').map((value) => value.trim()).filter(Boolean);
  }, [buyerId]);
  
  const range = useMemo(
    () => getRangeForPeriod(period, startDateValue, endDateValue),
    [endDateValue, period, startDateValue],
  );
  
  const [isBuyerMenuOpen, setIsBuyerMenuOpen] = useState(false);
  const buyerMenuRef = useRef(null);

  const resolvedRange = useMemo(() => ({
    start: format(range.startDate, 'yyyy-MM-dd'),
    end: format(range.endDate, 'yyyy-MM-dd'),
  }), [range.endDate, range.startDate]);

  // Same list and cache as the Customers and Buyers pages.
  const customersQuery = useQuery({
    queryKey: QUERY_KEYS.CUSTOMERS(tenantId, farmId),
    queryFn: () => financeApi.listCustomers().then((res) => res?.items || res?.data || res || []),
    enabled: !!farmId,
  });
  const customers = Array.isArray(customersQuery.data) ? customersQuery.data : [];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (buyerMenuRef.current && !buyerMenuRef.current.contains(event.target)) {
        setIsBuyerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // Corrected Debounce logic to prevent infinite rendering loops
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchParams((prevParams) => {
        const currentQ = prevParams.get('q') || '';
        if (currentQ === searchValue) return prevParams;

        const newParams = new URLSearchParams(prevParams);
        if (searchValue) {
          newParams.set('q', searchValue);
        } else {
          newParams.delete('q');
        }
        return newParams;
      }, { replace: true });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue, setSearchParams]);

  const rangeIsValid = isValidRange(range.startDate, range.endDate);
  const dashboardQuery = useQuery({
    queryKey: ['operations-reports', tenantId, farmId, resolvedRange.start, resolvedRange.end, selectedBuyerIds.join(','), searchQuery],
    queryFn: () => reportsApi.getOperationsDashboard({
      startDate: resolvedRange.start,
      endDate: resolvedRange.end,
      buyerIds: selectedBuyerIds,
      search: searchQuery,
    }).then(combineDashboardData),
    enabled: rangeIsValid && !!farmId,
  });
  const reportState = getListLoadState(dashboardQuery);
  const dashboardData = hasRowsToShow(reportState) ? dashboardQuery.data : null;

  const setPeriod = (nextPeriod) => {
    const nextRange = getRangeForPeriod(nextPeriod, startDateValue, endDateValue);
    const start = format(nextRange.startDate, 'yyyy-MM-dd');
    const end = format(nextRange.endDate, 'yyyy-MM-dd');
    const params = new URLSearchParams(searchParams);
    params.set('period', nextPeriod);
    params.set('start_date', start);
    params.set('end_date', end);
    setSearchParams(params, { replace: true });
  };

  const handleNativeDateChange = (field, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(field, value);
      params.set('period', 'custom'); 
    } else {
      params.delete(field);
    }
    setSearchParams(params, { replace: true });
  };

  const handleCustomerSelect = (nextBuyerIds) => {
    const params = new URLSearchParams(searchParams);
    const normalizedBuyerIds = nextBuyerIds.filter(Boolean);
    if (normalizedBuyerIds.length) {
      params.set('buyer_id', normalizedBuyerIds.join(','));
    } else {
      params.delete('buyer_id');
    }
    setSearchParams(params, { replace: true });
    setIsBuyerMenuOpen(false);
  };

  const handleCustomerToggle = (customerIdValue) => {
    const nextBuyerIds = selectedBuyerIds.includes(customerIdValue)
      ? selectedBuyerIds.filter((id) => id !== customerIdValue)
      : [...selectedBuyerIds, customerIdValue];

    handleCustomerSelect(nextBuyerIds);
  };

  const handleResetFilters = () => {
    setSearchValue('');
    setSearchParams(new URLSearchParams(), { replace: true });
    setIsBuyerMenuOpen(false);
  };

  const selectedCustomer = selectedBuyerIds.length === 1
    ? customers.find((cust) => String(cust.id) === selectedBuyerIds[0]) ?? dashboardData?.buyerPerformance?.buyer ?? null
    : null;
  const buyerSummary = dashboardData?.buyerPerformance?.summary ?? {};
  const summary = dashboardData?.summary ?? normalizeSummary({ summary: {} });

  const cards = [
    { key: 'income', label: copy.cards.income, value: formatCurrency(summary.total_income), icon: DollarSign, accentClass: 'text-emerald-600' },
    { key: 'expenses', label: copy.cards.expenses, value: formatCurrency(summary.total_costs), icon: Wallet, accentClass: 'text-rose-600' },
    { key: 'amountPaid', label: copy.cards.amountPaid, value: formatCurrency(summary.total_amount_paid), icon: TrendingUp, accentClass: 'text-cyan-600' },
    { key: 'balance', label: copy.cards.balance, value: formatCurrency(summary.outstanding_receivables), icon: ChartColumn, accentClass: 'text-amber-600' },
    { key: 'milkProduced', label: copy.cards.milkProduced, value: formatLitresFigure(summary.total_produced), icon: Droplets, accentClass: 'text-sky-600' },
    { key: 'milkSold', label: copy.cards.milkSold, value: formatLitresFigure(summary.total_sold), icon: Layers3, accentClass: 'text-emerald-600' },
    { key: 'unsoldMilk', label: copy.cards.unsoldMilk, value: formatLitresFigure(summary.total_unsold), icon: Layers3, accentClass: 'text-rose-600' },
    { key: 'netProfit', label: copy.cards.netProfit, value: formatCurrency(summary.net_profit), icon: TrendingUp, accentClass: 'text-violet-600' },
  ];

  const selectedPeriodLabel = REPORT_PERIODS.find((item) => item.key === period)?.label ?? copy.periods.custom;

  return (
    <div className="animate-reveal mx-auto max-w-7xl space-y-6 pb-12">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
          <ChartColumn size={12} /> {copy.badge}
        </div>
        <h1 className="m-0 font-sans text-3xl font-black tracking-tight text-slate-900">{copy.title}</h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">
          {copy.subtitle}
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-xl border border-sky-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-sky-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-sky-800">
            <Filter size={16} />
            {copy.filterTitle}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <RotateCcw size={14} />
            {copy.resetFilters}
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
            <input
              type="text"
              placeholder={copy.searchPlaceholder}
              className="h-10 w-full rounded-lg border border-ink/20 bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:ml-auto">
            <div className="relative w-full sm:w-[220px]" ref={buyerMenuRef}>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-between gap-3 rounded-lg border-slate-200 bg-white px-3 text-left font-normal text-slate-700 shadow-none hover:bg-slate-50"
                onClick={() => setIsBuyerMenuOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={isBuyerMenuOpen}
              >
                <span className="truncate">
                  {selectedBuyerIds.length === 0
                    ? copy.allCustomers
                    : selectedBuyerIds.length === 1
                      ? customers.find((cust) => String(cust.id) === selectedBuyerIds[0])?.name ?? copy.customerSelected
                      : copy.selectedCount(selectedBuyerIds.length)}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </Button>

              {isBuyerMenuOpen && (
                <div
                  role="listbox"
                  aria-multiselectable="true"
                  className="absolute right-0 z-50 mt-2 w-full sm:w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedBuyerIds.length === 0 || selectedBuyerIds.length === customers.length}
                    className="flex h-10 w-full items-center justify-between gap-3 border-b border-slate-100 px-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    onClick={() => handleCustomerSelect([])}
                  >
                    <span>{copy.allCustomers}</span>
                    {(selectedBuyerIds.length === 0 || selectedBuyerIds.length === customers.length) && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
                  </button>
                  <div className="max-h-72 overflow-y-auto">
                    {customers.map((cust) => {
                      const isSelected = selectedBuyerIds.includes(String(cust.id));
                      return (
                        <button
                          key={cust.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className="flex h-10 w-full items-center justify-between gap-3 px-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                          onClick={() => handleCustomerToggle(String(cust.id))}
                        >
                          <span className="truncate">{cust.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex h-10 w-full items-center overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand sm:w-auto">
              <input
                type="date"
                aria-label={copy.startDate}
                className="h-full w-full border-none bg-transparent px-3 text-sm text-slate-700 focus:outline-none focus:ring-0 sm:w-[135px]"
                value={resolvedRange.start}
                onChange={(e) => handleNativeDateChange('start_date', e.target.value)}
              />
              <div className="flex h-full items-center border-x border-slate-200 bg-slate-50 px-3 text-slate-400">
                -
              </div>
              <input
                type="date"
                aria-label={copy.endDate}
                className="h-full w-full border-none bg-transparent px-3 text-sm text-slate-700 focus:outline-none focus:ring-0 sm:w-[135px]"
                value={resolvedRange.end}
                onChange={(e) => handleNativeDateChange('end_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-b-xl border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-400">{copy.quickSelect}</span>
          {REPORT_PERIODS.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              className={cn(
                "h-8 rounded-full px-4 text-xs font-semibold shadow-none transition-colors",
                period === item.key 
                  ? "bg-slate-800 text-white hover:bg-slate-900 hover:text-white" 
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* DASHBOARD CONTENT */}
      {!rangeIsValid && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="font-bold">{copy.invalidRange}</p>
          <p className="mt-1 text-sm">{copy.invalidRangeHint}</p>
        </div>
      )}

      {rangeIsValid && reportState === 'loading' && <SlowLoadingHint label={copy.listLabel} />}
      {rangeIsValid && reportState === 'loading' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite" aria-busy="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl animate-pulse bg-slate-100" />
          ))}
          <p className="sr-only">{copy.loading}</p>
        </div>
      )}

      {rangeIsValid && (reportState === 'error' || reportState === 'offline') && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <ListLoadMessage state={reportState} label={copy.listLabel} error={dashboardQuery.error} onRetry={dashboardQuery.refetch} />
        </div>
      )}

      {rangeIsValid && reportState === 'stale' && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <StaleDataNotice label={copy.listLabel} error={dashboardQuery.error} onRetry={dashboardQuery.refetch} />
        </div>
      )}

      {rangeIsValid && dashboardData && (
        <>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{copy.showing} <strong className="text-slate-900">{selectedPeriodLabel}</strong>
              {searchQuery && <span>{copy.forSearchBefore}<strong className="text-slate-900">{searchQuery}</strong>{copy.forSearchAfter}</span>}
            </span>
            <span className="tabular-nums">{copy.rangeTo(formatDate(resolvedRange.start), formatDate(resolvedRange.end))}</span>
          </div>

          {selectedCustomer && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">{copy.customerReport}</p>
                  <h2 className="mt-1 font-sans text-2xl font-black text-slate-900">{selectedCustomer.name}</h2>
                </div>
                <button type="button" onClick={handleResetFilters} className="text-sm font-semibold text-brand hover:underline">
                  {copy.clearCustomer}
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <SummaryCard label={copy.revenue} value={formatCurrency(buyerSummary.revenue_kes)} icon={DollarSign} accentClass="text-emerald-600 bg-emerald-50" />
                <SummaryCard label={copy.cards.amountPaid} value={formatCurrency(buyerSummary.amount_paid_kes)} icon={TrendingUp} accentClass="text-cyan-600 bg-cyan-50" />
                <SummaryCard label={copy.outstanding} value={formatCurrency(buyerSummary.outstanding_balance_kes)} icon={Wallet} accentClass="text-amber-600 bg-amber-50" />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <SummaryCard key={card.key} {...card} />
            ))}
          </div>

          <MoneyFlowChart
            start={resolvedRange.start}
            end={resolvedRange.end}
            search={searchQuery}
            customerSelected={selectedBuyerIds.length > 0}
          />

          {selectedCustomer && dashboardData?.buyerPerformance?.daily_records?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h3 className="font-sans text-lg font-bold text-slate-900">{copy.deliveryHistory}</h3>
                <p className="mt-1 text-sm text-slate-500">{copy.deliveredTo(selectedCustomer.name)}</p>
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 border-b border-slate-200">{copy.date}</th>
                      <th className="px-5 py-3 border-b border-slate-200">{copy.delivered}</th>
                      <th className="px-5 py-3 border-b border-slate-200">{copy.revenue}</th>
                      <th className="px-5 py-3 border-b border-slate-200">{copy.cards.amountPaid}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.buyerPerformance.daily_records.map((record) => (
                      <tr key={record.date} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{formatDate(record.date)}</td>
                        <td className="px-5 py-3 text-sm text-slate-600 tabular-nums">{formatLitresFigure(record.milk_delivered_liters)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(record.revenue_kes)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(record.amount_paid_kes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {dashboardData.buyerPerformance.daily_records.map((record) => (
                  <article key={record.date} className="grid grid-cols-2 gap-3 p-4 text-sm">
                    <div className="col-span-2 font-semibold text-slate-900">{formatDate(record.date)}</div>
                    <div><p className="text-xs text-slate-500">{copy.delivered}</p><p className="mt-1 font-semibold tabular-nums text-brand">{formatLitresFigure(record.milk_delivered_liters)}</p></div>
                    <div><p className="text-xs text-slate-500">{copy.revenue}</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(record.revenue_kes)}</p></div>
                    <div className="col-span-2"><p className="text-xs text-slate-500">{copy.cards.amountPaid}</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(record.amount_paid_kes)}</p></div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
