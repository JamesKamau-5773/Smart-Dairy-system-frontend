import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { User, Mail, Phone, MapPin, DollarSign, Receipt, ArrowLeft, Edit, Droplets, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { Skeleton } from '../../components/ui';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import GroupedDateRows from '../../components/ui/GroupedDateRows';
import DeliveryModal from '../../components/finance/DeliveryModal';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { formatMoneyText } from '../../components/ui/Money';
import { formatDate } from '../../lib/dateFormat';
import { financeCopy } from '../../i18n/finance';

const copy = financeCopy.profile;
// "KES 1,250.00" from a backend figure; "—" when it sent none (never shown as zero).
const kes = (value) => formatMoneyText(value == null || value === '' ? null : Number(value));

const ProfileDetail = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-4">
    <Icon size={18} className="text-ink-muted mt-1 shrink-0" />
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</h4>
      <p className="text-sm font-medium text-ink">{value || copy.notAvailable}</p>
    </div>
  </div>
);

const TransactionRow = ({ tx }) => (
    <tr className="hover:bg-surface-raised transition-colors">
      <td className="p-4 text-sm text-ink-muted">{formatDate(tx.date)}</td>
      <td className="p-4 text-sm font-medium text-ink">{tx.description || tx.category || copy.notAvailable}</td>
      <td className="p-4 text-right text-sm font-bold text-brand">
        {kes(tx.amount)}
      </td>
      <td className="p-4 text-sm text-ink-muted text-right">{tx.reference || copy.notAvailable}</td>
    </tr>
);

