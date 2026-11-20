import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTenant } from '../../hooks/useTenant';
import { BUYER_STATUSES, useBuyerFilters } from '../../hooks/useBuyerFilters';
import FilterPanel from '../../components/data/FilterPanel';
import { Toolbar, ToolbarSearch, ToolbarSelect } from '../../components/data/Toolbar';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { queuedOfflineMessage, isQueuedOffline } from '../../lib/offlinePolicy';
import { getSearchSuggestions, matchesSearch } from '../../lib/fuzzySearch';
import SearchSuggestions from '../../components/ui/SearchSuggestions';
import { Skeleton } from '../../components/ui';
import SlidePanel from '../../components/ui/SlidePanel';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import CustomerForm from '../../components/finance/CustomerForm';
import { formatMoneyText } from '../../components/ui/Money';
import { ListLoadNotices, StatValue } from '../../components/ui/ListLoadState';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { formatCount } from '../../lib/numberFormat';
import { SITE } from '../../landing/content';
import { normalizeKenyanPhone } from '../../lib/phone';
import { customerTypeLabel, financeCopy } from '../../i18n/finance';
import { shellCopy } from '../../i18n/shell';
// "KES 1,250.00"; "—" when the backend sent no figure (unknown is never shown as zero).
const formatKes = formatMoneyText;

const toAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const balanceOf = (customer) => toAmount(customer?.account_balance ?? customer?.balance);
const rateOf = (customer) => toAmount(customer?.agreed_rate_per_liter ?? customer?.rate_per_liter);
const balanceStatus = (balance) => {
  const labels = financeCopy.balanceStatus;
  return balance === null ? labels.unknown : balance > 0 ? labels.outstanding : labels.settled;
};

/**
 * SRP: Renders a single Financial KPI Widget.
 */
const KPIWidget = ({ title, value, subtitle, valueColor = "text-brand", state = 'ready' }) => (
  <div className="group relative overflow-hidden rounded-card border border-slate-200 border-t-[4px] border-t-brand-400 bg-white/90 p-6 backdrop-blur">
    <p className="mb-4 text-label text-slate-600">
      {title}
    </p>
    <StatValue state={state} label={financeCopy.buyers.listLabel} className={`mb-1 break-words text-stat-value tabular-nums ${valueColor}`}>
      {value}
    </StatValue>
    <p className="text-meta text-slate-600">{subtitle}</p>
  </div>
);

/**
 * Main Page Component
 */
