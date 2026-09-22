import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Users, Search, Plus, TrendingDown, CheckCircle2, FileSpreadsheet,
  FileText, MessageCircle, MoreVertical, SlidersHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTenant } from '../../hooks/useTenant';
import { financeApi } from '../../lib/backendApi';
import { Skeleton } from '../../components/ui';
import SlidePanel from '../../components/ui/SlidePanel';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import CustomerForm from '../../components/finance/CustomerForm';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

/**
 * SRP: Renders a single Financial KPI Widget.
 */
const KPIWidget = ({ title, value, subtitle, icon: Icon, valueColor = "text-brand-700" }) => (
  <div className="group relative overflow-hidden rounded-card border border-slate-200 border-t-[4px] border-t-brand-400 bg-white/90 p-6 backdrop-blur">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">
        {title}
      </h3>
      <div className="rounded-button border border-brand-400/30 bg-brand-400/10 p-2 text-brand-400 transition-colors group-hover:bg-brand-400/20">
        <Icon size={18} strokeWidth={2.5} />
      </div>
    </div>
    <div className={`text-3xl font-bold tabular-nums mb-1 font-mono ${valueColor}`}>
      {value}
    </div>
    <p className="text-xs font-medium text-slate-600">{subtitle}</p>
  </div>
);

/**
 * Main Page Component
 */