const DeliveryRow = ({ delivery, onEdit, onDelete }) => {
  const delivered = Number(delivery.liters_delivered) || 0;
  const personalUse = Number(delivery.personal_consumption_liters) || 0;
  // To allow personal consumption to be logged independently, we no longer
  // subtract it from the delivered amount for this client-side display fallback.
  // The backend remains the source of truth for the final billable amount.
  const billableLiters = delivery.billable_liters ?? delivered;
  const amount = delivery.amount ?? delivery.billed_amount ?? null;

  return (
    <tr className="hover:bg-surface-raised transition-colors">
      <td className="p-4 text-sm text-ink-muted">{formatDate(delivery.date)}</td>
      <td className="p-4 text-sm font-medium text-ink text-right">{delivered.toFixed(1)} L</td>
      <td className="p-4 text-sm font-medium text-ink-muted text-right">{personalUse.toFixed(1)} L</td>
      <td className="p-4 text-sm font-bold text-ink text-right">{Number(billableLiters).toFixed(1)} L</td>
      <td className="p-4 text-sm font-bold text-brand text-right">
        {kes(amount)}
      </td>
      <td className="p-4 text-right">
        <Popover>
          <PopoverTrigger asChild>
      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-brand/20 text-brand hover:border-brand-400 hover:bg-brand-50" aria-label={copy.actionsForDelivery(formatDate(delivery.date))}><MoreVertical size={16} /></button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-1.5">
            <button type="button" onClick={() => onEdit(delivery)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-900 hover:bg-brand-50"><Pencil size={14} /> {copy.edit}</button>
            <button type="button" onClick={() => onDelete(delivery)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-brand-dark hover:bg-brand-50"><Trash2 size={14} /> {copy.delete}</button>
          </PopoverContent>
        </Popover>
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
      // With the permanent fix in `financeApi`, we can use the intended helpers.
      return id ? financeApi.updateDelivery(id, rest) : financeApi.createDelivery(rest);
    },
    onSuccess: (_, variables) => {
      toast.success(copy.deliverySaved(Boolean(variables.id)));
      invalidateDeliveryRelatedQueries();
      setIsDeliveryModalOpen(false);
      setEditingDelivery(null);
    },
    onError: (error, variables) => {
      toast.error(getApiErrorMessage(error, copy.deliverySaveFailed(Boolean(variables.id))));
    },
  });

  const { mutate: deleteDelivery } = useMutation({
    // With the permanent fix in `financeApi`, we can use the intended helper.
    mutationFn: (deliveryId) => financeApi.deleteDelivery(deliveryId),
    onSuccess: () => {
      toast.success(copy.deliveryDeleted);
      invalidateDeliveryRelatedQueries();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, copy.deliveryDeleteFailed));
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
      title: copy.deleteTitle,
      message: copy.deleteMessage(Number(delivery.liters_delivered).toFixed(1), formatDate(delivery.date)),
      confirmText: copy.delete,
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
      <div className="card-machined border border-brand/20 bg-brand-50 p-8 text-center text-brand-dark">
        <h2 className="font-bold text-lg">{copy.loadErrorTitle}</h2>
        <p className="mt-2 text-sm">{customerError.message || copy.loadErrorMessage}</p>
        <Link to="/finance/buyers" className="btn-secondary mt-4">{copy.backToBuyers}</Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="card-machined p-8 text-center">
        <h2 className="font-bold text-lg">{copy.notFoundTitle}</h2>
        <p className="mt-2 text-sm">{copy.notFoundMessage}</p>
        <Link to="/finance/buyers" className="btn-secondary mt-4">{copy.backToBuyers}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-reveal">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/finance/buyers" aria-label={copy.back} className="p-2 rounded-md hover:bg-surface-raised transition-colors">
            <ArrowLeft size={20} className="text-ink-muted" />
          </Link>
          <div className="p-3 bg-brand/10 rounded-full text-brand">
            <User size={24} />
          </div>
          <div>
            <h1 className="font-sans font-black text-3xl tracking-tight text-ink">{customer.name}</h1>
            <p className="text-sm font-medium text-ink-muted mt-1">
              {copy.subtitle}
            </p>
          </div>
        </div>
        <Link to="/operations/customers" state={{ editCustomer: customer }} className="btn-secondary gap-2">
          <Edit size={14} /> {copy.editCustomer}
        </Link>
      </div>

      <div className="card-machined p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
        <ProfileDetail icon={Phone} label={copy.phone} value={customer.phone_number} />
        <ProfileDetail icon={User} label={copy.contactPerson} value={customer.contact_person} />
        <ProfileDetail icon={Mail} label={copy.email} value={customer.email} />
        <ProfileDetail icon={MapPin} label={copy.address} value={customer.address} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-machined p-6">
          <h4 className="text-xs font-bold uppercase text-ink-muted flex items-center gap-2"><DollarSign size={14}/> {copy.currentBalance}</h4>
          <p className="mt-2 text-3xl font-black text-brand">
            {kes(customer.account_balance ?? customer.balance)}
          </p>
        </div>
        <div className="card-machined p-6">
          <h4 className="text-xs font-bold uppercase text-ink-muted flex items-center gap-2"><Receipt size={14}/> {copy.agreedRate}</h4>
          <p className="text-3xl font-black mt-2 text-ink">
            {kes(customer.agreed_rate_per_liter ?? customer.agreed_rate)} / L
          </p>
        </div>
        <div className="card-machined p-6">
          <h4 className="text-xs font-bold uppercase text-ink-muted flex items-center gap-2"><Droplets size={14}/> {copy.contractLitres}</h4>
          <p className="text-3xl font-black mt-2 text-ink">
            {customer.daily_contract_liters ? `${Number(customer.daily_contract_liters).toLocaleString(undefined, { maximumFractionDigits: 2 })} L` : copy.notAvailable}
          </p>
          <p className="text-xs text-ink-muted mt-1">{copy.contractHint}</p>
        </div>
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="p-6 border-b border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-lg text-ink flex items-center gap-2">
            <Droplets size={18} className="text-brand" /> {copy.deliveries}
          </h3>
          <button type="button" onClick={handleAddDelivery} className="btn-command gap-2 self-start sm:self-auto">
            <Plus size={14} /> {copy.logDelivery}
          </button>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-surface-raised">
              <tr>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.deliveryColumns.date}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.deliveryColumns.delivered}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.deliveryColumns.personalUse}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.deliveryColumns.billable}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.deliveryColumns.amount}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.deliveryColumns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoadingDeliveries ? (
                <tr><td colSpan="6" className="p-6 text-center text-ink-muted">{copy.loadingDeliveries}</td></tr>
              ) : deliveries.length > 0 ? (
                <GroupedDateRows
                  items={deliveries}
                  getDate={(delivery) => delivery.date}
                  colSpan={6}
                  renderGroupMeta={(items) => copy.deliveryCount(items.length)}
                  renderItem={(delivery) => (
                    <DeliveryRow
                      key={delivery.id}
                      delivery={delivery}
                      onEdit={handleEditDelivery}
                      onDelete={handleDeleteDelivery}
                    />
                  )}
                />
              ) : (
                <tr><td colSpan="6" className="p-6 text-center text-ink-muted">{copy.noDeliveries}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {isLoadingDeliveries ? <p className="p-5 text-sm text-ink-muted">{copy.loadingDeliveries}</p> : deliveries.length ? deliveries.map((delivery) => {
            const delivered = Number(delivery.liters_delivered) || 0;
            const personalUse = Number(delivery.personal_consumption_liters) || 0;
            const billable = delivery.billable_liters ?? delivered;
            const amount = delivery.amount ?? delivery.billed_amount;
            return (
              <article key={delivery.id} className="min-w-0 space-y-3 p-4">
                <div className="flex items-start justify-between gap-3"><time className="text-xs text-ink-muted">{formatDate(delivery.date)}</time><span className="text-right font-mono text-sm font-bold text-brand">{kes(amount)}</span></div>
                <dl className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 text-xs">
                  <div><dt className="text-ink-muted">{copy.delivered}</dt><dd className="mt-1 font-semibold text-ink">{delivered.toFixed(1)} L</dd></div>
                  <div><dt className="text-ink-muted">{copy.personalUse}</dt><dd className="mt-1 font-semibold text-ink">{personalUse.toFixed(1)} L</dd></div>
                  <div><dt className="text-ink-muted">{copy.billable}</dt><dd className="mt-1 font-semibold text-ink">{Number(billable).toFixed(1)} L</dd></div>
                </dl>
                <div className="flex justify-end gap-2"><button type="button" onClick={() => handleEditDelivery(delivery)} className="rounded-lg border border-brand/20 px-3 py-2 text-xs font-semibold text-brand">{copy.edit}</button><button type="button" onClick={() => handleDeleteDelivery(delivery)} className="rounded-lg border border-brand/20 px-3 py-2 text-xs font-semibold text-brand-dark">{copy.delete}</button></div>
              </article>
            );
          }) : <p className="p-5 text-sm text-ink-muted">{copy.noDeliveries}</p>}
        </div>
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="p-6 border-b border-ink/10">
          <h3 className="font-bold text-lg text-ink">{copy.transactions}</h3>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-surface-raised">
              <tr>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.transactionColumns.date}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.transactionColumns.description}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.transactionColumns.amount}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.transactionColumns.reference}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoadingTransactions ? (
                <tr><td colSpan="4" className="p-6 text-center text-ink-muted">{copy.loadingTransactions}</td></tr>
              ) : transactions.length > 0 ? (
                <GroupedDateRows
                  items={transactions}
                  getDate={(tx) => tx.date}
                  colSpan={4}
                  renderGroupMeta={(items) => copy.transactionCount(items.length)}
                  renderItem={(tx) => <TransactionRow key={tx.id} tx={tx} />}
                />
              ) : (
                <tr><td colSpan="4" className="p-6 text-center text-ink-muted">{copy.noTransactions}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {isLoadingTransactions ? <p className="p-5 text-sm text-ink-muted">{copy.loadingTransactions}</p> : transactions.length ? transactions.map((tx) => (
            <article key={tx.id} className="min-w-0 space-y-2 p-4">
              <div className="flex items-start justify-between gap-3"><time className="text-xs text-ink-muted">{formatDate(tx.date)}</time><span className="shrink-0 text-right font-mono text-sm font-bold text-brand">{kes(tx.amount)}</span></div>
              <p className="break-words text-sm font-medium text-ink">{tx.description || tx.category || copy.notAvailable}</p>
              <p className="break-all text-xs text-ink-muted">{copy.reference(tx.reference || copy.notAvailable)}</p>
            </article>
          )) : <p className="p-5 text-sm text-ink-muted">{copy.noTransactions}</p>}
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

      <Confirmation {...confirmation} />
    </div>
  );
}
