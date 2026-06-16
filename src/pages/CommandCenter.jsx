import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../hooks/useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import apiClient from '../lib/apiClient';
import { Activity, Droplets, TrendingUp, DollarSign, LineChart as ChartIcon } from 'lucide-react';
import React, { Suspense, lazy } from 'react';

const MilkTrendChart = lazy(() => import('../components/dashboard/MilkTrendChart'));

import Money from '../components/ui/Money';
import { Skeleton } from '../components/ui';
import AlertBanner from '../components/ui/AlertBanner';

const SummaryCard = ({ title, value, unit, icon: Icon, trend, loading = false }) => (
  <div className="glass-panel p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
    {/* Decorative Background Icon */}
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
        <div className="space-y-3">
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-4 w-24" />
          {trend && <Skeleton className="h-5 w-28" />}
        </div>
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

  // ─── DATA FETCHING (Parallel & Tenant-Scoped) ───

  const { 
    data: summary, 
    isLoading: loadingSummary, 
    isError: errorSummary 
  } = useQuery({
    queryKey: QUERY_KEYS.YIELD_SUMMARY(tenantId, farmId),
    queryFn: () => apiClient.get('/production/summary').then(res => res.data),
    enabled: !!farmId, // Only fetch if a farm is active
  });

  const { 
    data: trend, 
    isLoading: loadingTrend 
  } = useQuery({
    queryKey: QUERY_KEYS.YIELD_TREND(tenantId, farmId),
    queryFn: () => apiClient.get('/production/yield/rolling-average').then(res => res.data),
    enabled: !!farmId,
  });

  const { 
    data: finance, 
    isLoading: loadingFinance 
  } = useQuery({
    queryKey: QUERY_KEYS.UNIT_COST(tenantId, farmId),
    queryFn: () => apiClient.get('/finance/unit-cost').then(res => res.data),
    enabled: !!farmId,
  });

  const {
    data: dashboardSummary,
    isLoading: loadingDashboardSummary,
  } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_SUMMARY(tenantId, farmId),
    queryFn: () => apiClient.get('/v1/dashboard/summary').then((res) => res.data),
    enabled: !!farmId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // ─── RENDER HELPERS ───

  if (errorSummary) {
    return (
      <AlertBanner 
        type="danger" 
        title="Connection Error" 
        message="Unable to load farm data. Please check your internet connection." 
      />
    );
  }

  // ─── MAIN UI ───

  return (
    <div className="animate-entrance space-y-10 max-w-7xl mx-auto">
      
      {/* HEADER STRIP */}
      <div className="flex justify-between items-end border-b border-ink/10 pb-4">
        <div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">
            Daily Summary
          </h2>
          <p className="font-sans text-sm text-ink-muted mt-1">
            Live Farm Data
          </p>
        </div>
        <div className="font-sans text-xs bg-success/10 text-success-dark px-3 py-1 font-bold rounded-full border border-success/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          Live Data
        </div>
      </div>

      {/* Financial aggregate strip (tenant/farm scoped through apiClient headers) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loadingDashboardSummary ? Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card-machined bg-surface p-5 space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        )) : (
          <>
            <div className="card-machined bg-surface p-5 border border-ink/5">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Milk Sales</p>
              <h3 className="text-2xl font-black text-brand mt-2">
                KES {dashboardSummary?.today_revenue_kes?.toLocaleString() || 0}
              </h3>
            </div>
            <div className="card-machined bg-surface p-5 border border-ink/5">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Feed Cost</p>
              <h3 className="text-2xl font-black text-ink mt-2">
                KES {dashboardSummary?.today_feed_cost_kes?.toLocaleString() || 0}
              </h3>
            </div>
            <div className="card-machined bg-brand/5 p-5 border-2 border-brand/20 shadow-sm">
              <p className="text-xs font-bold text-brand uppercase tracking-wider">Daily  Profit</p>
              <h3 className="text-2xl font-black text-brand mt-2">
                KES {dashboardSummary?.net_margin_kes?.toLocaleString() || 0}
              </h3>
            </div>
          </>
        )}
      </section>

      {/* KPI GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        <div style={{ animationDelay: '0.1s' }} className="animate-stagger">
          <SummaryCard 
            title="Total Milk (Today)" 
            value={summary?.total_liters_today} 
            unit="Liters" 
            icon={Droplets} 
            trend={summary?.variance_from_yesterday ? `${summary.variance_from_yesterday} vs Yesterday` : null} 
            loading={loadingSummary}
          />
        </div>
        <div style={{ animationDelay: '0.2s' }} className="animate-stagger">
          <SummaryCard 
            title="Cows Milked" 
            value={summary?.cows_milked} 
            unit="Cows" 
            icon={Activity} 
            loading={loadingSummary}
          />
        </div>
        <div style={{ animationDelay: '0.3s' }} className="animate-stagger">
          <SummaryCard 
            title="Avg. per Cow" 
            value={summary?.average_yield_per_cow} 
            unit="L/cow" 
            icon={TrendingUp} 
            loading={loadingSummary}
          />
        </div>
        <div style={{ animationDelay: '0.4s' }} className="animate-stagger">
          <SummaryCard 
            title="Profit per Liter" 
            value={<Money amount={finance?.margin} currency={finance?.currency} />} 
            unit="" 
            icon={DollarSign} 
            loading={loadingFinance}
          />
        </div>
      </section>

      {/* Modernized Chart Container */}
      <div style={{ animationDelay: '0.5s' }} className="animate-stagger card-machined bg-surface p-4 sm:p-8 border border-ink/10">
        <div className="flex items-center justify-between mb-8 border-b border-ink/5 pb-4">
          <h3 className="font-sans font-bold text-xl text-brand flex items-center gap-2">
            <ChartIcon size={20} className="text-accent" /> Milk Production Trend 
            <span className="text-ink-muted ml-2 text-sm font-semibold bg-surface-warm px-2 py-1 rounded">Last 7 Days</span>
          </h3>
        </div>
        <div className="h-80 w-full min-w-0 min-h-[320px] bg-surface-warm/30 rounded-xl p-4 border border-ink/5">
          {loadingTrend ? (
            <div className="h-full w-full space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-14" />
              </div>
              <div className="grid h-[calc(100%-2.5rem)] gap-3 rounded-lg border border-dashed border-ink/15 bg-surface/50 p-4">
                <Skeleton className="h-full w-full" />
              </div>
            </div>
            ) : (
            <Suspense fallback={(
              <div className="h-full w-full space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <div className="grid h-[calc(100%-2.5rem)] gap-3 rounded-lg border border-dashed border-ink/15 bg-surface/50 p-4">
                  <Skeleton className="h-full w-full" />
                </div>
              </div>
            )}>
              <MilkTrendChart data={trend} />
            </Suspense>
          )}
        </div>
      </div>

    </div>
  );
}