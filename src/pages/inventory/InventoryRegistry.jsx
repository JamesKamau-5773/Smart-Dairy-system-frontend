import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import apiClient from '../../lib/apiClient';
import { Package, AlertOctagon, RefreshCw, BarChart3, Database } from 'lucide-react';
import { Skeleton } from '../../components/ui';

export default function InventoryRegistry() {
  const { tenantId, farmId } = useTenant();

  // Fetching stock levels and reorder points
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', tenantId, farmId],
    queryFn: () => apiClient.get('/inventory/status').then(res => res.data),
    enabled: !!farmId,
  });

  return (
    <div className="animate-reveal space-y-8">
      
      {/* SECTION HEADER */}
      <div className="flex justify-between items-end border-b border-ink/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-brand/10 text-brand text-[10px] font-semibold tracking-normal mb-4 rounded-md border border-brand/20">
            <Database size={12} /> Resource Management
          </div>
          <h2 className="font-display font-semibold text-4xl tracking-tight text-brand m-0">
            Stock <span className="text-ink/30">Registry</span>
          </h2>
        </div>
        <div className="flex gap-4">
          <button className="btn-command bg-brand text-accent">
            <RefreshCw size={18} className="mr-2" /> Restock Order
          </button>
        </div>
      </div>

      {/* INVENTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        
        {/* RESOURCE 1: FEED & SUPPLEMENTS */}
        <div className="card-machined bg-surface/80 p-8">
          <div className="flex justify-between items-start mb-6">
            <h3 className="font-display font-semibold text-xl tracking-tight text-brand flex items-center gap-3">
              <BarChart3 size={24} className="text-accent" /> Feed & Nutrition
            </h3>
              <span className="font-sans text-[11px] font-medium text-ink-muted">Type: Bulk</span>
          </div>

          <div className="space-y-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between font-sans text-xs font-medium tracking-normal text-ink-normal">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="h-4 w-full bg-surface-raised border-2 border-ink overflow-hidden shadow-[4px_4px_0px_0px_rgba(58,61,32,0.1)]">
                    <Skeleton className="h-full w-full" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* Stock Level 1 */}
                <div className="space-y-2">
                    <div className="flex justify-between font-sans text-xs font-medium tracking-normal text-ink-normal">
                    <span>Dairy Meal (Premium)</span>
                    <span className="text-brand">850 / 1000 KG</span>
                  </div>
                  <div className="h-4 w-full bg-surface-raised border-2 border-ink overflow-hidden shadow-[4px_4px_0px_0px_rgba(58,61,32,0.1)]">
                    <div className="h-full bg-brand w-[85%] transition-all duration-1000 ease-out"></div>
                  </div>
                </div>

                {/* Stock Level 2 - Triggering Alert */}
                <div className="space-y-2">
                    <div className="flex justify-between font-sans text-xs font-medium tracking-normal text-ink-normal">
                    <span>Silage Reserve</span>
                    <span className="text-danger">120 / 2000 KG</span>
                  </div>
                  <div className="h-4 w-full bg-surface-raised border-2 border-ink overflow-hidden shadow-[4px_4px_0px_0px_rgba(58,61,32,0.1)]">
                    <div className="h-full bg-danger w-[6%] animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2 text-danger font-sans text-[10px] font-black">
                    <AlertOctagon size={12} /> CRITICAL: BELOW REORDER POINT
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RESOURCE 2: MEDICAL & SANITATION */}
        <div className="card-machined bg-surface/80 p-8">
          <div className="flex justify-between items-start mb-6">
            <h3 className="font-display font-semibold text-xl tracking-tight text-brand flex items-center gap-3">
              <Package size={24} className="text-accent" /> Medical Vault
            </h3>
              <span className="font-sans text-[11px] font-medium text-ink-muted">Type: Controlled</span>
          </div>

          <div className="divide-y-2 divide-ink/5">
            <div className="py-4 flex justify-between items-center">
              <div>
                <div className="font-display font-semibold text-brand">Penicillin V</div>
                  <div className="font-sans text-[11px] text-ink-muted">500ml Multi-dose</div>
              </div>
              <div className="font-sans font-black text-lg text-brand">12 <span className="text-xs opacity-40">units</span></div>
            </div>
            <div className="py-4 flex justify-between items-center">
              <div>
                <div className="font-display font-semibold text-brand">Teat Dip (Iodine)</div>
                  <div className="font-sans text-[11px] text-ink-muted">20L Drum</div>
              </div>
              <div className="font-sans font-black text-lg text-brand">04 <span className="text-xs opacity-40">units</span></div>
            </div>
            <div className="py-4 flex justify-between items-center bg-accent/5 px-2 -mx-2">
              <div>
                <div className="font-display font-semibold text-brand">Dewormer (Albendazole)</div>
                  <div className="font-sans text-[11px] text-ink-muted">1L Oral</div>
              </div>
              <div className="font-sans font-black text-lg text-danger">01 <span className="text-xs opacity-40">unit</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}