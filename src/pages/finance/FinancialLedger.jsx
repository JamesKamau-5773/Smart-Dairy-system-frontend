import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import apiClient from '../../lib/apiClient';
import { Wallet, ArrowUpRight, ArrowDownLeft, Receipt, ShieldCheck, PieChart } from 'lucide-react';
import Money from '../../components/ui/Money';
import { Skeleton } from '../../components/ui';

export default function FinancialLedger() {
  const { tenantId, farmId } = useTenant();

  const { data: finance, isLoading } = useQuery({
    queryKey: QUERY_KEYS.UNIT_COST(tenantId, farmId),
    queryFn: () => apiClient.get('/finance/unit-cost').then(res => res.data),
    enabled: !!farmId,
  });

  return (
    <div className="animate-reveal space-y-8">
      <div className="flex justify-between items-end border-b border-ink/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-brand/10 text-brand text-[10px] font-semibold tracking-normal mb-4 rounded-md border border-brand/20">
            <Wallet size={12} /> Financial Registry
          </div>
          <h2 className="font-display font-semibold text-4xl tracking-tight text-brand m-0">
            Capital <span className="text-ink/30">Ledger</span>
          </h2>
        </div>
        <div className="flex gap-4">
          <button className="btn-command bg-surface text-brand">
            <ArrowDownLeft size={18} className="mr-2 text-danger" /> Expense
          </button>
          <button className="btn-command bg-accent text-brand">
            <ArrowUpRight size={18} className="mr-2" /> Income
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="card-machined bg-surface/80 p-6 text-ink-strong">
          <div className="flex justify-between items-start">
            <span className="billing-card__eyebrow">Net position</span>
            <PieChart size={18} className="text-accent" />
          </div>
          <div className="mt-4">
            <div className="text-4xl font-black tracking-tight">
              {isLoading ? <Skeleton className="h-8 w-48" /> : <Money amount={124500} currency="KSh" />}
            </div>
            <p className="billing-card__muted mt-2">// Current cycle profit</p>
          </div>
        </div>

        <div className="billing-card--soft">
          <span className="billing-card__eyebrow">Co-op payout split</span>
          <div className="mt-4 flex items-end justify-between">
            <div className="text-3xl font-black text-brand tracking-tight">75/25%</div>
            <div className="h-2 w-24 bg-surface-raised border border-ink overflow-hidden">
               <div className="h-full bg-brand w-[75%]"></div>
            </div>
          </div>
          <p className="billing-card__muted mt-2">// Automatic retention policy</p>
        </div>

        <div className="billing-card--soft">
          <span className="billing-card__eyebrow">Tax compliance</span>
          <div className="mt-4 flex items-center gap-3">
             <div className="p-2 bg-accent/20 border border-accent text-brand">
               <ShieldCheck size={20} />
             </div>
             <div className="font-display font-semibold text-brand">eTIMS sync active</div>
          </div>
          <p className="billing-card__muted mt-2">// KRA node: Bahati_01</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg tracking-tight text-brand flex items-center gap-2">
          <Receipt size={20} /> Transaction Matrix
        </h3>

        <div className="card-machined overflow-hidden !p-0 text-ink-strong bg-surface/80">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand/10 text-ink-muted">
              <tr>
                <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Reference</th>
                <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Category</th>
                <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Counterparty</th>
                <th className="p-5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-right text-ink-muted">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-stagger">
                    <td className="p-5"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-5"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-5"><Skeleton className="h-4 w-56" /></td>
                    <td className="p-5 text-right"><Skeleton className="h-4 w-20 mx-auto" /></td>
                  </tr>
                ))
              ) : (
                <>
                  <tr style={{ animationDelay: '0.1s' }} className="animate-stagger hover:bg-surface-raised transition-colors cursor-pointer group">
                    <td className="p-5 font-sans text-xs font-bold text-ink group-hover:text-brand transition-colors">TRX_2026_05_14_A</td>
                    <td className="p-5">
                      <span className="inline-block px-2 py-1 bg-brand/5 border border-brand/20 text-brand font-sans text-[10px] font-semibold rounded">
                        Milk Sale
                      </span>
                    </td>
                    <td className="p-5 font-sans font-semibold text-ink text-sm">Rift Valley Cooperative</td>
                    <td className="p-5 text-right font-sans text-lg font-black text-brand tabular-nums">
                      +45,250.00
                    </td>
                  </tr>
                  <tr style={{ animationDelay: '0.2s' }} className="animate-stagger hover:bg-surface-raised transition-colors cursor-pointer group">
                    <td className="p-5 font-sans text-xs font-bold text-ink group-hover:text-brand transition-colors">TRX_2026_05_13_B</td>
                    <td className="p-5">
                      <span className="inline-block px-2 py-1 bg-danger/5 border border-danger/20 text-danger font-sans text-[10px] font-semibold rounded">
                        Vet Service
                      </span>
                    </td>
                    <td className="p-5 font-sans font-semibold text-ink text-sm">AgroVet Supply Nakuru</td>
                    <td className="p-5 text-right font-sans text-lg font-black text-danger tabular-nums">
                      -3,500.00
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
