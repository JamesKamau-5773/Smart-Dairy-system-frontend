import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Search, ArrowRight, FileText, MessageSquareText, ChevronDown, ChevronUp } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import apiClient from '../../lib/apiClient';
import { Skeleton } from '../../components/ui';

export default function BuyersList() {
  const { tenantId, farmId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ['finance-buyers', tenantId, farmId],
    queryFn: () => apiClient.get('/finance/buyers').then((res) => res.data),
    enabled: !!farmId,
  });

  const filteredBuyers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return buyers;
    return buyers.filter((buyer) => [buyer.name, buyer.id, buyer.type, buyer.contact].some((value) => String(value).toLowerCase().includes(term)));
  }, [buyers, searchTerm]);

  const toggleStatement = (buyerId) => {
    setExpandedCustomerId((currentId) => (currentId === buyerId ? null : buyerId));
  };

  const totalOutstanding = buyers.reduce((sum, buyer) => sum + Number(buyer.balance || 0), 0);
  const settledBuyers = buyers.filter((buyer) => Number(buyer.balance || 0) === 0).length;

  return (
    <div className="animate-reveal space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand border border-brand/10 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <Users size={12} /> Finance & Supply
          </div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">
            Customer <span className="text-ink-muted">Billing</span>
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-2">Track buyer balances, open profiles, and share bills over WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="billing-card--soft px-4 py-3">
            <div className="billing-card__eyebrow">Outstanding</div>
            <div className="text-xl font-black text-danger tabular-nums">KSh {totalOutstanding.toLocaleString()}</div>
          </div>
          <div className="billing-card--soft px-4 py-3">
            <div className="billing-card__eyebrow">Settled</div>
            <div className="text-xl font-black text-brand tabular-nums">{settledBuyers}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="billing-card--soft text-ink-strong">
          <div className="billing-card__eyebrow">All buyers</div>
          <div className="text-3xl font-black mt-3 text-ink-strong">{buyers.length}</div>
          <p className="billing-card__muted mt-2">Open a buyer profile to inspect ledger, payments, and delivery proof.</p>
        </div>
        <div className="billing-card--soft">
          <div className="billing-card__eyebrow">Workflow</div>
          <div className="flex items-center gap-2 mt-3 text-brand font-bold"><MessageSquareText size={16} /> WhatsApp bills</div>
          <p className="billing-card__muted mt-2">Bills are prepared as a clean message that can be sent straight from the phone.</p>
        </div>
        <div className="billing-card--soft">
          <div className="billing-card__eyebrow">Ledger</div>
          <div className="flex items-center gap-2 mt-3 text-brand font-bold"><FileText size={16} /> Consumption by shift</div>
          <p className="billing-card__muted mt-2">Each buyer profile shows AM/PM delivery rows with payment history.</p>
        </div>
      </div>

      <div className="card-machined overflow-hidden bg-surface">
        <div className="p-6 border-b border-ink/10 bg-surface-warm/50 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input
              type="text"
              placeholder="Search customers by name or ID..."
              className="input-machined pl-10 !py-2 text-sm"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="hidden md:block text-xs text-ink-muted">Tap a customer row to expand their statement</div>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          {isLoading && Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card-machined bg-surface/80 p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          ))}

          {!isLoading && filteredBuyers.map((buyer) => {
            const isExpanded = expandedCustomerId === buyer.id;
            const balance = Number(buyer.balance || 0);

            return (
              <div key={buyer.id} className="card-machined overflow-hidden bg-surface/80">
                <button
                  type="button"
                  onClick={() => toggleStatement(buyer.id)}
                  className="w-full p-5 text-left transition-colors hover:bg-surface-raised/50"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-brand text-sm">{buyer.name}</div>
                      <div className="font-mono text-[10px] text-ink-muted mt-1">{buyer.id} • {buyer.contact}</div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      {balance > 0 ? (
                        <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger">Owes KSh {balance.toLocaleString()}</span>
                      ) : (
                        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">Settled</span>
                      )}
                      {isExpanded ? <ChevronUp size={18} className="text-ink-muted" /> : <ChevronDown size={18} className="text-ink-muted" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-ink/10 bg-surface-warm/35 p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="billing-card--soft p-4">
                        <div className="billing-card__eyebrow">Rate / L</div>
                        <div className="mt-2 text-lg font-black text-ink-strong">KSh {Number(buyer.rate_per_liter || 0).toLocaleString()}</div>
                      </div>
                      <div className="billing-card--soft p-4">
                        <div className="billing-card__eyebrow">Type</div>
                        <div className="mt-2 text-lg font-black text-ink-strong">{buyer.type}</div>
                      </div>
                      <div className="billing-card--soft p-4">
                        <div className="billing-card__eyebrow">Balance</div>
                        <div className={`mt-2 text-lg font-black ${balance > 0 ? 'text-danger' : 'text-brand'}`}>
                          KSh {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="billing-card--soft p-4">
                        <div className="billing-card__eyebrow">Next Step</div>
                        <Link to={`/finance/buyers/${buyer.id}`} className="mt-2 inline-flex items-center gap-2 font-bold text-brand hover:underline">
                          Open statement <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!isLoading && filteredBuyers.length === 0 && (
            <div className="card-machined bg-surface/80 p-8 text-center text-ink-muted">
              No customers found for “{searchTerm}”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
