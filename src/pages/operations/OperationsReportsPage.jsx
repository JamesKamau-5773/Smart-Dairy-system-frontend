import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import FilterPanel from '@/components/data/FilterPanel';
import ToolbarDateRange from '@/components/data/ToolbarDateRange';
import { Toolbar, ToolbarPills, ToolbarSearch } from '@/components/data/Toolbar';
import { CONTROL } from '@/components/data/surface';
import { toolbarSlot, useToolbarLayout } from '@/components/data/toolbarLayout';
import { useReportFilters } from '@/hooks/useReportFilters';
import { financeApi, reportsApi } from '@/lib/backendApi';
import { useTenant } from '@/hooks/useTenant';
import { QUERY_KEYS } from '@/providers/QueryProvider';
import { getListLoadState, hasRowsToShow } from '@/lib/listLoadState';
import { ListLoadMessage, SlowLoadingHint, StaleDataNotice } from '@/components/ui/ListLoadState';
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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-label text-slate-500">{label}</p>
      <p className="mt-2 text-stat-value text-slate-900">{value}</p>
    </div>
  );
}

/**
 * The buyers filter: a multi-select (none of the shared controls is one), at the shared control
 * size and following the Toolbar's layout. Presentational: the page keeps the chosen buyers.
 */
function BuyerFilter({ customers, selectedIds, open, onOpenChange, onSelectAll, onToggle, menuRef }) {
  const slot = toolbarSlot(useToolbarLayout());
  const allChosen = selectedIds.length === 0 || selectedIds.length === customers.length;
  const optionClass = 'flex h-10 w-full items-center justify-between gap-3 px-3 text-left text-control text-ink transition-colors hover:bg-ink-50 focus:bg-ink-50 focus:outline-none';
  return (
    <div className={slot.wrapper || 'w-full sm:w-[220px]'} ref={menuRef}>
      <span id="report-buyers-label" className={slot.label}>{copy.customersLabel}</span>
      <div className="relative">
        <button
          type="button"
          className={`${CONTROL} flex w-full items-center justify-between gap-3 px-3 text-left hover:bg-ink-50`}
          onClick={() => onOpenChange(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-describedby="report-buyers-label"
        >
          <span className="truncate">
            {selectedIds.length === 0
              ? copy.allCustomers
              : selectedIds.length === 1
                ? customers.find((cust) => String(cust.id) === selectedIds[0])?.name ?? copy.customerSelected
                : copy.selectedCount(selectedIds.length)}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>

        {open && (
          <div role="listbox" aria-multiselectable="true" className="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-input border border-ink/10 bg-card sm:w-[min(22rem,calc(100vw-2rem))]">
            <button type="button" role="option" aria-selected={allChosen} className={`${optionClass} border-b border-ink/10`} onClick={onSelectAll}>
              <span>{copy.allCustomers}</span>
              {allChosen && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
            </button>
            <div className="max-h-72 overflow-y-auto">
              {customers.map((cust) => {
                const isSelected = selectedIds.includes(String(cust.id));
                return (
                  <button key={cust.id} type="button" role="option" aria-selected={isSelected} className={optionClass} onClick={() => onToggle(String(cust.id))}>
                    <span className="truncate">{cust.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OperationsReportsPage() {
  const { tenantId, farmId } = useTenant();
  // Search, buyers and dates live in the address (useReportFilters, on the shared useFilterState).
  const filters = useReportFilters();
  const { period, start_date: startDateFilter, end_date: endDateFilter } = filters.values;
  const startDateValue = startDateFilter || null;
  const endDateValue = endDateFilter || null;
  const searchQuery = filters.search;
  const selectedBuyerIds = filters.buyerIds;

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

  // A quick period sets its own dates (from dashboardRange), as before.
  const setPeriod = (nextPeriod) => {
    const nextRange = getRangeForPeriod(nextPeriod, startDateValue, endDateValue);
    filters.setDates({ period: nextPeriod, from: format(nextRange.startDate, 'yyyy-MM-dd'), to: format(nextRange.endDate, 'yyyy-MM-dd') });
  };
  // A chosen range is a custom period.
  const setCustomRange = (next) => filters.setDates({ period: 'custom', from: next?.from, to: next?.to });

  const handleCustomerSelect = (nextBuyerIds) => {
    filters.setBuyerIds(nextBuyerIds);
    setIsBuyerMenuOpen(false);
  };

  const handleCustomerToggle = (customerIdValue) => {
    const nextBuyerIds = selectedBuyerIds.includes(customerIdValue)
      ? selectedBuyerIds.filter((id) => id !== customerIdValue)
      : [...selectedBuyerIds, customerIdValue];

    handleCustomerSelect(nextBuyerIds);
  };

  const handleResetFilters = () => {
    filters.reset();
    setIsBuyerMenuOpen(false);
  };

  const selectedCustomer = selectedBuyerIds.length === 1
    ? customers.find((cust) => String(cust.id) === selectedBuyerIds[0]) ?? dashboardData?.buyerPerformance?.buyer ?? null
    : null;
  const buyerSummary = dashboardData?.buyerPerformance?.summary ?? {};
  const summary = dashboardData?.summary ?? normalizeSummary({ summary: {} });

  const cards = [
    { key: 'income', label: copy.cards.income, value: formatCurrency(summary.total_income) },
    { key: 'expenses', label: copy.cards.expenses, value: formatCurrency(summary.total_costs) },
    { key: 'amountPaid', label: copy.cards.amountPaid, value: formatCurrency(summary.total_amount_paid) },
    { key: 'balance', label: copy.cards.balance, value: formatCurrency(summary.outstanding_receivables) },
    { key: 'milkProduced', label: copy.cards.milkProduced, value: formatLitresFigure(summary.total_produced) },
    { key: 'milkSold', label: copy.cards.milkSold, value: formatLitresFigure(summary.total_sold) },
    { key: 'unsoldMilk', label: copy.cards.unsoldMilk, value: formatLitresFigure(summary.total_unsold) },
    { key: 'netProfit', label: copy.cards.netProfit, value: formatCurrency(summary.net_profit) },
  ];

  const selectedPeriodLabel = REPORT_PERIODS.find((item) => item.key === period)?.label ?? copy.periods.custom;

  return (
    <div className="animate-reveal mx-auto max-w-7xl space-y-6 pb-12">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="m-0 text-page-title text-slate-900">{copy.title}</h1>
        <p className="mt-2 max-w-xl text-body text-slate-500">
          {copy.subtitle}
        </p>
      </div>

      <FilterPanel title={copy.filterTitle} activeCount={filters.activeCount} onReset={handleResetFilters}>
        <Toolbar>
          <ToolbarSearch label={copy.searchPlaceholder} value={filters.values.q} onChange={filters.setSearch} placeholder={copy.searchPlaceholder} />

          <BuyerFilter
            customers={customers}
            selectedIds={selectedBuyerIds}
            open={isBuyerMenuOpen}
            onOpenChange={setIsBuyerMenuOpen}
            onSelectAll={() => handleCustomerSelect([])}
            onToggle={handleCustomerToggle}
            menuRef={buyerMenuRef}
          />

          <ToolbarDateRange range={{ from: resolvedRange.start, to: resolvedRange.end }} onChange={setCustomRange} />

          <ToolbarPills
            label={copy.quickSelect}
            value={period}
            onChange={setPeriod}
            options={REPORT_PERIODS.map((item) => ({ value: item.key, label: item.label }))}
          />
        </Toolbar>
      </FilterPanel>

      {/* DASHBOARD CONTENT */}
      {!rangeIsValid && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="text-body-strong">{copy.invalidRange}</p>
          <p className="mt-1 text-body">{copy.invalidRangeHint}</p>
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
          <div className="flex items-center justify-between text-body text-slate-500">
            <span>{copy.showing} <strong className="text-slate-900">{selectedPeriodLabel}</strong>
              {searchQuery && <span>{copy.forSearchBefore}<strong className="text-slate-900">{searchQuery}</strong>{copy.forSearchAfter}</span>}
            </span>
            <span className="tabular-nums">{copy.rangeTo(formatDate(resolvedRange.start), formatDate(resolvedRange.end))}</span>
          </div>

          {selectedCustomer && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-label text-brand">{copy.customerReport}</p>
                  <h2 className="mt-1 text-section-title text-slate-900">{selectedCustomer.name}</h2>
                </div>
                <button type="button" onClick={handleResetFilters} className="text-control text-brand hover:underline">
                  {copy.clearCustomer}
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <SummaryCard label={copy.revenue} value={formatCurrency(buyerSummary.revenue_kes)} />
                <SummaryCard label={copy.cards.amountPaid} value={formatCurrency(buyerSummary.amount_paid_kes)} />
                <SummaryCard label={copy.outstanding} value={formatCurrency(buyerSummary.outstanding_balance_kes)} />
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
                <h2 className="text-section-title text-slate-900">{copy.deliveryHistory}</h2>
                <p className="mt-1 text-body text-slate-500">{copy.deliveredTo(selectedCustomer.name)}</p>
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-slate-500">
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
                        <td className="px-5 py-3 text-body text-slate-900">{formatDate(record.date)}</td>
                        <td className="px-5 py-3 text-body text-slate-600">{formatLitresFigure(record.milk_delivered_liters)}</td>
                        <td className="px-5 py-3 text-body-strong text-slate-900">{formatCurrency(record.revenue_kes)}</td>
                        <td className="px-5 py-3 text-body-strong text-slate-900">{formatCurrency(record.amount_paid_kes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {dashboardData.buyerPerformance.daily_records.map((record) => (
                  <article key={record.date} className="grid grid-cols-2 gap-3 p-4 text-body">
                    <div className="col-span-2 text-body-strong text-slate-900">{formatDate(record.date)}</div>
                    <div><p className="text-meta text-slate-500">{copy.delivered}</p><p className="mt-1 text-body-strong tabular-nums text-brand">{formatLitresFigure(record.milk_delivered_liters)}</p></div>
                    <div><p className="text-meta text-slate-500">{copy.revenue}</p><p className="mt-1 text-body-strong tabular-nums text-slate-900">{formatCurrency(record.revenue_kes)}</p></div>
                    <div className="col-span-2"><p className="text-meta text-slate-500">{copy.cards.amountPaid}</p><p className="mt-1 text-body-strong tabular-nums text-slate-900">{formatCurrency(record.amount_paid_kes)}</p></div>
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
