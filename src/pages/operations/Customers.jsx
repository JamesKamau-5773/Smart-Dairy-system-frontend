import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { Plus, Pencil, Trash2, Search, Users, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';

import CustomerForm from '../../components/finance/CustomerForm.jsx';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import SlidePanel from '../../components/ui/SlidePanel.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isPanelOpen, setIsPanelOpen] = useState(!!location.state?.editCustomer);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const confirmation = useConfirmation();

  const { data: customers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => financeApi.listCustomers().then(res => res.items || res.data || res || []),
  });

  const { mutate: saveCustomer, isLoading: isSaving } = useMutation({
    mutationFn: (customerData) => {
      const { id, ...rest } = customerData;
      return id
        ? financeApi.updateCustomer(id, rest)
        : financeApi.createCustomer(rest);
    },
    onSuccess: (_, variables) => {
      toast.success(`Customer ${variables.id ? 'updated' : 'created'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsPanelOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error, variables) => {
      toast.error(getApiErrorMessage(error, `Could not ${variables.id ? 'update' : 'create'} this customer. Check the details and try again.`));
    },
  });

  const { mutate: deleteCustomer } = useMutation({
    mutationFn: (customerId) => financeApi.deleteCustomer(customerId),
    onSuccess: () => {
      toast.success('Customer deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Could not delete this customer. Please try again.'));
    },
    onSettled: () => {
      confirmation.setLoading(false);
    },
  });

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsPanelOpen(true);
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setIsPanelOpen(true);
  };

  const handleDelete = async (customer) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (confirmed) {
      confirmation.setLoading(true);
      deleteCustomer(customer.id);
    }
  };

  // Effect to handle incoming state from other pages (e.g., "Edit" from profile)
  useEffect(() => {
    if (location.state?.editCustomer) {
      handleEdit(location.state.editCustomer);
    }
  }, [location.state]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchTerm) return customers;
    
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter((c) =>
      c.name?.toLowerCase().includes(lowerSearch) ||
      c.contact_person?.toLowerCase().includes(lowerSearch) || 
      c.phone_number?.includes(searchTerm) || 
      c.email?.toLowerCase().includes(lowerSearch) ||
      c.customer_type?.toLowerCase().includes(lowerSearch)
    );
  }, [customers, searchTerm]);

  return (
    <div className="animate-reveal space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-card border border-brand-100 bg-brand-50 p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white text-brand-700 rounded-lg border border-brand-100"><Users size={20} /></div>
          <div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand-900 m-0">
              Customer Management
            </h2>
            <p className="mt-1 text-sm text-brand-700/80">
              Add, edit, and manage your buyers and customers.
            </p>
          </div>
        </div>
        <button type="button" onClick={handleAdd} className="flex items-center gap-2 rounded-button bg-brand-800 px-4 py-2 text-sm font-semibold text-white  transition-colors hover:bg-brand-900 w-full sm:w-auto justify-center">
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      <div className="card-machined p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand" />
          <input
            type="text"
            placeholder="Search by name, contact, phone, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-machined pl-10"
          />
        </div>
      </div>

      <SlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
        subtitle={selectedCustomer ? 'Update the details for this customer.' : 'Add a new customer to your registry.'}
      >
        <CustomerForm
          customer={selectedCustomer}
          onSave={saveCustomer}
          onCancel={() => setIsPanelOpen(false)}
          isSaving={isSaving}
        />
      </SlidePanel>

      <Confirmation {...confirmation} />

      <div className="card-machined overflow-hidden !p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-800">
              <tr>
                <th className="p-4 font-sans text-xs font-bold uppercase tracking-wider text-white text-left">Customer</th>
                <th className="p-4 font-sans text-xs font-bold uppercase tracking-wider text-white text-left">Contact</th>
                <th className="p-4 font-sans text-xs font-bold uppercase tracking-wider text-white text-right">Financials</th>
                <th className="p-4 font-sans text-xs font-bold uppercase tracking-wider text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoading && (
                <tr><td colSpan="4" className="p-6 text-center text-ink-muted">Loading customers...</td></tr>
              )}
              {isError && (
                <tr><td colSpan="4" className="p-6 text-center text-danger">
                  <p>Could not load customers. Check your connection and try again.</p>
                  <button type="button" onClick={() => refetch()} className="mt-2 font-semibold underline">Retry</button>
                </td></tr>
              )}
              {!isLoading && filteredCustomers.length === 0 && (
                <tr><td className="p-6 text-center text-ink-muted" colSpan="4">No customers found.</td></tr>
              )}
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="group hover:bg-surface-raised transition-colors">
                  <td className="p-4 text-left">
                    <div className="font-medium text-ink">{customer.name}</div>
                    <div className="text-xs text-ink-muted capitalize">{customer.customer_type || 'Unknown'}</div>
                  </td>
                  <td className="p-4 text-sm text-ink-muted text-left">
                    <div>{customer.contact_person || 'N/A'}</div>
                    <div className="font-mono">{customer.phone_number}</div>
                    <div className="text-xs">{customer.email || ''}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-sm">
                      <span className="text-slate-400">Bal: </span>
                      <span className="font-bold text-slate-800 font-mono">{Number(customer.account_balance ?? customer.existing_balance ?? customer.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Rate: <span className="font-mono">{Number(customer.agreed_rate_per_liter ?? customer.agreed_rate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / L</span>
                    </div>
                    {Number(customer.daily_contract_liters) > 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Contract: <span className="font-mono">{Number(customer.daily_contract_liters).toLocaleString(undefined, { maximumFractionDigits: 2 })} L/day</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-700" aria-label={`Actions for ${customer.name}`}><MoreVertical size={16} /></button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-40 p-1.5">
                        <button type="button" onClick={() => handleEdit(customer)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-900 hover:bg-brand-50"><Pencil size={14} /> Edit</button>
                        <button type="button" onClick={() => handleDelete(customer)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"><Trash2 size={14} /> Delete</button>
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {isLoading ? <p className="p-6 text-center text-sm text-ink-muted">Loading customers...</p> : isError ? <div className="p-6 text-center text-sm text-brand-dark"><p>Could not load customers. Check your connection and try again.</p><button type="button" onClick={() => refetch()} className="mt-2 font-semibold underline">Retry</button></div> : filteredCustomers.map((customer) => (
            <article key={customer.id} className="min-w-0 space-y-3 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="break-words font-semibold text-ink">{customer.name}</h3><p className="mt-1 text-xs capitalize text-ink-muted">{customer.customer_type || 'Unknown'}</p></div>
                <span className="shrink-0 font-mono text-sm font-bold text-brand">KES {Number(customer.account_balance ?? customer.existing_balance ?? customer.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 text-xs">
                <div className="min-w-0"><dt className="text-ink-muted">Contact person</dt><dd className="mt-1 break-words text-ink">{customer.contact_person || 'N/A'}</dd></div>
                <div className="min-w-0"><dt className="text-ink-muted">Phone</dt><dd className="mt-1 break-all font-mono text-ink">{customer.phone_number || 'N/A'}</dd></div>
                <div className="min-w-0"><dt className="text-ink-muted">Rate</dt><dd className="mt-1 break-words font-mono text-ink">KES {Number(customer.agreed_rate_per_liter ?? customer.agreed_rate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/L</dd></div>
                {Number(customer.daily_contract_liters) > 0 && <div className="min-w-0"><dt className="text-ink-muted">Daily contract</dt><dd className="mt-1 font-mono text-ink">{Number(customer.daily_contract_liters).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</dd></div>}
                {customer.email && <div className="col-span-2 min-w-0"><dt className="text-ink-muted">Email</dt><dd className="mt-1 break-all text-ink">{customer.email}</dd></div>}
              </dl>
              <div className="flex justify-end gap-2 border-t border-ink/10 pt-3">
                <button type="button" onClick={() => handleEdit(customer)} className="rounded-button border border-brand/20 px-3 py-2 text-xs font-semibold text-brand">Edit</button>
                <button type="button" onClick={() => handleDelete(customer)} className="rounded-button border border-brand/20 px-3 py-2 text-xs font-semibold text-brand-dark">Delete</button>
              </div>
            </article>
          ))}
          {!isLoading && !isError && filteredCustomers.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">No customers found.</p>}
        </div>
      </div>
    </div>
  );
}