export default function BuyersList() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);

  // Data Fetching
  // UNIFIED: We now fetch from the 'customers' endpoint to have a single source of truth.
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', tenantId, farmId],
    queryFn: () => financeApi.listCustomers().then(res => res?.items || res?.data || res || []),
    enabled: !!farmId,
  });

  // --- Mutations for CUD (Create, Update, Delete) ---
  // We only need 'create' on this page. The full management is on Customers.jsx
  const { mutate: createCustomer, isLoading: isSaving } = useMutation({
    mutationFn: (customerData) => financeApi.createCustomer(customerData),
    onSuccess: () => {
      toast.success(`Customer created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['customers', tenantId, farmId] });
      setIsAddPanelOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || `Failed to create customer.`);
    },
  });

  // Defensive: Ensure customers is always an array
  const safeCustomers = useMemo(() => Array.isArray(customers) ? customers : [], [customers]);

  // Derived State (Filtering)
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return safeCustomers.filter((customer) => {
      const balance = Number(customer?.account_balance || customer?.balance || 0);
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'outstanding' && balance > 0)
        || (statusFilter === 'settled' && balance <= 0);
      const matchesSearch = !term || [
        customer?.name,
        customer?.id,
        customer?.type,
        customer?.contact,
        customer?.phone_number,
        customer?.contact_person,
      ].some((value) => String(value || '').toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [safeCustomers, searchTerm, statusFilter]);

  // Derived State (KPIs)
  // Credits/overpayments are shown on the individual account but must not reduce
  // the amount other buyers still owe.
  const totalOutstanding = safeCustomers.reduce((sum, customer) => {
    const balance = Number(customer?.account_balance || customer?.balance || 0);
    return sum + Math.max(balance, 0);
  }, 0);
  const settledBuyersCount = safeCustomers.filter((customer) => Number(customer?.account_balance || customer?.balance || 0) <= 0).length;

  const visibleCustomerIds = filteredCustomers.map((customer) => String(customer?.id));
  const allVisibleSelected = visibleCustomerIds.length > 0
    && visibleCustomerIds.every((id) => selectedCustomerIds.includes(id));

  const toggleCustomer = (customerId) => {
    const id = String(customerId);
    setSelectedCustomerIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const toggleAllVisible = () => {
    setSelectedCustomerIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleCustomerIds.includes(id))
      : [...new Set([...current, ...visibleCustomerIds])]);
  };

  const shareSelectedStatements = () => {
    const selectedCustomers = safeCustomers.filter((customer) => selectedCustomerIds.includes(String(customer?.id)));
    const lines = selectedCustomers.map((customer) => {
      const balance = Number(customer?.account_balance || customer?.balance || 0);
      return `${customer?.name || 'Unnamed Buyer'} (ID ${customer?.id || '--'}): ${formatKes(balance)}`;
    });
    const message = ['Jivu Smart Dairy - Customer Statements', '', ...lines, '', 'Open Jivu Smart Dairy to review the full statement.'].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const shareCustomerStatement = (customer) => {
    const balance = Number(customer?.account_balance || customer?.balance || 0);
    const message = [
      'Jivu Smart Dairy - Customer Statement',
      `Buyer: ${customer?.name || 'Unnamed Buyer'}`,
      `Account ID: ${customer?.id || '--'}`,
      `Current balance: ${formatKes(balance)}`,
      '',
      'Open Jivu Smart Dairy to review the full statement.',
    ].join('\n');
    const phone = String(customer?.phone_number || customer?.contact || '').replace(/\D/g, '').replace(/^0/, '254');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleImport = () => {
    console.log('[BuyersList] Excel import not yet implemented.');
    toast('Excel import is coming soon.');
  };

  return (
    <div className="min-h-[80vh] animate-reveal pb-12">
      
      {/* Header Section with Primary Action */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-card border border-slate-200 border-l-[4px] border-l-brand-400 bg-white/90 p-5 backdrop-blur md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-button border border-brand-400/30 bg-brand-400/10 p-3 text-brand-400"><Users size={20} /></div>
          <div>
            <h1 className="m-0 font-display text-2xl font-bold text-ink-900">
              Customer Billing
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Track buyer balances, manage profiles, and share milk statements via WhatsApp.
            </p>
          </div>
        </div>
        
        {/* IMPROVEMENT: Only show the top-right button if data exists */}
        {safeCustomers.length > 0 && (
          <button 
            onClick={() => setIsAddPanelOpen(true)}
            className="flex items-center gap-2 rounded-button bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-900 w-full md:w-auto justify-center"
          >
            <Plus size={18} />
            Add New Buyer
          </button>
        )}
      </div>

      {/* IMPROVEMENT: Wrap KPIs in a conditional check */}
      {safeCustomers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 animate-in slide-in-from-bottom-4">
          <KPIWidget 
            title="Total Buyers" 
            value={safeCustomers.length} 
            subtitle="Active customers in your registry."
            icon={Users} 
          />
          <KPIWidget 
            title="Total Outstanding" 
            value={formatKes(totalOutstanding)}
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
      )}

      <div>
        {safeCustomers.length > 0 && (
          <div className="space-y-4">
            <section className="rounded-card border border-slate-200 bg-white/90 p-5 backdrop-blur md:p-6" aria-label="Buyer filters and bulk actions">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1 lg:max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type="search"
                    placeholder="Search name, ID, or phone number"
                    className="h-10 w-full rounded-input border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-ink-900 placeholder:text-slate-500 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <label className="relative flex min-w-[190px] items-center">
                  <SlidersHorizontal className="pointer-events-none absolute left-3 text-slate-500" size={16} />
                  <span className="sr-only">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 w-full appearance-none rounded-input border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    aria-label="Status"
                  >
                    <option value="all">All statuses</option>
                    <option value="outstanding">Outstanding</option>
                    <option value="settled">Settled</option>
                  </select>
                </label>
                {selectedCustomerIds.length > 0 && (
                  <button
                    type="button"
                    onClick={shareSelectedStatements}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-brand-700 px-4 font-mono text-sm font-semibold tabular-nums text-white hover:bg-brand-900 lg:ml-auto"
                  >
                    <MessageCircle size={17} />
                    Share Statements via WhatsApp ({selectedCustomerIds.length})
                  </button>
                )}
                <p className={`font-mono text-xs font-semibold tabular-nums text-slate-600 ${selectedCustomerIds.length === 0 ? 'lg:ml-auto' : ''}`}>
                  {filteredCustomers.length} of {safeCustomers.length} buyers
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-card border border-slate-200 bg-white/90 backdrop-blur" aria-label="Buyers data table">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-left">
                  <thead className="border-b border-slate-300">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="w-12 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          className="h-4 w-4 rounded border-slate-400 text-brand-700 focus:ring-brand-400"
                          aria-label="Select all visible buyers"
                        />
                      </th>
                      <th className="px-3 py-2.5">Buyer Name</th>
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">Phone Number</th>
                      <th className="px-3 py-2.5 text-right">Agreed Rate</th>
                      <th className="px-3 py-2.5 text-right">Current Balance</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCustomers.map((buyer) => {
                      const id = buyer?.id || 'Unknown ID';
                      const contact = buyer?.phone_number || buyer?.contact || 'No contact';
                      const balance = Number(buyer?.account_balance || buyer?.balance || 0);
                      const rate = Number(buyer?.agreed_rate_per_liter || buyer?.rate_per_liter || 0);
                      const isSelected = selectedCustomerIds.includes(String(id));

                      return (
                        <tr key={id} className={`transition-colors hover:bg-brand-50/80 ${isSelected ? 'bg-brand-50' : ''}`}>
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCustomer(id)}
                              className="h-4 w-4 rounded border-slate-400 text-brand-700 focus:ring-brand-400"
                              aria-label={`Select ${buyer?.name || 'buyer'}`}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-ink-900">{buyer?.name || 'Unnamed Buyer'}</div>
                            <div className="mt-0.5 text-xs text-ink-600">{buyer?.type || 'Standard'}</div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold tabular-nums text-ink-800">{id}</td>
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold tabular-nums text-ink-800">{contact}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-ink-900">
                            {formatKes(rate)}/L
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono text-xs font-bold tabular-nums ${balance > 0 ? 'text-danger-500' : 'text-brand-700'}`}>
                            {formatKes(balance)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center rounded-badge border px-2 py-1 text-[11px] font-bold ${balance > 0 ? 'border-danger-100 bg-danger-50 text-danger-900' : 'border-brand-200 bg-brand-50 text-brand-900'}`}>
                              {balance > 0 ? 'Outstanding' : 'Settled'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-900"
                                  aria-label={`Actions for ${buyer?.name || 'buyer'}`}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-52 rounded-card border border-slate-200 bg-white/95 p-1.5  backdrop-blur">
                                <Link
                                  to={`/finance/customers/${id}`}
                                  className="flex items-center gap-2 rounded-button px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50 hover:text-brand-900"
                                >
                                  <FileText size={15} className="text-brand-400" /> Open statement
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => shareCustomerStatement(buyer)}
                                  className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-left text-sm font-semibold text-ink-900 hover:bg-brand-50 hover:text-brand-900"
                                >
                                  <MessageCircle size={15} className="text-brand-400" /> Share via WhatsApp
                                </button>
                              </PopoverContent>
                            </Popover>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-16 text-center">
                          <Search className="mx-auto mb-3 text-ink-500" size={26} />
                          <p className="font-display font-bold text-ink-900">No buyers match these filters</p>
                          <p className="mt-1 text-sm font-medium text-ink-600">Adjust the search term or account status.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-card border border-slate-200 border-t-[4px] border-t-brand-400 bg-white/90 p-5 backdrop-blur">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        )}

        {/* IMPROVEMENT: Supercharged "Cold Start" Absolute Empty State */}
        {!isLoading && safeCustomers.length === 0 && (
          <div className="mx-auto mt-12 flex max-w-3xl animate-fade-in flex-col items-center justify-center rounded-card border border-slate-200 bg-white/90 p-12 text-center backdrop-blur">
            <div className="mb-6 rounded-full border border-brand-400/30 bg-brand-400/10 p-4">
              <Users size={40} className="text-brand-400" />
            </div>
            
            <h2 className="text-xl font-black text-ink mb-2">Set up your buyer registry</h2>
            <p className="text-sm text-ink-muted max-w-md mb-8 leading-relaxed">
              Add your milk buyers to automatically track daily deliveries, calculate running balances, and instantly generate digital statements.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={() => setIsAddPanelOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-700 text-white px-6 py-3 rounded-button font-bold text-sm hover:bg-brand-900 transition-colors"
              >
                <Plus size={18} /> Add Your First Buyer
              </button>
              
              <button onClick={handleImport} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-surface border border-ink/20 text-ink-strong px-6 py-3 rounded-button font-bold text-sm hover:bg-ink/5 transition-colors">
                <FileSpreadsheet size={18} className="text-success" /> Import from Excel
              </button>
            </div>

          </div>
        )}
      </div>

      {/* The Slide-Out Panel */}
      <SlidePanel 
        isOpen={isAddPanelOpen} 
        onClose={() => setIsAddPanelOpen(false)}
        title="Register New Customer"
        subtitle="Add a new customer to your milk billing registry."
      >
        <CustomerForm
          onSave={createCustomer}
          onCancel={() => setIsAddPanelOpen(false)}
          isSaving={isSaving}
        />
      </SlidePanel>
    </div>
  );
}
