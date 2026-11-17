import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { queuedOfflineMessage, isQueuedOffline, offlineFailureMessage } from '../../lib/offlinePolicy';
import { reportError } from '../../lib/telemetry';
import { Plus, Search, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';

import CustomerForm from '../../components/finance/CustomerForm.jsx';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import SlidePanel from '../../components/ui/SlidePanel.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { CardSkeletons, ListLoadNotices, TableSkeletonRows } from '../../components/ui/ListLoadState';
import { formatMoneyText } from '../../components/ui/Money';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { isFeatureEnabled } from '../../lib/featureFlags';
import { customerTypeLabel, financeCopy } from '../../i18n/finance';
import { shellCopy } from '../../i18n/shell';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { commonCopy } from '../../i18n/common';
const TABLE_COLUMNS = 4;

// The first balance/rate field the backend sent; null (shown as "—") when none, never 0.
const balanceOf = (customer) => customer.account_balance ?? customer.existing_balance ?? customer.balance ?? null;
const rateOf = (customer) => customer.agreed_rate_per_liter ?? customer.agreed_rate ?? null;

/** What the delete dialog says about the customer's account, from the backend's balance. */
function describeBalanceForDelete(name, rawBalance) {
  const balance = rawBalance === null || rawBalance === undefined || rawBalance === '' ? null : Number(rawBalance);
  const copy = financeCopy.customers;
  if (balance === null || !Number.isFinite(balance)) return copy.balanceUnknown(name);
  if (balance > 0) return copy.owes(name, formatMoneyText(balance));
  if (balance < 0) return copy.credit(name, formatMoneyText(-balance));
  return copy.settled(name);
}

export default function CustomersPage() {
  // Inputs are 16px on phones, so the long search hint would be cut off there.
  const isPhone = useMediaQuery(PHONE_QUERY);
  const copy = financeCopy.customers;
  // The backend has no customer DELETE route yet (BR-007), so offering Delete would always fail.
  const canDeleteCustomers = isFeatureEnabled('customerDelete');
  const queryClient = useQueryClient();
  const location = useLocation();
  const { tenantId, farmId } = useTenant();
  // "Edit" from a customer's profile opens this page with that customer in the panel.
  const [isPanelOpen, setIsPanelOpen] = useState(!!location.state?.editCustomer);
  const [selectedCustomer, setSelectedCustomer] = useState(() => location.state?.editCustomer ?? null);
  const [searchTerm, setSearchTerm] = useState('');
  const confirmation = useConfirmation();
  const customersKey = QUERY_KEYS.CUSTOMERS(tenantId, farmId);

  const customersQuery = useQuery({
    queryKey: customersKey,
    queryFn: () => financeApi.listCustomers().then(res => res.items || res.data || res || []),
    enabled: !!farmId,
  });
  const customers = customersQuery.data;
  const loadState = getListLoadState(customersQuery);
  const showCustomers = hasRowsToShow(loadState);

  const { mutate: saveCustomer, isPending: isSaving, error: saveError } = useMutation({
    mutationFn: (customerData) => {
      const { id, ...rest } = customerData;
      return id
        ? financeApi.updateCustomer(id, rest)
        : financeApi.createCustomer(rest);
    },
    onSuccess: (result, variables) => {
      if (isQueuedOffline(result)) {
        toast(queuedOfflineMessage());
      } else {
        toast.success(copy.saved(Boolean(variables.id)));
      }
      queryClient.invalidateQueries({ queryKey: customersKey });
      setIsPanelOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error, variables) => {
      toast.error(getApiErrorMessage(error, copy.saveFailed(Boolean(variables.id))));
    },
  });

  const { mutate: deleteCustomer } = useMutation({
    mutationFn: (customerId) => financeApi.deleteCustomer(customerId),
    onSuccess: () => {
      toast.success(copy.deleted);
      queryClient.invalidateQueries({ queryKey: customersKey });
    },
    onError: (error, customerId) => {
      reportError(error, { where: 'Customers.delete' });
      const name = customers?.find((customer) => customer.id === customerId)?.name ?? copy.theCustomer;
      toast.error(offlineFailureMessage(error, `${name} wasn’t deleted.`)
        ?? getApiErrorMessage(error, copy.deleteFailed(name)));
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
    const name = customer.name || copy.thisCustomer;
    const confirmed = await confirmation.confirm({
      title: copy.deleteTitle(name),
      message: copy.deleteMessage(describeBalanceForDelete(name, balanceOf(customer))),
      confirmText: copy.deleteConfirm,
      cancelText: copy.deleteKeep,
      type: 'danger',
      requireText: customer.name || 'DELETE',
    });
    if (confirmed) {
      confirmation.setLoading(true);
      deleteCustomer(customer.id);
    }
  };

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
        <div>
          <div>
            <h1 className="text-page-title text-brand-900 m-0">
              {shellCopy.nav.items.customers}
            </h1>
            <p className="mt-1 text-body text-brand-700/80">
              {copy.subtitle}
            </p>
          </div>
        </div>
        <button type="button" onClick={handleAdd} className="flex items-center gap-2 rounded-button bg-brand-800 px-4 py-2 text-control text-white transition-colors hover:bg-brand-900 w-full sm:w-auto justify-center">
          <Plus size={16} aria-hidden="true" /> {copy.addNew}
        </button>
      </div>

      <div className="card-machined p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand" aria-hidden="true" />
          <input
            type="text"
            aria-label={copy.searchPlaceholder}
            placeholder={isPhone ? commonCopy.filters.searchShort : copy.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-machined pl-10"
          />
        </div>
      </div>

      <SlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={selectedCustomer ? copy.editTitle : copy.addNew}
        subtitle={selectedCustomer ? copy.editSubtitle : copy.addSubtitle}
      >
        <CustomerForm
          customer={selectedCustomer}
          onSave={saveCustomer}
          onCancel={() => setIsPanelOpen(false)}
          isSaving={isSaving}
          serverError={saveError}
        />
      </SlidePanel>

      <Confirmation {...confirmation} />

      <div className="card-machined overflow-hidden !p-0">
        <ListLoadNotices state={loadState} label={copy.listLabel} error={customersQuery.error} onRetry={customersQuery.refetch} />
        {showCustomers && filteredCustomers.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-body text-ink-muted">
            {searchTerm ? (
              <>
                <p>{copy.noMatches(searchTerm)}</p>
                <button type="button" onClick={() => setSearchTerm('')} className="text-control text-brand hover:underline">{copy.clearSearch}</button>
              </>
            ) : (
              <>
                <p>{copy.empty}</p>
                <button type="button" onClick={handleAdd} className="btn-command">{copy.addFirst}</button>
              </>
            )}
          </div>
        )}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-800">
              <tr>
                <th className="p-4 text-label text-white text-left">{copy.columns.customer}</th>
                <th className="p-4 text-label text-white text-left">{copy.columns.contact}</th>
                <th className="p-4 text-label text-white text-right">{copy.columns.financials}</th>
                <th className="p-4 text-label text-white text-right">{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {loadState === 'loading' && <TableSkeletonRows columns={TABLE_COLUMNS} />}
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="group hover:bg-surface-raised transition-colors">
                  <td className="p-4 text-left">
                    <div className="text-ink">{customer.name}</div>
                    <div className="text-meta text-ink-muted">{customer.customer_type ? customerTypeLabel(customer.customer_type) : copy.unknownType}</div>
                  </td>
                  <td className="p-4 text-body text-ink-muted text-left">
                    <div>{customer.contact_person || copy.notAvailable}</div>
                    <div className="tabular-nums">{customer.phone_number}</div>
                    <div className="text-meta">{customer.email || ''}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-body">
                      <span className="text-slate-400">{copy.balanceShort}</span>
                      <span className="text-body-strong text-slate-800 tabular-nums">{formatMoneyText(balanceOf(customer))}</span>
                    </div>
                    <div className="text-meta text-slate-400 mt-0.5">
                      {copy.rate} <span className="tabular-nums">{formatMoneyText(rateOf(customer))} / L</span>
                    </div>
                    {Number(customer.daily_contract_liters) > 0 && (
                      <div className="text-meta text-slate-400 mt-0.5">
                        {copy.contract} <span className="tabular-nums">{Number(customer.daily_contract_liters).toLocaleString(undefined, { maximumFractionDigits: 2 })} {copy.perDay}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-700" aria-label={copy.actionsFor(customer.name)}><MoreVertical size={16} aria-hidden="true" /></button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-40 p-1.5">
                        <button type="button" onClick={() => handleEdit(customer)} className="flex w-full items-center rounded-md px-3 py-2 text-left text-control text-ink-900 hover:bg-brand-50">
        {copy.edit}</button>
                        {canDeleteCustomers && <button type="button" onClick={() => handleDelete(customer)} className="flex w-full items-center rounded-md px-3 py-2 text-left text-control text-danger hover:bg-danger/10">
      {copy.delete}</button>}
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {loadState === 'loading' && <CardSkeletons />}
          {filteredCustomers.map((customer) => (
            <article key={customer.id} className="min-w-0 space-y-3 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="break-words text-section-title text-ink">{customer.name}</h2><p className="mt-1 text-meta text-ink-muted">{customer.customer_type ? customerTypeLabel(customer.customer_type) : copy.unknownType}</p></div>
                <span className="shrink-0 text-body-strong text-brand tabular-nums">{formatMoneyText(balanceOf(customer))}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 text-meta">
                <div className="min-w-0"><dt className="text-ink-muted">{copy.contactPerson}</dt><dd className="mt-1 break-words text-ink">{customer.contact_person || copy.notAvailable}</dd></div>
                <div className="min-w-0"><dt className="text-ink-muted">{copy.phone}</dt><dd className="mt-1 break-all tabular-nums text-ink">{customer.phone_number || copy.notAvailable}</dd></div>
                <div className="min-w-0"><dt className="text-ink-muted">{copy.rateLabel}</dt><dd className="mt-1 break-words tabular-nums text-ink">{formatMoneyText(rateOf(customer))}/L</dd></div>
                {Number(customer.daily_contract_liters) > 0 && <div className="min-w-0"><dt className="text-ink-muted">{copy.dailyContract}</dt><dd className="mt-1 tabular-nums text-ink">{Number(customer.daily_contract_liters).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</dd></div>}
                {customer.email && <div className="col-span-2 min-w-0"><dt className="text-ink-muted">{copy.email}</dt><dd className="mt-1 break-all text-ink">{customer.email}</dd></div>}
              </dl>
              <div className="flex justify-end gap-2 border-t border-ink/10 pt-3">
                <button type="button" onClick={() => handleEdit(customer)} className="rounded-button border border-brand/20 px-3 py-2 text-control text-brand">{copy.edit}</button>
                {canDeleteCustomers && <button type="button" onClick={() => handleDelete(customer)} className="rounded-button border border-brand/20 px-3 py-2 text-control text-brand-dark">{copy.delete}</button>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
