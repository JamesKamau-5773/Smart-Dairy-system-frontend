import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartColumn, ChevronDown, Check, DollarSign, Droplets, Filter, Layers3, RotateCcw, Search, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { REPORT_PERIODS, getRangeForPeriod, isValidRange } from './reports/dashboardRange';

const currencyFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 1,
});

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value) {
  const amount = Number(value ?? 0);
  return numberFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function normalizeSummary(payload = {}) {
  const summary = payload?.summary ?? payload ?? {};

  return {
    total_amount_paid: Number(summary.total_amount_paid ?? 0),
    recognized_sales: Number(summary.recognized_sales ?? 0),
    posted_costs: Number(summary.posted_costs ?? 0),
    net_profit: Number(summary.net_profit ?? 0),
    outstanding_receivables: Number(summary.outstanding_receivables ?? 0),
    customer_credit: Number(summary.customer_credit ?? 0),
    total_income: Number(summary.total_income ?? 0),
    total_costs: Number(summary.total_costs ?? 0),
    total_profit: Number(summary.total_profit ?? 0),
    total_produced: Number(summary.total_produced ?? 0),
    total_sold: Number(summary.total_sold ?? 0),
    total_unsold: Number(summary.total_unsold ?? 0),
    milk_delivered_liters: Number(summary.milk_delivered_liters ?? 0),
    revenue_kes: Number(summary.revenue_kes ?? 0),
    amount_paid_kes: Number(summary.amount_paid_kes ?? 0),
    outstanding_balance_kes: Number(summary.outstanding_balance_kes ?? 0),
  };
}

async function fetchDashboardData(startDate, endDate, buyerIds = [], searchQuery = '') {
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');
  const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
  
  const buyerPerformanceResponses = buyerIds.length
    ? await Promise.all(buyerIds.map((buyerId) => apiClient.get(
      `/reports/buyer-performance?buyer_id=${encodeURIComponent(buyerId)}&start_date=${start}&end_date=${end}${searchParam}`,
    )))
    : [];

  const failedResponse = [...buyerPerformanceResponses].find((response) => response && response.status >= 400);

  if (failedResponse) {
    throw new Error(`Request failed with status ${failedResponse.status}`);
  }

  const [ledgerResponse, milkInventoryResponse, dairyEconomicsResponse] = await Promise.all([
    apiClient.get(`/finance/ledger?start_date=${start}&end_date=${end}${searchParam}`),
    apiClient.get(`/reports/milk-inventory?start_date=${start}&end_date=${end}${searchParam}`),
    apiClient.get(`/reports/dairy-unit-economics?start_date=${start}&end_date=${end}${searchParam}`),
  ]);

  const responses = [ledgerResponse, milkInventoryResponse, dairyEconomicsResponse, ...buyerPerformanceResponses];
  const requestFailure = responses.find((response) => response && response.status >= 400);

  if (requestFailure) {
    throw new Error(`Request failed with status ${requestFailure.status}`);
  }

  const [ledgerData, milkInventoryData, dairyEconomicsData, ...buyerPerformanceData] = responses.map((response) => response?.data ?? null);
  
  const aggregatedBuyerPerformance = buyerPerformanceData.length
    ? buyerPerformanceData.reduce((summary, buyerSummary) => ({
        buyer: buyerSummary?.buyer ?? summary.buyer,
        summary: {
          milk_delivered_liters: Number(summary.summary?.milk_delivered_liters ?? 0) + Number(buyerSummary?.summary?.milk_delivered_liters ?? 0),
          revenue_kes: Number(summary.summary?.revenue_kes ?? 0) + Number(buyerSummary?.summary?.revenue_kes ?? 0),
          amount_paid_kes: Number(summary.summary?.amount_paid_kes ?? 0) + Number(buyerSummary?.summary?.amount_paid_kes ?? 0),
          outstanding_balance_kes: Number(summary.summary?.outstanding_balance_kes ?? 0) + Number(buyerSummary?.summary?.outstanding_balance_kes ?? 0),
        },
        daily_records: [...(summary.daily_records ?? []), ...(buyerSummary?.daily_records ?? [])],
      }), { summary: {}, daily_records: [] })
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

async function fetchCustomersAndBuyers() {
  const response = await apiClient.get('/finance/customers');
  // Extract the .items array from the paginated backend response
  return response.data?.items || [];
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
  const [fetchState, setFetchState] = useState({ status: 'loading', error: null });
  const [dashboardData, setDashboardData] = useState(null);

  const resolvedRange = useMemo(() => ({
    start: format(range.startDate, 'yyyy-MM-dd'),
    end: format(range.endDate, 'yyyy-MM-dd'),
  }), [range.endDate, range.startDate]);

  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    let ignore = false;
    fetchCustomersAndBuyers()
      .then((items) => {
        if (!ignore) {
          setCustomers(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!ignore) setCustomers([]);
      });

    return () => { ignore = true; };
  }, []);

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

  useEffect(() => {
    const start = range.startDate;
    const end = range.endDate;

    if (!isValidRange(start, end)) {
      setFetchState({ status: 'error', error: 'The selected date range is invalid.' });
      setDashboardData(null);
      return;
    }

    setFetchState({ status: 'loading', error: null });

    let ignore = false;
    fetchDashboardData(start, end, selectedBuyerIds, searchQuery)
      .then((data) => {
        if (!ignore) {
          setDashboardData(data);
          setFetchState({ status: 'success', error: null });
        }
      })
      .catch((error) => {
        if (!ignore) {
          setDashboardData(null);
          setFetchState({ status: 'error', error: error.message || 'Unable to load the reporting dashboard.' });
        }
      });

    return () => {
      ignore = true;
    };
  }, [range.endDate, range.startDate, selectedBuyerIds, searchQuery]);

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
    { label: 'Income', value: formatCurrency(summary.total_income), icon: DollarSign, accentClass: 'text-emerald-600' },
    { label: 'Expenses', value: formatCurrency(summary.total_costs), icon: Wallet, accentClass: 'text-rose-600' },
    { label: 'Amount paid', value: formatCurrency(summary.total_amount_paid), icon: TrendingUp, accentClass: 'text-cyan-600' },
    { label: 'Balance', value: formatCurrency(summary.outstanding_receivables), icon: ChartColumn, accentClass: 'text-amber-600' },
    { label: 'Milk produced', value: `${formatNumber(summary.total_produced)} L`, icon: Droplets, accentClass: 'text-sky-600' },
    { label: 'Milk sold', value: `${formatNumber(summary.total_sold)} L`, icon: Layers3, accentClass: 'text-emerald-600' },
    { label: 'Unsold milk', value: `${formatNumber(summary.total_unsold)} L`, icon: Layers3, accentClass: 'text-rose-600' },
    { label: 'Net profit', value: formatCurrency(summary.net_profit), icon: TrendingUp, accentClass: 'text-violet-600' },
  ];

  const selectedPeriodLabel = REPORT_PERIODS.find((item) => item.key === period)?.label ?? 'Custom';

  return (
    <div className="animate-reveal mx-auto max-w-7xl space-y-6 pb-12">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
          <ChartColumn size={12} /> Operations reports
        </div>
        <h1 className="m-0 font-sans text-3xl font-black tracking-tight text-slate-900">Farm reporting dashboard</h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">
          Review income, costs, milk flow, and profitability for the selected period.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-xl border border-sky-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-sky-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-sky-800">
            <Filter size={16} />
            Search and filter reports
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <RotateCcw size={14} />
            Reset filters
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
            <input
              type="text"
              placeholder="Search customer, reference..."
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
                    ? 'All Customers'
                    : selectedBuyerIds.length === 1
                      ? customers.find((cust) => String(cust.id) === selectedBuyerIds[0])?.name ?? 'Customer Selected'
                      : `${selectedBuyerIds.length} Selected`}
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
                    <span>All Customers</span>
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
                aria-label="Start date"
                className="h-full w-full border-none bg-transparent px-3 text-sm text-slate-700 focus:outline-none focus:ring-0 sm:w-[135px]"
                value={resolvedRange.start}
                onChange={(e) => handleNativeDateChange('start_date', e.target.value)}
              />
              <div className="flex h-full items-center border-x border-slate-200 bg-slate-50 px-3 text-slate-400">
                -
              </div>
              <input
                type="date"
                aria-label="End date"
                className="h-full w-full border-none bg-transparent px-3 text-sm text-slate-700 focus:outline-none focus:ring-0 sm:w-[135px]"
                value={resolvedRange.end}
                onChange={(e) => handleNativeDateChange('end_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-b-xl border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-400">Quick Select:</span>
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
      {fetchState.status === 'loading' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite" aria-busy="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl animate-pulse bg-slate-100" />
          ))}
          <p className="sr-only">Loading dashboard…</p>
        </div>
      )}

      {fetchState.status === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="font-bold">Unable to load the reporting dashboard.</p>
          <p className="mt-1 text-sm">{fetchState.error || 'Please try another date range.'}</p>
        </div>
      )}

      {fetchState.status === 'success' && (
        <>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Showing: <strong className="text-slate-900">{selectedPeriodLabel}</strong>
              {searchQuery && <span> for search "<strong className="text-slate-900">{searchQuery}</strong>"</span>}
            </span>
            <span className="tabular-nums">{resolvedRange.start} to {resolvedRange.end}</span>
          </div>

          {selectedCustomer && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">Customer report</p>
                  <h2 className="mt-1 font-sans text-2xl font-black text-slate-900">{selectedCustomer.name}</h2>
                </div>
                <button type="button" onClick={handleResetFilters} className="text-sm font-semibold text-brand hover:underline">
                  Clear customer filter
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <SummaryCard label="Revenue" value={formatCurrency(buyerSummary.revenue_kes)} icon={DollarSign} accentClass="text-emerald-600 bg-emerald-50" />
                <SummaryCard label="Amount paid" value={formatCurrency(buyerSummary.amount_paid_kes)} icon={TrendingUp} accentClass="text-cyan-600 bg-cyan-50" />
                <SummaryCard label="Outstanding balance" value={formatCurrency(buyerSummary.outstanding_balance_kes)} icon={Wallet} accentClass="text-amber-600 bg-amber-50" />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <SummaryCard key={card.label} {...card} />
            ))}
          </div>

          {selectedCustomer && dashboardData?.buyerPerformance?.daily_records?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h3 className="font-sans text-lg font-bold text-slate-900">Delivery history</h3>
                <p className="mt-1 text-sm text-slate-500">Daily milk delivered to {selectedCustomer.name}.</p>
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 border-b border-slate-200">Date</th>
                      <th className="px-5 py-3 border-b border-slate-200">Delivered</th>
                      <th className="px-5 py-3 border-b border-slate-200">Revenue</th>
                      <th className="px-5 py-3 border-b border-slate-200">Amount paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.buyerPerformance.daily_records.map((record) => (
                      <tr key={record.date} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{format(new Date(`${record.date}T00:00:00`), 'MMM d, yyyy')}</td>
                        <td className="px-5 py-3 text-sm text-slate-600 tabular-nums">{formatNumber(record.milk_delivered_liters)} L</td>
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
                    <div className="col-span-2 font-semibold text-slate-900">{format(new Date(`${record.date}T00:00:00`), 'MMM d, yyyy')}</div>
                    <div><p className="text-xs text-slate-500">Delivered</p><p className="mt-1 font-semibold tabular-nums text-brand">{formatNumber(record.milk_delivered_liters)} L</p></div>
                    <div><p className="text-xs text-slate-500">Revenue</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(record.revenue_kes)}</p></div>
                    <div className="col-span-2"><p className="text-xs text-slate-500">Amount paid</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(record.amount_paid_kes)}</p></div>
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
