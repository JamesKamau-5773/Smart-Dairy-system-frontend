import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { financeApi } from '../../lib/backendApi';
import { User, Mail, Phone, MapPin, DollarSign, Receipt, ArrowLeft, Edit, Droplets, Plus, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '../../components/ui';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import DeliveryModal from '../../components/finance/DeliveryModal';

const ProfileDetail = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-4">
    <Icon size={18} className="text-ink-muted mt-1 shrink-0" />
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</h4>
      <p className="text-sm font-medium text-ink">{value || 'N/A'}</p>
    </div>
  </div>
);

const TransactionRow = ({ tx }) => (
    <tr className="hover:bg-surface-raised transition-colors">
      <td className="p-4 text-sm text-ink-muted">{new Date(tx.date).toLocaleDateString()}</td>
      <td className="p-4 text-sm font-medium text-ink">{tx.description || tx.category || 'N/A'}</td>
      <td className={`p-4 text-sm font-bold text-right ${tx.amount > 0 ? 'text-brand' : 'text-danger'}`}>
        {tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'KSH' })}
      </td>
      <td className="p-4 text-sm text-ink-muted text-right">{tx.reference || 'N/A'}</td>
    </tr>
);

const DeliveryRow = ({ delivery, onEdit, onDelete }) => {
  const delivered = Number(delivery.liters_delivered) || 0;
  const personalUse = Number(delivery.personal_consumption_liters) || 0;
  // Prefer the backend-computed billable liters/amount; only fall back to a
  // client-side estimate if the backend didn't return one.
  const billableLiters = delivery.billable_liters ?? Math.max(delivered - personalUse, 0);
  const amount = delivery.amount ?? delivery.billed_amount ?? null;

  return (
    <tr className="hover:bg-surface-raised transition-colors">
      <td className="p-4 text-sm text-ink-muted">{new Date(delivery.date).toLocaleDateString()}</td>
      <td className="p-4 text-sm font-medium text-ink text-right">{delivered.toFixed(1)} L</td>
      <td className="p-4 text-sm font-medium text-ink-muted text-right">{personalUse.toFixed(1)} L</td>
      <td className="p-4 text-sm font-bold text-ink text-right">{Number(billableLiters).toFixed(1)} L</td>
      <td className="p-4 text-sm font-bold text-brand text-right">
        {amount != null ? `KSh ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(delivery)}
            className="p-1.5 rounded-md hover:bg-surface-raised text-ink-muted hover:text-ink transition-colors"
            aria-label="Edit delivery"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(delivery)}
            className="p-1.5 rounded-md hover:bg-danger/10 text-ink-muted hover:text-danger transition-colors"
            aria-label="Delete delivery"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function CustomerProfile() {
  const { customerId } = useParams();
  const queryClient = useQueryClient();
  const confirmation = useConfirmation();
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);

  const { 
    data: customer, 
    isLoading: isLoadingCustomer, 
    isError: isErrorCustomer,
    error: customerError 
  } = useQuery({
    queryKey: ['customer', customerId],
    // This is the key fix: call a method that fetches a single customer by ID.
    queryFn: () => financeApi.getCustomer(customerId),
    enabled: !!customerId,
  });

  const { 
    data: transactionsData, 
    isLoading: isLoadingTransactions 
  } = useQuery({
    queryKey: ['customerTransactions', customerId],
    queryFn: () => financeApi.listLedgerEntries({ customer_id: customerId }),
    enabled: !!customerId,
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : transactionsData?.items || [];

  const {
    data: deliveriesData,
    isLoading: isLoadingDeliveries,
  } = useQuery({
    queryKey: ['customerDeliveries', customerId],
    queryFn: () => financeApi.listDeliveries({ customer_id: customerId }),
    enabled: !!customerId,
  });

  const deliveries = Array.isArray(deliveriesData) ? deliveriesData : deliveriesData?.items || [];

  const invalidateDeliveryRelatedQueries = () => {
    // The backend owns billing math — refresh everything it could have touched
    // (delivery list, balance, statement) rather than patching local state.
    queryClient.invalidateQueries({ queryKey: ['customerDeliveries', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customerTransactions', customerId] });
  };

  const { mutate: saveDelivery, isPending: isSavingDelivery } = useMutation({
    mutationFn: (payload) => {
      const { id, ...rest } = payload;
      return id ? financeApi.updateDelivery(id, rest) : financeApi.createDelivery(rest);
    },
    onSuccess: (_, variables) => {
      toast.success(`Delivery ${variables.id ? 'updated' : 'logged'} successfully!`);
      invalidateDeliveryRelatedQueries();
      setIsDeliveryModalOpen(false);
      setEditingDelivery(null);
    },
    onError: (error, variables) => {
      toast.error(error.message || `Failed to ${variables.id ? 'update' : 'log'} delivery.`);
    },
  });

  const { mutate: deleteDelivery } = useMutation({
    mutationFn: (deliveryId) => financeApi.deleteDelivery(deliveryId),
    onSuccess: () => {
      toast.success('Delivery deleted successfully!');
      invalidateDeliveryRelatedQueries();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete delivery.');
    },
    onSettled: () => {
      confirmation.setLoading(false);
    },
  });

  const handleAddDelivery = () => {
    setEditingDelivery(null);
    setIsDeliveryModalOpen(true);
  };

  const handleEditDelivery = (delivery) => {
    setEditingDelivery(delivery);
    setIsDeliveryModalOpen(true);
  };

  const handleDeleteDelivery = async (delivery) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Delivery',
      message: `Delete the ${Number(delivery.liters_delivered).toFixed(1)} L delivery logged on ${new Date(delivery.date).toLocaleDateString()}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (confirmed) {
      confirmation.setLoading(true);
      deleteDelivery(delivery.id);
    }
  };

  if (isLoadingCustomer) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isErrorCustomer) {
    return (
      <div className="card-machined bg-danger/10 border-danger text-danger p-8 text-center">
        <h2 className="font-bold text-lg">Error Loading Customer</h2>
        <p className="mt-2 text-sm">{customerError.message || 'The customer profile could not be retrieved.'}</p>
        <Link to="/finance/buyers" className="btn-secondary mt-4">Go Back to Buyers List</Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="card-machined p-8 text-center">
        <h2 className="font-bold text-lg">Customer Not Found</h2>
        <p className="mt-2 text-sm">The requested customer does not exist.</p>
        <Link to="/finance/buyers" className="btn-secondary mt-4">Go Back to Buyers List</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-reveal">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/finance/buyers" className="p-2 rounded-md hover:bg-surface-raised transition-colors">
            <ArrowLeft size={20} className="text-ink-muted" />
          </Link>
          <div className="p-3 bg-brand/10 rounded-full text-brand">
            <User size={24} />
          </div>
          <div>
            <h1 className="font-sans font-black text-3xl tracking-tight text-ink">{customer.name}</h1>
            <p className="text-sm font-medium text-ink-muted mt-1">
              Customer Profile & Statement
            </p>
          </div>
        </div>
        <Link to="/operations/customers" state={{ editCustomer: customer }} className="btn-secondary gap-2">
          <Edit size={14} /> Edit Customer
        </Link>
      </div>

      <div className="card-machined p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
        <ProfileDetail icon={Phone} label="Phone" value={customer.phone_number} />
        <ProfileDetail icon={User} label="Contact Person" value={customer.contact_person} />
        <ProfileDetail icon={Mail} label="Email" value={customer.email} />
        <ProfileDetail icon={MapPin} label="Address" value={customer.address} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-machined p-6">
          <h4 className="text-xs font-bold uppercase text-ink-muted flex items-center gap-2"><DollarSign size={14}/> Current Balance</h4>
          <p className={`text-3xl font-black mt-2 ${(customer.account_balance ?? customer.balance ?? 0) > 0 ? 'text-danger' : 'text-brand'}`}>
            KSh {(customer.account_balance ?? customer.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-machined p-6">
          <h4 className="text-xs font-bold uppercase text-ink-muted flex items-center gap-2"><Receipt size={14}/> Agreed Rate</h4>
          <p className="text-3xl font-black mt-2 text-ink">
            KSh {(customer.agreed_rate_per_liter ?? customer.agreed_rate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} / L
          </p>
        </div>
        <div className="card-machined p-6">
          <h4 className="text-xs font-bold uppercase text-ink-muted flex items-center gap-2"><Droplets size={14}/> Contract Litres/Day</h4>
          <p className="text-3xl font-black mt-2 text-ink">
            {customer.daily_contract_liters ? `${Number(customer.daily_contract_liters).toLocaleString(undefined, { maximumFractionDigits: 2 })} L` : 'N/A'}
          </p>
          <p className="text-xs text-ink-muted mt-1">For customers billed periodically (weekly/monthly)</p>
        </div>
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="p-6 border-b border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-lg text-ink flex items-center gap-2">
            <Droplets size={18} className="text-brand" /> Milk Deliveries
          </h3>
          <button type="button" onClick={handleAddDelivery} className="btn-command gap-2 self-start sm:self-auto">
            <Plus size={14} /> Log Delivery
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-raised">
              <tr>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">Date</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Delivered</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Personal Use</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Billable</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Amount</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoadingDeliveries ? (
                <tr><td colSpan="6" className="p-6 text-center text-ink-muted">Loading deliveries...</td></tr>
              ) : deliveries.length > 0 ? (
                deliveries.map((delivery) => (
                  <DeliveryRow
                    key={delivery.id}
                    delivery={delivery}
                    onEdit={handleEditDelivery}
                    onDelete={handleDeleteDelivery}
                  />
                ))
              ) : (
                <tr><td colSpan="6" className="p-6 text-center text-ink-muted">No deliveries logged for this customer yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="p-6 border-b border-ink/10">
          <h3 className="font-bold text-lg text-ink">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-raised">
              <tr>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">Date</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">Description</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Amount</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoadingTransactions ? (
                <tr><td colSpan="4" className="p-6 text-center text-ink-muted">Loading transactions...</td></tr>
              ) : transactions.length > 0 ? (
                transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)
              ) : (
                <tr><td colSpan="4" className="p-6 text-center text-ink-muted">No transactions found for this customer.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => { setIsDeliveryModalOpen(false); setEditingDelivery(null); }}
        onSave={saveDelivery}
        delivery={editingDelivery}
        customer={customer}
        isSaving={isSavingDelivery}
      />

      <Confirmation
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        isLoading={confirmation.isLoading}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
      />
    </div>
  );
}