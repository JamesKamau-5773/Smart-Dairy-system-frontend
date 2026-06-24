import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../hooks/useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import apiClient from '../lib/apiClient';
import { Activity, Droplets, TrendingUp, DollarSign, LineChart as ChartIcon } from 'lucide-react';
import React, { Suspense, lazy } from 'react';

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

export default function FarmDashboard() {
  const { tenantId, farmId } = useTenant();

  // 1. Yield Summary
  const { data: summary } = useQuery({
    queryKey: QUERY_KEYS.YIELD_SUMMARY(tenantId, farmId),
    queryFn: () => apiClient.get('/production/summary').then(res => res.data),
    enabled: !!farmId,
    initialData: { total_liters_today: 485, cows_milked: 44, average_yield_per_cow: 11.0, variance_from_yesterday: "+3.2%" }
  });

  // 2. Trend Data (MOCKED to match MilkTrendChart keys)
  const { data: trend } = useQuery({
    queryKey: QUERY_KEYS.YIELD_TREND(tenantId, farmId),
    queryFn: () => Promise.resolve([
      { date: 'Jun 19', value: 420 },
      { date: 'Jun 20', value: 440 },
      { date: 'Jun 21', value: 435 },
      { date: 'Jun 22', value: 470 },
      { date: 'Jun 23', value: 485 },
    ]),
    enabled: !!farmId,
  });

  // 3. Finance
  const { data: finance } = useQuery({
    queryKey: QUERY_KEYS.UNIT_COST(tenantId, farmId),
    queryFn: () => apiClient.get('/finance/unit-cost').then(res => res.data),
    enabled: !!farmId,
    initialData: { margin: 24.50, currency: 'KES' }
  });

  // 4. Dashboard Summary
  const { data: dashboardSummary } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_SUMMARY(tenantId, farmId),
    queryFn: () => apiClient.get('/v1/dashboard/summary').then((res) => res.data),
    enabled: !!farmId,
    initialData: { today_revenue_kes: 24250, today_feed_cost_kes: 7800, net_margin_kes: 16450 }
  });

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

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-machined bg-surface p-5 border border-ink/5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Milk Sales</p>
          <h3 className="text-2xl font-black text-brand mt-2">KES {dashboardSummary.today_revenue_kes.toLocaleString()}</h3>
        </div>
        <div className="card-machined bg-surface p-5 border border-ink/5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Feed Cost</p>
          <h3 className="text-2xl font-black text-ink mt-2">KES {dashboardSummary.today_feed_cost_kes.toLocaleString()}</h3>
        </div>
        <div className="card-machined bg-brand/5 p-5 border-2 border-brand/20 shadow-sm">
          <p className="text-xs font-bold text-brand uppercase tracking-wider">Daily Profit</p>
          <h3 className="text-2xl font-black text-brand mt-2">KES {dashboardSummary.net_margin_kes.toLocaleString()}</h3>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Milk (Today)" value={summary.total_liters_today} unit="Liters" icon={Droplets} trend={summary.variance_from_yesterday} />
        <SummaryCard title="Cows Milked" value={summary.cows_milked} unit="Cows" icon={Activity} />
        <SummaryCard title="Avg. per Cow" value={summary.average_yield_per_cow} unit="L/cow" icon={TrendingUp} />
        <SummaryCard title="Profit per Liter" value={<Money amount={finance.margin} currency={finance.currency} />} icon={DollarSign} />
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