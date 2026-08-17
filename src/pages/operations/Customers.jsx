import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../lib/backendApi'; 
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

import CustomerForm from '../../components/finance/CustomerForm.jsx';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import SlidePanel from '../../components/ui/SlidePanel.jsx';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isPanelOpen, setIsPanelOpen] = useState(!!location.state?.editCustomer);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const confirmation = useConfirmation();

  const { data: customers = [], isLoading, isError } = useQuery({
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
      toast.error(error.message || `Failed to ${variables.id ? 'update' : 'create'} customer.`);
    },
  });

  const { mutate: deleteCustomer } = useMutation({
    mutationFn: (customerId) => financeApi.deleteCustomer(customerId),
    onSuccess: () => {
      toast.success('Customer deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete customer.');
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display font-semibold text-3xl tracking-tight text-ink">
            Customer Management
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Add, edit, and manage your buyers and customers.
          </p>
        </div>
        <button type="button" onClick={handleAdd} className="btn-command w-full sm:w-auto justify-center gap-2">
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      <div className="card-machined p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by name, contact, phone, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-machined pl-9"
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-raised">
              <tr>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">Customer (Type)</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">Contact Person</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">Phone / Email</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Financials</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoading && (
                <tr><td colSpan="5" className="p-6 text-center text-ink-muted">Loading customers...</td></tr>
              )}
              {isError && (
                <tr><td colSpan="5" className="p-6 text-center text-danger">Failed to load customers.</td></tr>
              )}
              {!isLoading && filteredCustomers.length === 0 && (
                <tr><td className="p-6 text-center text-ink-muted" colSpan="5">No customers found.</td></tr>
              )}
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="group hover:bg-surface-raised transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-ink">{customer.name}</div>
                    <div className="text-xs text-ink-muted capitalize">{customer.customer_type || 'Unknown'}</div>
                  </td>
                  <td className="p-4 text-sm text-ink-muted">{customer.contact_person || 'N/A'}</td>
                  <td className="p-4 text-sm text-ink-muted">
                    <div>{customer.phone_number}</div>
                    <div className="text-xs">{customer.email || ''}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-sm font-medium text-ink">
                      Bal: {Number(customer.account_balance ?? customer.existing_balance ?? customer.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      Rate: {Number(customer.agreed_rate_per_liter ?? customer.agreed_rate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / L
                    </div>
                    {Number(customer.daily_contract_liters) > 0 && (
                      <div className="text-xs text-ink-muted mt-0.5">
                        Contract: {Number(customer.daily_contract_liters).toLocaleString(undefined, { maximumFractionDigits: 2 })} L/day
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button type="button" onClick={() => handleEdit(customer)} className="btn-secondary gap-1 px-3 py-2 text-xs">
                        <Pencil size={12} /> Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(customer)} className="btn-danger gap-1 px-3 py-2 text-xs">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}