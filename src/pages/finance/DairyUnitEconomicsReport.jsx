import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar as CalendarIcon,
  Filter,
  Calculator,
  Building2,
  HelpCircle,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { reportsApi } from '@/lib/backendApi';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import MetricLabel from '@/components/finance/MetricLabel';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function getStatusBadge(status) {
  switch (status) {
    case 'under 1:1':
      return {
        label: 'Unprofitable (< 1:1)',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertTriangle,
      };
    case '1:1–2:1':
    case '1:1-2:1':
      return {
        label: 'Low Margin (1:1–2:1)',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: AlertTriangle,
      };
    case '2:1–3:1':
    case '2:1-3:1':
      return {
        label: 'Healthy (2:1–3:1)',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: CheckCircle2,
      };
    case '3:1–4:1':
    case '3:1-4:1':
      return {
        label: 'Strong (3:1–4:1)',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
      };
    case 'above 4:1':
      return {
        label: 'Excellent (> 4:1)',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        icon: ShieldCheck,
      };
    default:
      return {
        label: status || 'N/A',
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: HelpCircle,
      };
  }
}

function CustomerSummary({ customerCount }) {
  const count = Number(customerCount ?? 0);
  const customerWord = count === 1 ? 'customer' : 'customers';

  return (
    <section
      aria-label="Customer summary"
      className="flex flex-col gap-3 border-l-4 border-brand bg-brand/5 px-4 py-4 text-ink sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div>
        <p className="text-xs font-bold uppercase text-brand">This period at a glance</p>
        <p className="mt-1 text-base font-bold sm:text-lg">
          You gained <span className="font-mono tabular-nums text-brand">{count}</span> new {customerWord} this period!
        </p>
      </div>
      <p className="text-sm font-medium text-ink-muted">Use the figures below to see what each customer costs and earns.</p>
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
  const {
    data: tenantData,
    isLoading: isTenantLoading,
    isError: isTenantError,
    refetch: refetchTenant,
  } = useQuery({
    queryKey: ['dairyUnitEconomics', queryParams],
    queryFn: () => reportsApi.getDairyUnitEconomics(queryParams),
    enabled: activeTab === 'tenant',
  });

  // 2. By Farm Report Query
  const {
    data: byFarmData,
    isLoading: isByFarmLoading,
    isError: isByFarmError,
    refetch: refetchByFarm,
  } = useQuery({
    queryKey: ['dairyUnitEconomicsByFarm', queryParams],
    queryFn: () => reportsApi.getDairyUnitEconomicsByFarm(queryParams),
    enabled: activeTab === 'by-farm',
  });

  // 3. Calculator Mutation
  const calcMutation = useMutation({
    mutationFn: (payload) => reportsApi.calculateDairyUnitEconomics(payload),
    onSuccess: (data) => {
      setCalcResult(normalizeDairyUnitEconomics(data));
      toast.success('Customer profit calculated successfully!');
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err?.message || 'Calculation failed';
      toast.error(msg);
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

  const activeData = normalizeDairyUnitEconomics(tenantData);

  return (
    <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand border border-brand/10 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <TrendingUp size={12} /> Financial Analytics
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-ink m-0">
            Customer Value & Profit
          </h1>
          <p className="text-sm font-medium text-ink-muted mt-2 max-w-2xl">
            See how much it costs to gain customers, how much profit they bring, and whether growth is paying off.
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
            Tenant Overview
          </button>
          <button
            onClick={() => setActiveTab('by-farm')}
            className={cn(
              'px-4 py-2 rounded-lg transition-all',
              activeTab === 'by-farm' ? 'bg-surface-warm  text-brand font-bold' : 'text-ink-muted hover:text-ink'
            )}
          >
            By Farm View
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={cn(
              'px-4 py-2 rounded-lg transition-all flex items-center gap-1.5',
              activeTab === 'calculator' ? 'bg-surface-warm  text-brand font-bold' : 'text-ink-muted hover:text-ink'
            )}
          >
            <Calculator size={14} /> Calculator
          </button>
        </div>
      </div>

      {activeTab === 'tenant' && !isTenantLoading && !isTenantError && (
        <CustomerSummary customerCount={activeData.new_customers_acquired} />
      )}

      {/* Date & Parameter Controls for Reports */}
      {activeTab !== 'calculator' && (
        <div className="card-machined p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Filter size={14} /> Period:
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
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(date.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
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
                  Marketing Spend (KES)
                </label>
                <input
                  type="number"
                  placeholder="Auto (from ledger)"
                  value={overrides.marketing_spend_kes}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, marketing_spend_kes: e.target.value }))}
                  className="input-machined w-full text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                  New Customers
                </label>
                <input
                  type="number"
                  placeholder="Auto (from sales)"
                  value={overrides.new_customers_acquired}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, new_customers_acquired: e.target.value }))}
                  className="input-machined w-full text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                  Lifespan (Months)
                </label>
                <input
                  type="number"
                  placeholder="Default (12)"
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
          {isTenantLoading ? (
            <div className="card-machined p-8 text-center text-ink-muted animate-pulse">
              Calculating customer value and profit…
            </div>
          ) : isTenantError ? (
            <div className="card-machined p-6 bg-rose-50 border-rose-200 text-rose-700">
              <p className="font-bold">Failed to load customer value and profit data.</p>
              <button
                onClick={() => refetchTenant()}
                className="mt-2 text-xs text-rose-800 underline font-semibold flex items-center gap-1"
              >
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          ) : (
            <>
              {/* Primary KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* CAC Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      <MetricLabel explanation="The marketing amount spent for each new customer gained during this period.">
                        Cost to Get a Customer
                      </MetricLabel>
                    </span>
                    <DollarSign size={16} className="text-brand" />
                  </div>
                  <div>
                    <div className={cn(
                      'text-2xl font-black font-mono tabular-nums',
                      Number(activeData.cac_kes ?? 0) > 0 ? 'text-ink' : 'text-amber-700'
                    )}>
                      {activeData.cac_kes != null ? `KES ${Number(activeData.cac_kes).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'N/A'}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">
                      Marketing spend divided by new customers
                    </p>
                  </div>
                </div>

                {/* LTV Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      <MetricLabel explanation="The profit already earned from each current customer based on recorded sales and costs.">
                        Total Profit per Customer
                      </MetricLabel>
                    </span>
                    <TrendingUp size={16} className="text-accent" />
                  </div>
                  <div>
                    <div className={cn(
                      'text-2xl font-black font-mono tabular-nums',
                      Number(activeData.realized_ltv_kes ?? 0) > 0
                        ? 'text-emerald-700'
                        : Number(activeData.realized_ltv_kes ?? 0) < 0 ? 'text-rose-700' : 'text-ink-muted'
                    )}>
                      KES {(activeData.realized_ltv_kes ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">
                      Recorded profit from each current customer
                    </p>
                  </div>
                </div>

                {/* LTV:CAC Ratio Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      <MetricLabel explanation="Compares the profit from a customer with what you spent to gain that customer.">
                        Profit vs. Cost Ratio
                      </MetricLabel>
                    </span>
                    <ArrowUpRight size={16} className="text-brand" />
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
                        : 'N/A'}{activeData.ltv_to_cac_ratio != null && 'x'}
                    </div>
                    <div className="mt-2">
                      {(() => {
                        const status = activeData.benchmark_status || activeData.status;
                        const badge = getStatusBadge(status);
                        const Icon = badge.icon;
                        return (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px]',
                              badge.color
                            )}
                          >
                            <Icon size={12} /> {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Operational Volume Card */}
                <div className="card-machined p-5 bg-surface-warm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-ink-muted mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Current Customers</span>
                    <Users size={16} className="text-ink-muted" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-ink font-mono tabular-nums">
                      {activeData.active_accounts ?? 0}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">
                      {activeData.liters_per_month_per_account != null
                        ? `${Number(activeData.liters_per_month_per_account).toFixed(1)} L/mo per account`
                        : 'Customer Accounts'}
                    </p>
                  </div>
                </div>
              </div>

              {(activeData.data_quality.zero_price_delivery_count > 0 ||
                activeData.data_quality.zero_price_billable_liters > 0 ||
                activeData.data_quality.has_recorded_production_costs === false ||
                activeData.data_quality.has_recorded_marketing_spend === false) && (
                <div className="border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <p className="font-bold">Data quality notes</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {activeData.data_quality.zero_price_delivery_count > 0 && <li><span className="font-mono tabular-nums">{activeData.data_quality.zero_price_delivery_count}</span> delivery records have no price.</li>}
                    {activeData.data_quality.zero_price_billable_liters > 0 && <li><span className="font-mono tabular-nums">{activeData.data_quality.zero_price_billable_liters}</span> billable liters have no price.</li>}
                    {activeData.data_quality.has_recorded_production_costs === false && <li>No production costs are recorded for this period.</li>}
                    {activeData.data_quality.has_recorded_marketing_spend === false && <li>No marketing spend is recorded, so customer cost and the profit-to-cost comparison are unavailable.</li>}
                  </ul>
                </div>
              )}

              {/* Detailed Breakdown Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-machined p-6 space-y-4">
                  <h3 className="font-sans font-bold text-lg text-ink border-b border-ink/10 pb-3">
                    Sales & Marketing Details
                  </h3>
                  <dl className="divide-y divide-ink/10 text-sm [&_dd]:font-mono [&_dd]:tabular-nums">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Sales & Marketing Spend</dt>
                      <dd className={cn(
                        'font-bold',
                        activeData.data_quality.has_recorded_marketing_spend === false || Number(activeData.marketing_spend_kes ?? 0) === 0
                          ? 'text-amber-700'
                          : 'text-ink'
                      )}>
                        {activeData.data_quality.has_recorded_marketing_spend === false
                          ? 'Not recorded'
                          : (activeData.marketing_spend_kes != null ? `KES ${Number(activeData.marketing_spend_kes).toLocaleString()}` : 'Not recorded')}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">New Customers Acquired</dt>
                      <dd className="font-bold text-ink">
                        {activeData.new_customers_acquired ?? 0}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Total Liters Sold</dt>
                      <dd className="font-bold text-ink">
                        {(activeData.total_liters_sold ?? 0).toLocaleString()} L
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Liters Purchased / Month / Customer</dt>
                      <dd className="font-bold text-ink">
                        {activeData.liters_purchased_per_month != null
                          ? Number(activeData.liters_purchased_per_month).toFixed(2)
                          : '0.00'} L
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="card-machined p-6 space-y-4">
                  <h3 className="font-sans font-bold text-lg text-ink border-b border-ink/10 pb-3">
                    Profitability & Customer Loyalty
                  </h3>
                  <dl className="divide-y divide-ink/10 text-sm [&_dd]:font-mono [&_dd]:tabular-nums">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Profit per Liter</dt>
                      <dd className={cn(
                        'font-bold',
                        Number(activeData.gross_margin_per_liter_kes ?? 0) > 0
                          ? 'text-emerald-700'
                          : Number(activeData.gross_margin_per_liter_kes ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                      )}>
                        KES {activeData.gross_margin_per_liter_kes != null
                          ? Number(activeData.gross_margin_per_liter_kes).toFixed(2)
                          : '0.00'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Assumed Customer Lifespan</dt>
                      <dd className="font-bold text-ink">
                        {activeData.customer_lifespan_months ?? 12} Months
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Projected Profit per Customer</dt>
                      <dd className="font-bold text-ink">
                        {activeData.forecast_ltv_kes != null ? `KES ${Number(activeData.forecast_ltv_kes).toLocaleString()}` : 'N/A'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Total Revenue</dt>
                      <dd className="font-bold text-ink">
                        {activeData.total_revenue != null ? `KES ${Number(activeData.total_revenue).toLocaleString()}` : 'N/A'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Customer Delivery Revenue</dt>
                      <dd className="font-bold text-ink">
                        {activeData.customer_delivery_revenue != null ? `KES ${Number(activeData.customer_delivery_revenue).toLocaleString()}` : 'N/A'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Buyer Sales Revenue</dt>
                      <dd className="font-bold text-ink">
                        {activeData.buyer_sales_revenue != null ? `KES ${Number(activeData.buyer_sales_revenue).toLocaleString()}` : 'N/A'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Total Production Cost</dt>
                      <dd className="font-bold text-ink">
                        {activeData.data_quality.has_recorded_production_costs === false
                          ? 'No costs recorded'
                          : (activeData.total_production_cost != null ? `KES ${Number(activeData.total_production_cost).toLocaleString()}` : 'N/A')}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Current Net Receivables</dt>
                      <dd className="font-bold text-ink">
                        {activeData.current_net_receivables != null ? `KES ${Number(activeData.current_net_receivables).toLocaleString()}` : 'N/A'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Outstanding Before Credits</dt>
                      <dd className="font-bold text-ink">
                        {activeData.outstanding_before_credits != null ? `KES ${Number(activeData.outstanding_before_credits).toLocaleString()}` : 'N/A'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-ink-muted">Customer Credits</dt>
                      <dd className="font-bold text-ink">
                        {activeData.customer_credits != null ? `KES ${Number(activeData.customer_credits).toLocaleString()}` : 'N/A'}
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
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <Building2 size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Tenant-Scoped Single Farm Model:</span> Each tenant operates a primary farm entity. Financial and milk sales figures reflect total tenant metrics for each registered farm entity.
            </div>
          </div>

          {isByFarmLoading ? (
            <div className="card-machined p-8 text-center text-ink-muted animate-pulse">
              Loading customer value and profit by farm…
            </div>
          ) : isByFarmError ? (
            <div className="card-machined p-6 bg-rose-50 border-rose-200 text-rose-700">
              <p className="font-bold">Failed to load farm-level data.</p>
              <button
                onClick={() => refetchByFarm()}
                className="mt-2 text-xs text-rose-800 underline font-semibold"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="card-machined p-6 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ink/10 text-[11px] font-bold uppercase text-ink-muted">
                    <th className="py-3 px-4">Farm Name</th>
                    <th className="py-3 px-4">Customer Cost (KES)</th>
                    <th className="py-3 px-4">Profit per Customer (KES)</th>
                    <th className="py-3 px-4">Profit vs. Cost</th>
                    <th className="py-3 px-4">Status Benchmark</th>
                    <th className="py-3 px-4">Profit/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {Array.isArray(byFarmData?.farms || byFarmData?.data || byFarmData) &&
                  (byFarmData?.farms || byFarmData?.data || byFarmData).length > 0 ? (
                    (byFarmData?.farms || byFarmData?.data || byFarmData).map((farm, i) => {
                      const status = farm.benchmark_status || farm.status;
                      const badge = getStatusBadge(status);
                      const Icon = badge.icon;
                      return (
                        <tr key={farm.farm_id || farm.id || i} className="hover:bg-surface-subtle transition-colors">
                          <td className="py-3 px-4 font-bold text-ink">
                            {farm.farm_name || farm.name || 'Primary Farm'}
                          </td>
                          <td className={cn(
                            'py-3 px-4 font-mono tabular-nums',
                            Number(farm.cac_kes ?? farm.cac ?? 0) > 0 ? 'text-ink' : 'text-amber-700'
                          )}>
                            {(farm.cac_kes ?? farm.cac ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className={cn(
                            'py-3 px-4 font-mono tabular-nums',
                            Number(farm.ltv_kes ?? farm.ltv ?? 0) > 0
                              ? 'text-emerald-700'
                              : Number(farm.ltv_kes ?? farm.ltv ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                          )}>
                            {(farm.ltv_kes ?? farm.ltv ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-bold text-brand font-mono tabular-nums">
                            {farm.ltv_to_cac_ratio != null
                              ? Number(farm.ltv_to_cac_ratio).toFixed(2)
                              : '0.00'}x
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs', badge.color)}>
                              <Icon size={12} /> {badge.label}
                            </span>
                          </td>
                          <td className={cn(
                            'py-3 px-4 font-mono tabular-nums',
                            Number(farm.gross_margin_per_liter_kes ?? 0) > 0
                              ? 'text-emerald-700'
                              : Number(farm.gross_margin_per_liter_kes ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                          )}>
                            KES {farm.gross_margin_per_liter_kes != null ? Number(farm.gross_margin_per_liter_kes).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-ink-muted">
                        No farm records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
              <h3 className="font-sans font-bold text-lg text-ink flex items-center gap-2">
                <Calculator size={18} className="text-brand" /> Customer Profit Calculator
              </h3>
              <p className="text-xs text-ink-muted mt-1">
                Enter your own sales figures to compare customer profit with customer cost.
              </p>
            </div>

            <form onSubmit={handleCalcSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  Sales & Marketing Spend (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 50000"
                  value={calcForm.sales_marketing_spend_kes}
                  onChange={(e) => setCalcForm((p) => ({ ...p, sales_marketing_spend_kes: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  New Customers Acquired *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 10"
                  value={calcForm.new_customers_acquired}
                  onChange={(e) => setCalcForm((p) => ({ ...p, new_customers_acquired: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  Liters Purchased / Month / Customer *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  placeholder="e.g. 120"
                  value={calcForm.liters_purchased_per_month}
                  onChange={(e) => setCalcForm((p) => ({ ...p, liters_purchased_per_month: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  Profit per Liter (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="e.g. 15.50"
                  value={calcForm.gross_margin_per_liter_kes}
                  onChange={(e) => setCalcForm((p) => ({ ...p, gross_margin_per_liter_kes: e.target.value }))}
                  className="input-machined w-full text-sm py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted uppercase mb-1">
                  Customer Lifespan (Months) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 12"
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
                  {calcMutation.isPending ? 'Calculating…' : 'Calculate Customer Profit'}
                </button>
              </div>
            </form>
          </div>

          {/* Results Card */}
          <div className="card-machined p-6 space-y-5 bg-surface-warm flex flex-col justify-between">
            <div>
              <div className="border-b border-ink/10 pb-3">
                <h3 className="font-sans font-bold text-lg text-ink">
                  Simulation Outcome
                </h3>
                <p className="text-xs text-ink-muted mt-1">
                  Calculated metrics from backend API.
                </p>
              </div>

              {calcResult ? (
                <div className="mt-5 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-subtle rounded-xl border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase block">Cost to Get a Customer</span>
                      <span className={cn(
                        'text-2xl font-black font-mono tabular-nums mt-1 block',
                        Number(calcResult.cac_kes ?? calcResult.cac ?? 0) > 0 ? 'text-ink' : 'text-amber-700'
                      )}>
                        KES {(calcResult.cac_kes ?? calcResult.cac ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-4 bg-surface-subtle rounded-xl border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase block">Total Profit per Customer</span>
                      <span className={cn(
                        'text-2xl font-black font-mono tabular-nums mt-1 block',
                        Number(calcResult.ltv_kes ?? calcResult.ltv ?? 0) > 0
                          ? 'text-emerald-700'
                          : Number(calcResult.ltv_kes ?? calcResult.ltv ?? 0) < 0 ? 'text-rose-700' : 'text-amber-700'
                      )}>
                        KES {(calcResult.ltv_kes ?? calcResult.ltv ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 bg-surface-subtle rounded-xl border border-ink/10 space-y-3">
                    <span className="text-[11px] font-bold text-ink-muted uppercase block">Profit vs. Cost Ratio</span>
                    <div className={cn(
                      'font-mono text-3xl font-semibold tabular-nums',
                      Number(calcResult.ltv_to_cac_ratio ?? 0) >= 3
                        ? 'text-emerald-700'
                        : calcResult.ltv_to_cac_ratio != null ? 'text-amber-700' : 'text-ink-muted'
                    )}>
                      {calcResult.ltv_to_cac_ratio != null
                        ? Number(calcResult.ltv_to_cac_ratio).toFixed(2)
                        : '0.00'}x
                    </div>
                    <div>
                      {(() => {
                        const status = calcResult.benchmark_status || calcResult.status;
                        const badge = getStatusBadge(status);
                        const Icon = badge.icon;
                        return (
                          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold', badge.color)}>
                            <Icon size={14} /> {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-ink-muted text-xs space-y-2">
                  <Calculator size={32} className="mx-auto text-ink-muted/50" />
                  <p>Fill in the details on the left and select "Calculate Customer Profit" to see the result.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-brand/5 border border-brand/10 rounded-lg text-[11px] text-ink-muted">
              <span className="font-bold text-brand">Healthy target:</span> Aim to earn at least <span className="font-bold text-ink font-mono tabular-nums">3:1</span> for every shilling spent gaining a customer.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
