import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Building2, Link as LinkIcon, FileText, CheckCircle2, AlertCircle, Plus, Filter, ArrowRight, BadgeDollarSign, CreditCard, X } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import { financeApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

export default function BuyerRegistry() {
  const { tenantId, farmId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [banner, setBanner] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  const { data: buyersData = [] } = useQuery({
    queryKey: ['finance', 'buyers', tenantId, farmId],
    queryFn: async () => financeApi.listBuyers(),
    enabled: !!tenantId && !!farmId,
  });

  const buyers = Array.isArray(buyersData)
    ? buyersData.map((buyer) => ({
        id: buyer.id ?? buyer.buyerId ?? buyer.buyer_id ?? '',
        name: buyer.name ?? buyer.businessName ?? buyer.business_name ?? 'Unnamed Buyer',
        type: buyer.type ?? buyer.customerType ?? buyer.customer_type ?? 'Buyer',
        contact: buyer.contact ?? buyer.phone ?? buyer.phoneNumber ?? '',
        outstanding: Number(buyer.outstanding ?? buyer.balance ?? buyer.amountDue ?? 0),
        lastDelivery: buyer.lastDelivery ?? buyer.last_delivery ?? buyer.updatedAt ?? 'Not recorded',
        status: buyer.status ?? 'Active',
        contract: buyer.contract ?? buyer.paymentPlan ?? buyer.payment_plan ?? 'Not set',
      }))
    : [];

  const filteredBuyers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return buyers.filter((buyer) => {
      const matchesSearch = !normalizedSearch || [buyer.name, buyer.id, buyer.contact, buyer.type, buyer.contract]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesStatus = statusFilter === 'All' || buyer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [buyers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const totalOutstanding = buyers.reduce((sum, buyer) => sum + buyer.outstanding, 0);
    const activeContracts = buyers.filter((buyer) => buyer.status === 'Active').length;
    const cashOnly = buyers.filter((buyer) => buyer.status === 'Cash Only').length;
    return { totalOutstanding, activeContracts, cashOnly };
  }, [buyers]);

  const statusTone = {
    Active: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
    'Cash Only': 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
  };

  const openBuyerDetails = (buyer) => {
    setSelectedBuyer(buyer);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
  };

  return (
    <div className="animate-reveal space-y-6">
      {banner && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner type={banner.type} title={banner.title} message={banner.message} autoDismiss={4000} onDismiss={() => setBanner(null)} />
        </div>
      )}

      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(244,249,255,0.95),rgba(255,255,255,0.98))] p-5 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
              <Users size={12} /> Customer Management
            </div>
            <h2 className="mt-3 font-sans text-3xl font-black tracking-tight text-brand">
              Customer <span className="text-ink-muted">Directory</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Manage commercial contracts, balances, and partner contact details in one clear operations view.</p>
          </div>
          <button className="btn-command flex items-center gap-2 text-sm self-start lg:self-auto">
            <Plus size={16} /> Add New Customer
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-ink/10 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Total money owed</p>
                <p className="mt-2 text-3xl font-black text-ink">KSh {stats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-3 text-brand shadow-sm">
                <BadgeDollarSign size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Active contracts</p>
                <p className="mt-2 text-3xl font-black text-ink">{stats.activeContracts}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-3 text-brand shadow-sm">
                <CreditCard size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Cash-only accounts</p>
                <p className="mt-2 text-3xl font-black text-ink">{stats.cashOnly}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-3 text-brand shadow-sm">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* HEADER SECTION */}
      {/* CRM MAIN INTERFACE */}
      <div className="card-machined overflow-hidden bg-surface/80">
        
        {/* Search & Filter Toolbar */}
        <div className="p-6 border-b border-ink/10 bg-white/35 flex flex-col lg:flex-row gap-4 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input 
              type="text" 
              placeholder="Search partners by name..." 
              className="input-machined pl-10 !py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-3 min-w-[220px]">
            <Filter size={16} className="text-ink-muted" />
            <select className="input-machined !py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Cash Only">Cash Only</option>
            </select>
          </label>
          <button type="button" onClick={resetFilters} className="btn-secondary h-[44px]">
            Reset filters
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand/10 text-ink-muted">
              <tr>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-ink-muted">Customer Name</th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-ink-muted">Payment Plan</th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-right text-ink-muted">Amount Owed (KSh)</th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-center text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {filteredBuyers.length === 0 && (
                <tr>
                  <td className="p-8 text-center text-sm text-ink-muted" colSpan={4}>
                    No buyers found. Connect the backend buyers endpoint to show customer records here.
                  </td>
                </tr>
              )}
              {filteredBuyers.map((buyer) => (
                <tr key={buyer.id} className="hover:bg-surface-warm/30 transition-colors group">
                  
                  {/* Identity Column */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand/5 text-brand rounded-lg border border-brand/10">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-brand text-sm">{buyer.name}</div>
                        <div className="font-mono text-[10px] text-ink-muted">{buyer.id} • {buyer.contact}</div>
                      </div>
                    </div>
                  </td>

                  {/* Contract Column */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex w-2 h-2 rounded-full ${buyer.status === 'Active' ? 'bg-accent' : 'bg-ink-muted'}`}></span>
                      <span className="font-medium text-sm text-ink">{buyer.contract}</span>
                    </div>
                    <div className="text-xs text-ink-muted mt-1">Last Delivery: {buyer.lastDelivery}</div>
                    <div className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone[buyer.status] || 'bg-surface text-ink'}`}>
                      {buyer.status}
                    </div>
                  </td>

                  {/* Financial Column */}
                  <td className="p-4 text-right">
                    <div className={`font-semibold tabular-nums ${buyer.outstanding > 0 ? 'text-danger' : 'text-ink'}`}>
                      {buyer.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Action Column - The "Share Link" Trigger */}
                  <td className="p-4">
                    <div className="flex justify-center gap-2 opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        className="btn-ghost h-9 w-9 !min-h-0 !p-0 text-brand"
                        title="Generate Encrypted Link"
                        onClick={() => setBanner({ type: 'info', title: 'Link Generated', message: `Generated secure link for ${buyer.name}: https://jivu.farm/shared/statement/tk_8x9a2b` })}
                      >
                        <LinkIcon size={16} />
                      </button>
                      <button 
                        className="btn-ghost h-9 w-9 !min-h-0 !p-0 text-ink-muted"
                        title="View Full Ledger"
                        onClick={() => openBuyerDetails(buyer)}
                      >
                        <FileText size={16} />
                      </button>
                    </div>
                  </td>
                  
                </tr>
              ))}
              
              {filteredBuyers.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-ink-muted flex flex-col items-center">
                    <AlertCircle size={24} className="mb-2 opacity-50" />
                    No partners found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selectedBuyer} onClose={() => setSelectedBuyer(null)} title="Customer Profile">
        {selectedBuyer && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-ink/10 bg-surface-warm/40 p-4 sm:p-5">
              <div className="flex items-center gap-3 text-brand mb-3">
                <Building2 size={18} />
                <p className="text-xs font-bold uppercase tracking-wider">Account Overview</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Customer</p>
                  <p className="text-sm font-semibold text-brand">{selectedBuyer.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Type</p>
                  <p className="text-sm text-ink-strong">{selectedBuyer.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Contact</p>
                  <p className="text-sm text-ink-strong">{selectedBuyer.contact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Status</p>
                  <p className="text-sm text-ink-strong">{selectedBuyer.status}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Outstanding balance</p>
                <p className="text-sm leading-6 text-ink-strong">KSh {selectedBuyer.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Contract</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedBuyer.contract}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Last delivery</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedBuyer.lastDelivery}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-ink/10 pt-4">
              <button onClick={() => setSelectedBuyer(null)} className="btn-secondary inline-flex items-center gap-2">
                <X size={16} /> Close
              </button>
              <button className="btn-command inline-flex items-center gap-2">
                View ledger <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}