import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Users, Search, ArrowRight, ChevronDown, ChevronUp, 
  Plus, TrendingDown, CheckCircle2, AlertCircle, UserPlus 
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import apiClient from '../../lib/apiClient';
import { Skeleton } from '../../components/ui';
import SlidePanel from '../../components/ui/SlidePanel';
import AddBuyerForm from './AddBuyerForm';

/**
 * SRP: Renders a single Financial KPI Widget.
 */
const KPIWidget = ({ title, value, subtitle, icon: Icon, valueColor = "text-ink" }) => (
  <div className="bg-surface rounded-2xl p-6 border border-ink/10 shadow-sm relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-ink-muted">
        {title}
      </h3>
      <div className="p-2 bg-brand/5 rounded-lg text-brand group-hover:bg-brand/10 transition-colors">
        <Icon size={18} strokeWidth={2.5} />
      </div>
    </div>
    <div className={`text-3xl font-black tabular-nums mb-1 ${valueColor}`}>
      {value}
    </div>
    <p className="text-xs font-medium text-ink-muted">{subtitle}</p>
  </div>
);

/**
 * SRP: Handles ONLY the display and interaction of a single buyer row.
 */
const BuyerRow = ({ buyer, isExpanded, onToggle }) => {
  if (!buyer) return null;

  const id = buyer?.id || 'Unknown ID';
  const name = buyer?.name || 'Unnamed Buyer';
  const type = buyer?.type || 'Standard';
  const contact = buyer?.contact || 'No contact';
  const balance = Number(buyer?.balance || 0);
  const rate = Number(buyer?.rate_per_liter || 0);

  return (
    <div className="bg-surface rounded-xl border border-ink/5 shadow-sm overflow-hidden transition-all duration-200 hover:border-ink/15">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full p-5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/50"
        aria-expanded={isExpanded}
      >
        <div>
          <div className="font-bold text-ink text-sm flex items-center gap-2">
            {name}
            <span className="px-2 py-0.5 bg-surface-raised border border-ink/10 text-[10px] uppercase tracking-wider rounded-md text-ink-muted">
              {type}
            </span>
          </div>
          <div className="font-mono text-[11px] text-ink-muted mt-1.5 font-medium">
            ID: {id} &nbsp;•&nbsp; {contact}
          </div>
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          {balance > 0 ? (
            <span className="rounded-full bg-danger/10 border border-danger/20 px-3 py-1 text-xs font-bold text-danger flex items-center gap-1.5">
              <AlertCircle size={12} />
              Owes KSh {balance.toLocaleString()}
            </span>
          ) : (
            <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-bold text-brand flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              Settled
            </span>
          )}
          <div className="text-ink-muted p-1">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {/* Expandable Ledger Details */}
      {isExpanded && (
        <div className="border-t border-ink/5 bg-surface-raised/30 p-5 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted mb-1">Agreed Rate</p>
              <p className="text-sm font-bold text-ink">KSh {rate.toLocaleString()} / Liter</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted mb-1">Current Balance</p>
              <p className={`text-sm font-bold ${balance > 0 ? 'text-danger' : 'text-brand'}`}>
                KSh {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="col-span-2 md:col-span-2 flex justify-end items-end">
              <Link 
                to={`/finance/buyers/${id}`} 
                className="inline-flex items-center gap-2 font-bold text-brand hover:text-brand-dark bg-brand/5 hover:bg-brand/10 px-4 py-2 rounded-lg transition-colors text-sm group"
              >
                Open Full Statement <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main Page Component
 */
export default function BuyersList() {
  const { tenantId, farmId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);

  // Data Fetching
  const { data: buyers, isLoading } = useQuery({
    queryKey: ['finance-buyers', tenantId, farmId],
    queryFn: () => apiClient.get('/finance/buyers').then((res) => res.data),
    enabled: !!farmId,
  });

  // Defensive: Ensure buyers is always an array
  const safeBuyers = Array.isArray(buyers) ? buyers : [];

  // Derived State (Filtering)
  const filteredBuyers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return safeBuyers;
    return safeBuyers.filter((buyer) => 
      [buyer?.name, buyer?.id, buyer?.type, buyer?.contact]
        .some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [safeBuyers, searchTerm]);

  // Derived State (KPIs)
  const totalOutstanding = safeBuyers.reduce((sum, buyer) => sum + Number(buyer?.balance || 0), 0);
  const settledBuyersCount = safeBuyers.filter((buyer) => Number(buyer?.balance || 0) <= 0).length;

  const toggleStatement = (buyerId) => {
    setExpandedCustomerId((currentId) => (currentId === buyerId ? null : buyerId));
  };

  return (
    <div className="min-h-[80vh] animate-reveal pb-12">
      
      {/* Header Section with Primary Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand border border-brand/10 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <Users size={12} /> Finance & Supply
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-ink m-0">
            Customer Billing
          </h1>
          <p className="text-sm font-medium text-ink-muted mt-2 max-w-xl">
            Track buyer balances, manage profiles, and share milk statements via WhatsApp.
          </p>
        </div>
        
        {/* Primary Action */}
        <button 
          onClick={() => setIsAddPanelOpen(true)}
          className="btn-command bg-brand text-white hover:bg-brand/90 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all w-full md:w-auto justify-center"
        >
          <Plus size={18} />
          Add New Buyer
        </button>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <KPIWidget 
          title="Total Buyers" 
          value={safeBuyers.length} 
          subtitle="Active customers in your registry."
          icon={Users} 
        />
        <KPIWidget 
          title="Total Outstanding" 
          value={`KSh ${totalOutstanding.toLocaleString()}`} 
          subtitle="Unpaid balances across all buyers."
          icon={TrendingDown}
          valueColor="text-danger" 
        />
        <KPIWidget 
          title="Settled Accounts" 
          value={settledBuyersCount} 
          subtitle="Buyers with zero balance."
          icon={CheckCircle2}
          valueColor="text-brand" 
        />
      </div>

      {/* List & Search Section */}
      <div className="space-y-4">
        {/* Persistent Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted/50" size={18} />
          <input
            type="text"
            placeholder="Search by name, ID, or phone number..."
            className="w-full bg-surface border border-ink/10 text-ink text-sm font-medium rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all placeholder:text-ink-muted/50 shadow-sm"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-xl border border-ink/5 p-5 shadow-sm">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        )}

        {/* Data List */}
        {!isLoading && filteredBuyers.length > 0 && (
          <div className="space-y-3">
            {filteredBuyers.map((buyer) => (
              <BuyerRow
                key={buyer?.id}
                buyer={buyer}
                isExpanded={expandedCustomerId === buyer?.id}
                onToggle={toggleStatement}
              />
            ))}
          </div>
        )}

        {/* Empty Search State */}
        {!isLoading && safeBuyers.length > 0 && filteredBuyers.length === 0 && (
          <div className="bg-surface border border-dashed border-ink/15 rounded-xl p-12 text-center">
            <Search className="w-8 h-8 text-ink-muted/30 mx-auto mb-3" />
            <p className="text-ink font-bold text-sm">No customers found</p>
            <p className="text-ink-muted text-sm mt-1">We couldn't find anyone matching "{searchTerm}".</p>
          </div>
        )}

        {/* Absolute Empty State (Zero buyers in database) */}
        {!isLoading && safeBuyers.length === 0 && (
          <div className="bg-surface border border-dashed border-ink/15 rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="bg-brand/5 p-4 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-brand/60" />
            </div>
            <h3 className="text-ink font-bold text-lg mb-1">No buyers yet</h3>
            <p className="text-ink-muted text-sm max-w-sm mb-6">
              You haven't added any milk buyers to your registry. Add your first customer to start tracking deliveries and balances.
            </p>
            <button 
              onClick={() => setIsAddPanelOpen(true)}
              className="btn-command bg-brand text-white hover:bg-brand/90 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
            >
              <Plus size={18} /> Add Your First Buyer
            </button>
          </div>
        )}
      </div>

      {/* The Slide-Out Panel */}
      <SlidePanel 
        isOpen={isAddPanelOpen} 
        onClose={() => setIsAddPanelOpen(false)}
        title="Register New Buyer"
        subtitle="Add a new customer to your milk billing registry."
      >
        <AddBuyerForm 
          onSuccess={() => setIsAddPanelOpen(false)} 
          onCancel={() => setIsAddPanelOpen(false)} 
        />
      </SlidePanel>
    </div>
  );
}