export default function BuyersList() {
  const copy = financeCopy.buyers;
  const statementCopy = financeCopy.statement;
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  // The status lives in the address; the search stays here (see useBuyerFilters).
  const filters = useBuyerFilters();
  const { search: searchTerm, status: statusFilter } = filters.values;
  const setSearchTerm = filters.setSearch;
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);

  // Data Fetching
  // UNIFIED: We now fetch from the 'customers' endpoint to have a single source of truth.
  const customersQuery = useQuery({
    queryKey: ['customers', tenantId, farmId],
    queryFn: () => financeApi.listCustomers().then(res => res?.items || res?.data || res || []),
    enabled: !!farmId,
  });
  const customers = customersQuery.data;
  const loadState = getListLoadState(customersQuery);
  const showBuyers = hasRowsToShow(loadState);

  // --- Mutations for CUD (Create, Update, Delete) ---
  // We only need 'create' on this page. The full management is on Customers.jsx
  const { mutate: createCustomer, isPending: isSaving, error: saveError } = useMutation({
    mutationFn: (customerData) => financeApi.createCustomer(customerData),
    onSuccess: (result) => {
      if (isQueuedOffline(result)) {
        toast(queuedOfflineMessage());
      } else {
        toast.success(copy.created);
      }
      queryClient.invalidateQueries({ queryKey: ['customers', tenantId, farmId] });
      setIsAddPanelOpen(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, copy.createFailed));
    },
  });

  // Defensive: Ensure customers is always an array
  const safeCustomers = useMemo(() => Array.isArray(customers) ? customers : [], [customers]);

  // Derived State (Filtering)
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return safeCustomers.filter((customer) => {
      const balance = balanceOf(customer);
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'outstanding' && balance !== null && balance > 0)
        || (statusFilter === 'settled' && balance !== null && balance <= 0);
      const matchesTerm = !term || matchesSearch([
        customer?.name,
        customer?.id,
        customer?.type,
        customer?.contact,
        customer?.phone_number,
        customer?.contact_person,
      ], term);

      return matchesStatus && matchesTerm;
    });
  }, [safeCustomers, searchTerm, statusFilter]);

  // Typo-tolerant "Did you mean…" for buyer names when a search finds nothing.
  const buyerSuggestions = searchTerm.trim() && filteredCustomers.length === 0
    ? getSearchSuggestions(safeCustomers, searchTerm, (customer) => [customer?.name, customer?.contact_person])
    : [];
  const buyerSuggestionChips = (
    <SearchSuggestions
      items={buyerSuggestions}
      getKey={(customer) => customer.id}
      getLabel={(customer) => customer.name}
      onPick={(customer) => setSearchTerm(customer.name)}
    />
  );

  // Derived State (KPIs)
  // Credits/overpayments are shown on the individual account but must not reduce
  // the amount other buyers still owe.
  // TODO(BR-002): the backend should return these totals with the list; until then they are
  // only shown when every balance is known, so a missing balance never reads as zero.
  const balances = safeCustomers.map(balanceOf);
  const allBalancesKnown = balances.every((balance) => balance !== null);
  const totalOutstanding = allBalancesKnown ? balances.reduce((sum, balance) => sum + Math.max(balance, 0), 0) : null;
  const settledBuyersCount = allBalancesKnown ? balances.filter((balance) => balance <= 0).length : null;

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
      const balance = balanceOf(customer);
      return statementCopy.line(customer?.name || statementCopy.unnamed, customer?.id || '--', formatKes(balance));
    });
    const message = [statementCopy.titlePlural(SITE.name), '', ...lines, '', statementCopy.openApp(SITE.name)].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const shareCustomerStatement = (customer) => {
    const balance = balanceOf(customer);
    const message = [
      statementCopy.title(SITE.name),
      statementCopy.buyer(customer?.name || statementCopy.unnamed),
      statementCopy.account(customer?.id || '--'),
      statementCopy.balance(formatKes(balance)),
      '',
      statementCopy.openApp(SITE.name),
    ].join('\n');
    // Straight to the buyer's chat when their number is a valid Kenyan mobile; otherwise
    // WhatsApp asks who to send it to, rather than opening a chat with a wrong number.
    const phone = normalizeKenyanPhone(customer?.phone_number || customer?.contact);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-[80vh] animate-reveal pb-12">
      
      {/* Header Section with Primary Action */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-card border border-slate-200 border-l-[4px] border-l-brand-400 bg-white/90 p-5 backdrop-blur md:flex-row md:items-center">
        <div>
          <div>
            <h1 className="m-0 text-page-title text-ink-900">
              {shellCopy.nav.items.buyers}
            </h1>
            <p className="mt-1 max-w-xl text-body text-slate-600">
              {copy.subtitle}
            </p>
          </div>
        </div>
        
        {/* IMPROVEMENT: Only show the top-right button if data exists */}
        {safeCustomers.length > 0 && (
          <button 
            onClick={() => setIsAddPanelOpen(true)}
            className="flex items-center gap-2 rounded-button bg-brand-700 px-6 py-2.5 text-control text-white transition-colors hover:bg-brand-900 w-full md:w-auto justify-center"
          >
            <Plus size={18} aria-hidden="true" />
            {copy.addNew}
          </button>
        )}
      </div>

      {showBuyers && safeCustomers.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 animate-in slide-in-from-bottom-4 md:grid-cols-3 md:gap-6">
          <KPIWidget 
            title={copy.totalBuyers}
            value={safeCustomers.length} 
            subtitle={copy.totalBuyersHint}
            state={loadState}
          />
          <KPIWidget 
            title={copy.totalOutstanding}
            value={formatKes(totalOutstanding)}
            subtitle={copy.totalOutstandingHint}
            valueColor="text-brand-dark"
            state={loadState}
          />
          <KPIWidget 
            title={copy.settledAccounts}
            value={formatCount(settledBuyersCount)} 
            subtitle={copy.settledAccountsHint}
            valueColor="text-brand" 
            state={loadState}
          />
        </div>
      )}

      <div>
        {safeCustomers.length > 0 && (
          <div className="space-y-4">
            <FilterPanel
              title={copy.filtersTitle}
              activeCount={filters.activeCount}
              onReset={filters.reset}
              resultsSummary={<p role="status" className="m-0 tabular-nums">{copy.showing(filteredCustomers.length, safeCustomers.length)}</p>}
            >
              <Toolbar>
                <ToolbarSearch label={copy.searchPlaceholder} value={searchTerm} onChange={setSearchTerm} placeholder={copy.searchPlaceholder} />
                <ToolbarSelect
                  label={copy.status}
                  value={statusFilter}
                  onChange={filters.setStatus}
                  options={BUYER_STATUSES.map((status) => [status, status === 'all' ? copy.allStatuses : financeCopy.balanceStatus[status]])}
                />
              </Toolbar>
            </FilterPanel>
            {/* An action on the chosen buyers, not a filter: above the table. */}
            {selectedCustomerIds.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={shareSelectedStatements}
                  className="inline-flex h-10 items-center justify-center rounded-button bg-brand-700 px-4 text-control tabular-nums text-white hover:bg-brand-900"
                >
                  {copy.shareSelected(selectedCustomerIds.length)}
                </button>
              </div>
            )}

            <section className="overflow-hidden rounded-card border border-slate-200 bg-white/90 backdrop-blur" aria-label={copy.tableLabel}>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1040px] border-collapse text-left">
                  <thead className="border-b border-slate-300">
                    <tr className="text-label text-slate-600">
                      <th className="w-12 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          className="h-4 w-4 rounded border-slate-400 text-brand-700 focus:ring-brand-400"
                          aria-label={copy.selectAll}
                        />
                      </th>
                      <th className="px-3 py-2.5">{copy.columns.name}</th>
                      <th className="px-3 py-2.5">{copy.columns.id}</th>
                      <th className="px-3 py-2.5">{copy.columns.phone}</th>
                      <th className="px-3 py-2.5 text-right">{copy.columns.rate}</th>
                      <th className="px-3 py-2.5 text-right">{copy.columns.balance}</th>
                      <th className="px-3 py-2.5">{copy.columns.status}</th>
                      <th className="px-4 py-2.5 text-right">{copy.columns.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCustomers.map((buyer) => {
                      const id = buyer?.id || copy.unknownId;
                      const contact = buyer?.phone_number || buyer?.contact || copy.noContact;
                      const balance = balanceOf(buyer);
                      const rate = rateOf(buyer);
                      const isSelected = selectedCustomerIds.includes(String(id));

                      return (
                        <tr key={id} className={`transition-colors hover:bg-brand-50/80 ${isSelected ? 'bg-brand-50' : ''}`}>
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCustomer(id)}
                              className="h-4 w-4 rounded border-slate-400 text-brand-700 focus:ring-brand-400"
                              aria-label={copy.select(buyer?.name || copy.buyer)}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-body-strong text-ink-900">{buyer?.name || financeCopy.statement.unnamed}</div>
                            <div className="mt-0.5 text-meta text-ink-600">{customerTypeLabel(buyer?.type)}</div>
                          </td>
                          <td className="px-3 py-2.5 text-meta tabular-nums text-ink-800">{id}</td>
                          <td className="px-3 py-2.5 text-meta tabular-nums text-ink-800">{contact}</td>
                          <td className="px-3 py-2.5 text-right text-meta tabular-nums text-ink-900">
                            {formatKes(rate)}/L
                          </td>
                          <td className="px-3 py-2.5 text-right text-meta tabular-nums text-brand">
                            {formatKes(balance)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center rounded-badge border border-brand/20 bg-brand-50 px-2 py-1 text-badge text-brand-dark">
                              {balanceStatus(balance)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-900"
                                  aria-label={copy.actionsFor(buyer?.name || copy.buyer)}
                                >
                                  <MoreVertical size={16} aria-hidden="true" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-52 rounded-card border border-slate-200 bg-white/95 p-1.5  backdrop-blur">
                                <Link
                                  to={`/finance/customers/${id}`}
                                  className="flex items-center rounded-button px-3 py-2 text-body-strong text-ink-900 hover:bg-brand-50 hover:text-brand-900"
                                >

      {copy.openStatement}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => shareCustomerStatement(buyer)}
                                  className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-left text-control text-ink-900 hover:bg-brand-50 hover:text-brand-900"
                                >

      {copy.shareWhatsApp}
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
                          <p className="text-body-strong text-ink-900">{copy.noMatchesTitle}</p>
                          <p className="mt-1 text-body text-ink-600">{copy.noMatchesHint}</p>
                          {buyerSuggestionChips}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-ink/10 md:hidden">
                {filteredCustomers.map((buyer) => {
                  const id = buyer?.id || copy.unknownId;
                  const contact = buyer?.phone_number || buyer?.contact || copy.noContact;
                  const balance = balanceOf(buyer);
                  const rate = rateOf(buyer);
                  const isSelected = selectedCustomerIds.includes(String(id));
                  return (
                    <article key={id} className={`min-w-0 space-y-3 p-4 ${isSelected ? 'bg-brand-50' : ''}`}>
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleCustomer(id)} className="mt-1 h-4 w-4 shrink-0 accent-brand" aria-label={copy.select(buyer?.name || copy.buyer)} />
                          <div className="min-w-0">
                            <p className="break-words text-body-strong text-ink">{buyer?.name || financeCopy.statement.unnamed}</p>
                            <p className="mt-0.5 text-meta text-ink-muted">{copy.typeAndId(customerTypeLabel(buyer?.type), id)}</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-badge border border-brand/20 bg-brand-50 px-2 py-1 text-badge text-brand-dark">{balanceStatus(balance)}</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink/10 pt-3 text-meta">
                        <div className="min-w-0"><dt className="text-ink-muted">{copy.agreedRate}</dt><dd className="mt-1 break-words text-body-strong text-ink tabular-nums">{formatKes(rate)}/L</dd></div>
                        <div className="min-w-0"><dt className="text-ink-muted">{copy.currentBalance}</dt><dd className="mt-1 break-words text-body-strong text-brand tabular-nums">{formatKes(balance)}</dd></div>
                      </dl>
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
                        <p className="min-w-0 flex-1 break-all text-meta text-ink-muted">{contact}</p>
                        <div className="flex shrink-0 gap-2">
                          <Link to={`/finance/customers/${id}`} className="inline-flex min-h-10 items-center rounded-button border border-brand/20 px-2.5 text-meta text-brand-dark hover:bg-brand-50">
          {copy.statement}</Link>
                          <button type="button" onClick={() => shareCustomerStatement(buyer)} className="inline-flex min-h-10 items-center rounded-button bg-brand px-2.5 text-control text-white hover:bg-brand-dark">
          {copy.whatsApp}</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {filteredCustomers.length === 0 && <div className="p-6 text-center text-body text-ink-muted"><p>{copy.noMatches}</p>{buyerSuggestionChips}</div>}
              </div>
            </section>
          </div>
        )}

        <ListLoadNotices state={loadState} label={copy.listLabel} error={customersQuery.error} onRetry={customersQuery.refetch} />
        {loadState === 'loading' && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-card border border-slate-200 border-t-[4px] border-t-brand-400 bg-white/90 p-5 backdrop-blur">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        )}

        {/* First-time empty state: only once the backend has answered with no buyers. */}
        {showBuyers && safeCustomers.length === 0 && (
          <div className="mx-auto mt-12 flex max-w-3xl animate-fade-in flex-col items-center justify-center rounded-card border border-slate-200 bg-white/90 p-12 text-center backdrop-blur">
            <h2 className="text-section-title text-ink mb-2">{copy.emptyTitle}</h2>
            <p className="text-body text-ink-muted max-w-md mb-8">
              {copy.emptyHint}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={() => setIsAddPanelOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-700 text-white px-6 py-3 rounded-button text-control hover:bg-brand-900 transition-colors"
              >
                <Plus size={18} aria-hidden="true" /> {copy.addFirst}
              </button>

            </div>

          </div>
        )}
      </div>

      {/* The Slide-Out Panel */}
      <SlidePanel 
        isOpen={isAddPanelOpen} 
        onClose={() => setIsAddPanelOpen(false)}
        title={copy.registerTitle}
        subtitle={copy.registerSubtitle}
      >
        <CustomerForm
          onSave={createCustomer}
          onCancel={() => setIsAddPanelOpen(false)}
          isSaving={isSaving}
          serverError={saveError}
        />
      </SlidePanel>
    </div>
  );
}
