import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, ImagePlus, Minus, Paperclip, PencilLine, Plus, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../contexts/AuthContext';
import { hasRole } from '../../lib/roles';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { offlineFailureMessage } from '../../lib/offlinePolicy';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { todayLocalIso } from '../../lib/localDate';
import { formatDate } from '../../lib/dateFormat';
import { CardSkeletons, ListLoadMessage, SlowLoadingHint, StaleDataNotice, TableSkeletonRows } from '../../components/ui/ListLoadState';
import { getListLoadState } from '../../lib/listLoadState';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import Money from '../../components/ui/Money';
import OverflowMenu from '../../components/ui/OverflowMenu';
import ReceiptPreview from '../../components/finance/ReceiptPreview';
import LedgerEntryFormModal from '../../components/finance/LedgerEntryFormModal';
import LedgerCorrectionModal from '../../components/finance/LedgerCorrectionModal';
import ReceiptPhotosModal from '../../components/finance/ReceiptPhotosModal';
import { downloadReceiptPdf, shareReceiptText } from '../../lib/receipt';
import PageHeader from '../../components/layout/PageHeader';
import DataSection from '../../components/data/DataSection';
import { TableHead, cellClass } from '../../components/data/DataTable';
import { FilterChips, ResultCount, Toolbar, ToolbarSearch, ToolbarSelect } from '../../components/data/Toolbar';
import PeriodSummary from '../../components/periods/PeriodSummary';
import PeriodControl from '../../components/periods/PeriodControl';
import PeriodChart from '../../components/periods/PeriodChart';
import GroupedList from '../../components/periods/GroupedList';
import { ledgerGroupConfig, ledgerSummaryConfig } from '../../components/periods/periodConfigs';
import { useInvalidateLedger, useLedgerGroupTotals, useLedgerSummary, usePeriodSelection } from '../../hooks/usePeriodTotals';
import { CUSTOM_PERIOD, toTotalsParams } from '../../lib/periodTotals';
import { correctionKind } from '../../lib/ledgerCorrection';
import { readAttachments } from '../../lib/receiptAttachments';

const EMPTY_FILTERS = { search: '', type: 'all', category: 'all' };
const TYPE_OPTIONS = [['all', 'All types'], ['revenue', 'Money in'], ['expense', 'Money out']];
const TYPE_LABELS = Object.fromEntries(TYPE_OPTIONS);

// Bank-statement order. Each record fills Money in or Money out, never both.
// Fixed widths fit nine columns in a 1280px window; Description takes what's left.
const COLUMNS = [
  { id: 'date', header: 'Date', width: 'w-[5.75rem]' },
  { id: 'party', header: 'Customer/Supplier', width: 'w-[8.5rem]' },
  { id: 'category', header: 'Category', width: 'w-[6.75rem]' },
  { id: 'description', header: 'Description' },
  { id: 'ref', header: 'Ref', width: 'w-[5.75rem]' },
  { id: 'money_in', header: 'Money in', align: 'right', mono: true, width: 'w-[7.5rem]' },
  { id: 'money_out', header: 'Money out', align: 'right', mono: true, width: 'w-[7.5rem]' },
  { id: 'status', header: 'Status', width: 'w-[4.75rem]' },
  { id: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 'w-[5.25rem]' },
];
const column = Object.fromEntries(COLUMNS.map((entry) => [entry.id, entry]));

/** 'in' or 'out' from the record's own type; null when the API sent neither. */
const directionOf = (tx) => {
  const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
  if (type === 'revenue' || type === 'income') return 'in';
  if (type === 'expense') return 'out';
  return null;
};
const partyOf = (tx) => tx.counterparty_name || tx.customer_name || tx.buyer_name || '—';
const descriptionOf = (tx) => [tx.item_name, tx.description].filter(Boolean).join(' · ');
const getBucket = (tx) => tx.bucket;

const StatusBadge = ({ status }) => {
  if (!status) return <span className="text-xs text-ink-muted">—</span>;
  const text = String(status).toLowerCase().replace(/_/g, ' ');
  const voided = ['voided', 'void', 'cancelled'].includes(text);
  return (
    <span className={`inline-flex max-w-full items-center rounded-badge border border-ink/10 bg-ink-50 px-1.5 py-0.5 text-[11px] font-medium capitalize ${voided ? 'text-ink-muted line-through' : 'text-ink'}`}>
      <span className="truncate">{text}</span>
    </span>
  );
};

// Paperclip = receipt photos saved; image-plus = none yet (and the farmer may add one).
// Different shapes, so the state never rests on colour or fill alone.
const ReceiptClip = ({ transaction, canUpload, onOpen, size = 'h-8 w-8' }) => {
  const count = readAttachments(transaction).length;
  if (!count && !canUpload) return <span aria-hidden="true" className={`inline-block ${size}`} />;
  const label = count ? `Receipt photos (${count})` : 'Add receipt photo';
  return (
    <button type="button" onClick={() => onOpen(transaction)} aria-label={label} title={label} className={`relative inline-flex ${size} shrink-0 items-center justify-center !rounded-input hover:bg-ink-50 ${count ? 'text-ink' : 'text-ink-muted'}`}>
      {count ? <Paperclip size={15} aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}
      {count > 1 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 font-sans text-[9px] font-semibold">{count}</span>}
    </button>
  );
};

const FinancialLedger = () => {
  const { tenantId, farmId } = useTenant();
  const { currentUser } = useAuth();
  const invalidateLedger = useInvalidateLedger();
  const categories = useLedgerCategories(tenantId, farmId);
  const [groupFocus, setGroupFocus] = useState(null);
  const [ledgerFilters, setLedgerFilters] = useState(EMPTY_FILTERS);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [modalTransactionType, setModalTransactionType] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptDownloading, setIsReceiptDownloading] = useState(false);
  const [transactionToCorrect, setTransactionToCorrect] = useState(null);
  const [photosFor, setPhotosFor] = useState(null);
  // The backend lets the owner correct entries, and the owner or farm hands keep receipts.
  const canCorrect = hasRole(currentUser, ['FARMER']);
  const canUploadReceipts = hasRole(currentUser, ['FARMER', 'FARM_HAND']);
  const correctableAs = (tx) => (canCorrect ? correctionKind(tx) : null);
  const searchQuery = ledgerFilters.search.trim();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  // Type, category and search run on the server for rows, group headers and the summary.
  const serverFilters = useMemo(() => ({
    type: ledgerFilters.type,
    category: ledgerFilters.category,
    search: debouncedSearchQuery,
  }), [ledgerFilters.type, ledgerFilters.category, debouncedSearchQuery]);

  // The period is the page's one date control. The table follows the range the API
  // resolved for it (or the farmer's custom range); no dates are worked out here.
  const { period, anchor, customRange, setPeriod, setCustomRange, step } = usePeriodSelection('ledger');
  const periodSummary = useLedgerSummary({ period, anchor, customRange, filters: serverFilters });
  const summary = periodSummary.data;
  const tableRange = period === CUSTOM_PERIOD ? customRange : summary?.range ?? null;
  // If the period can't load, the list still loads (undated) and says so.
  const periodUnavailable = !summary && (periodSummary.loadState === 'error' || periodSummary.loadState === 'offline');
  const tableReady = Boolean(tableRange) || periodUnavailable;
  const tableParams = useMemo(() => ({
    ...toTotalsParams(serverFilters),
    ...(tableRange ? { date_from: tableRange.from, date_to: tableRange.to } : {}),
  }), [serverFilters, tableRange]);

  const groupTotals = useLedgerGroupTotals(tableParams, { levels: ledgerGroupConfig.levels, enabled: tableReady });
  const { data, error, refetch, status: ledgerStatus, fetchStatus: ledgerFetchStatus } = useQuery({
    queryKey: [...QUERY_KEYS.LEDGER_ENTRIES(tenantId, farmId), tableParams],
    // The ledger endpoint needs the scope as query parameters for the farm-wide view.
    queryFn: () => financeApi.listLedgerEntries({
      per_page: 100,
      farm_id: farmId,
      tenant_id: tenantId,
      ...tableParams,
      // The list historically read `search_query`; the contract names it `search`.
      ...(debouncedSearchQuery ? { search_query: debouncedSearchQuery } : {}),
    }),
    enabled: Boolean(tenantId && farmId && tableReady),
    placeholderData: keepPreviousData,
  });
  // All-time balances: never narrowed by the period or the filters.
  const { data: balancesData } = useQuery({
    queryKey: [...QUERY_KEYS.LEDGER_ENTRIES(tenantId, farmId), 'balances'],
    queryFn: () => financeApi.getLedgerBalances({ farm_id: farmId, tenant_id: tenantId }),
    enabled: Boolean(tenantId && farmId),
  });
  const balances = { owed: balancesData?.outstanding_receivables ?? null, credit: balancesData?.customer_credit ?? null };

  const ledgerLoadState = getListLoadState({ status: ledgerStatus, fetchStatus: ledgerFetchStatus, data });
  const isLoading = ledgerLoadState === 'loading';
  const isListUnavailable = ledgerLoadState === 'offline' || ledgerLoadState === 'error';
  const transactions = useMemo(() => data?.items || [], [data]);
  const resultCount = data?.meta?.total ?? null;
  const groupsUnavailable = groupTotals.loadState === 'error' || groupTotals.loadState === 'offline';

  const categoryOptions = useMemo(() => {
    const options = ledgerFilters.type === 'revenue' ? categories.income
      : ledgerFilters.type === 'expense' ? categories.expense
        : [...categories.income, ...categories.expense];
    return [['all', 'All categories'], ...new Map(options).entries()];
  }, [categories.income, categories.expense, ledgerFilters.type]);
  const categoryLabel = Object.fromEntries(categoryOptions)[ledgerFilters.category] ?? ledgerFilters.category;

  const setFilter = (name, value) => setLedgerFilters((current) => ({ ...current, [name]: value, ...(name === 'type' ? { category: 'all' } : {}) }));
  const chips = [
    searchQuery && { key: 'search', label: `“${searchQuery}”`, onRemove: () => setFilter('search', '') },
    ledgerFilters.type !== 'all' && { key: 'type', label: TYPE_LABELS[ledgerFilters.type], onRemove: () => setFilter('type', 'all') },
    ledgerFilters.category !== 'all' && { key: 'category', label: categoryLabel, onRemove: () => setFilter('category', 'all') },
  ].filter(Boolean);
  const hasActiveFilters = chips.length > 0;

  const correctionMutation = useMutation({
    mutationFn: ({ transactionId, payload }) => financeApi.correctTransaction(transactionId, payload),
    onSuccess: (result, { kind }) => {
      invalidateLedger();
      setTransactionToCorrect(null);
      toast.success(kind === 'income'
        ? 'Income corrected. The original entry and its receipt are voided.'
        : 'Expense corrected. The original entry is now voided.');
    },
    // Shown inside the form, which stays open so the owner can adjust and retry.
  });
  const correctionError = correctionMutation.isError
    ? (offlineFailureMessage(correctionMutation.error, 'Nothing was changed.') || getApiErrorMessage(correctionMutation.error, 'Nothing was changed. Try again.'))
    : null;
  const openCorrection = (tx) => {
    correctionMutation.reset();
    setTransactionToCorrect(tx);
  };

  const openReceipt = async (transaction) => {
    if (!transaction.receipt_available || !transaction.receipt?.id) return;
    try {
      setSelectedReceipt(await financeApi.getReceipt(transaction.receipt.id));
    } catch (receiptError) {
      toast.error(getApiErrorMessage(receiptError));
    }
  };
  const handleDownloadReceipt = async () => {
    setIsReceiptDownloading(true);
    try {
      downloadReceiptPdf(selectedReceipt, await financeApi.downloadReceiptPdf(selectedReceipt.id));
    } catch (receiptError) {
      toast.error(getApiErrorMessage(receiptError));
    } finally {
      setIsReceiptDownloading(false);
    }
  };
  const handleShareReceipt = async () => {
    try {
      await shareReceiptText(selectedReceipt);
      toast.success(navigator.share ? 'Receipt shared.' : 'Receipt copied.');
    } catch (receiptError) {
      if (receiptError?.name !== 'AbortError') toast.error('Could not share receipt.');
    }
  };

  const toggleExpanded = (id) => setExpandedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const menuFor = (tx, size) => {
    const photoCount = readAttachments(tx).length;
    return (
      <OverflowMenu
        label={`Actions for ${partyOf(tx)}, ${formatDate(tx.date, 'no date')}`}
        size={size}
        items={[
          tx.receipt_available && tx.receipt?.id && { key: 'receipt', label: 'View receipt', icon: ReceiptText, onSelect: () => openReceipt(tx) },
          (photoCount || canUploadReceipts) && { key: 'photos', label: photoCount ? `Photos (${photoCount})` : 'Add photo', icon: Paperclip, onSelect: () => setPhotosFor(tx) },
          correctableAs(tx) && { key: 'correct', label: 'Correct', icon: PencilLine, onSelect: () => openCorrection(tx) },
        ]}
      />
    );
  };

  const amountCell = (tx, direction) => (directionOf(tx) === direction
    ? <Money amount={tx.amount} size="sm" className="font-semibold text-ink" />
    : null);

  // Desktop row, 44px. The full description and reference open in the row detail.
  const renderRow = (tx) => {
    const description = descriptionOf(tx);
    const expanded = expandedIds.has(tx.id);
    const detailId = `ledger-detail-${tx.id}`;
    return [
      <tr key={tx.id} className="h-11 border-b border-ink/5 hover:bg-ink-50/60">
        <td className={cellClass(column.date, '!py-0 whitespace-nowrap')}><span className="text-xs text-ink-muted">{formatDate(tx.date, '—')}</span></td>
        <td className={cellClass(column.party, '!py-0')}><span className="block truncate text-sm font-medium text-ink" title={partyOf(tx)}>{partyOf(tx)}</span></td>
        <td className={cellClass(column.category, '!py-0')}><span className="block truncate text-xs text-ink-muted" title={tx.category || undefined}>{tx.category || '—'}</span></td>
        <td className={cellClass(column.description, '!py-0')}>
          <button
            type="button"
            onClick={() => toggleExpanded(tx.id)}
            aria-expanded={expanded}
            aria-controls={detailId}
            title={description || undefined}
            className="flex w-full min-w-0 items-center gap-1 !rounded-none text-left text-sm font-normal"
          >
            <span className="min-w-0 truncate">
              {tx.item_name && <span className="font-medium text-ink">{tx.item_name}</span>}
              {tx.item_name && tx.description && <span className="text-ink-muted"> · </span>}
              <span className="text-ink-muted">{tx.description || (tx.item_name ? '' : '—')}</span>
            </span>
            <ChevronDown size={13} aria-hidden="true" className={`ml-auto shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
        <td className={cellClass(column.ref, '!py-0')}><span className="block truncate text-[11px] text-ink-muted" title={tx.reference_code || undefined}>{tx.reference_code || '—'}</span></td>
        <td className={cellClass(column.money_in, '!py-0 whitespace-nowrap')}>{amountCell(tx, 'in')}</td>
        <td className={cellClass(column.money_out, '!py-0 whitespace-nowrap')}>{amountCell(tx, 'out')}</td>
        <td className={cellClass(column.status, '!py-0')}><StatusBadge status={tx.status} /></td>
        <td className={cellClass(column.actions, '!py-0')}>
          <div className="flex items-center justify-end gap-0.5">
            <ReceiptClip transaction={tx} canUpload={canUploadReceipts} onOpen={setPhotosFor} />
            {menuFor(tx, 'h-8 w-8')}
          </div>
        </td>
      </tr>,
      expanded && (
        <tr key={`${tx.id}-detail`} id={detailId} className="border-b border-ink/5 bg-ink-50/60">
          <td colSpan={COLUMNS.length} className="px-4 !py-3 !font-sans">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0"><dt className="text-xs text-ink-muted">Description</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-ink">{description || '—'}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-ink-muted">Reference</dt><dd className="mt-0.5 break-all text-ink">{tx.reference_code || '—'}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-ink-muted">Category</dt><dd className="mt-0.5 break-words text-ink">{tx.category || '—'}</dd></div>
            </dl>
          </td>
        </tr>
      ),
    ];
  };

  // Phone card inside a day group: no repeated date; actions in ⋮.
  const renderCard = (tx) => {
    const direction = directionOf(tx);
    const description = descriptionOf(tx);
    const expanded = expandedIds.has(tx.id);
    return (
      <article key={tx.id} className="min-w-0 space-y-1 bg-card py-2 pl-3 pr-1">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-sm font-semibold text-ink">{partyOf(tx)}</p>
            <p className="truncate text-xs text-ink-muted">
              {tx.category || '—'}{tx.reference_code ? <> · <span>{tx.reference_code}</span></> : null}
            </p>
          </div>
          <div className="shrink-0 pt-1 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{direction === 'in' ? 'Money in' : direction === 'out' ? 'Money out' : 'Amount'}</p>
            <Money amount={tx.amount} size="sm" className="font-semibold text-ink" />
          </div>
          <div className="flex shrink-0 items-center">
            <ReceiptClip transaction={tx} canUpload={canUploadReceipts} onOpen={setPhotosFor} size="h-11 w-11" />
            {menuFor(tx, 'h-11 w-11')}
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-2 pr-2">
          {description ? (
            <button type="button" onClick={() => toggleExpanded(tx.id)} aria-expanded={expanded} className={`min-h-6 min-w-0 flex-1 !rounded-none text-left text-xs font-normal text-ink-muted ${expanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
              {description}
            </button>
          ) : <span className="flex-1" />}
          <StatusBadge status={tx.status} />
        </div>
      </article>
    );
  };

  const openForm = (type) => setModalTransactionType(type);
  const addActions = (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => openForm('income')} className="btn-command min-h-11 gap-2 px-4 text-sm"><Plus size={16} aria-hidden="true" /> Log income</button>
      <button type="button" onClick={() => openForm('expense')} className="btn-secondary min-h-11 gap-2 px-4 text-sm"><Minus size={16} aria-hidden="true" /> Log expense</button>
    </div>
  );
  const emptyMessage = hasActiveFilters
    ? 'No records match these filters for this period.'
    : (
      <div className="flex flex-col items-center gap-3">
        <p>No records for this period. Record milk sales, payments and costs to see your profit.</p>
        {addActions}
      </div>
    );

  const groupedListProps = {
    records: transactions,
    getBucket,
    groups: groupTotals.data,
    groupsUnavailable,
    onRetryGroups: groupTotals.refetch,
    config: ledgerGroupConfig,
    focus: groupFocus,
  };

  const scopeNote = hasActiveFilters ? `Filtered: ${chips.map((chip) => chip.label).join(' · ')}` : null;

  return (
    <div className="mx-auto max-w-7xl animate-reveal space-y-4">
      <PageHeader
        title="Ledger"
        primaryAction={{ label: 'Log income', icon: Plus, onClick: () => openForm('income') }}
        secondaryActions={[{ key: 'expense', label: 'Log expense', icon: Minus, onClick: () => openForm('expense') }]}
      />

      <PeriodSummary
        title="Money in and out"
        control={(
          <PeriodControl
            period={period}
            label={summary?.label}
            onPeriodChange={setPeriod}
            onPrevious={() => step(summary?.range, -1)}
            onNext={() => step(summary?.range, 1)}
            canGoPrevious={Boolean(summary?.range)}
            canGoNext={Boolean(summary?.range) && summary.hasNext}
            customRange={customRange}
            onCustomRange={setCustomRange}
            maxDate={todayLocalIso()}
          />
        )}
        scopeNote={scopeNote}
        loadState={periodSummary.loadState}
        hasData={Boolean(summary)}
        isEmpty={summary?.current?.count === 0}
        error={periodSummary.error}
        asOf={periodSummary.asOf}
        onRetry={periodSummary.refetch}
        metrics={summary ? ledgerSummaryConfig.metrics(summary) : []}
        secondary={summary ? ledgerSummaryConfig.secondary(summary, balances) : []}
        emptyMessage={summary && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{ledgerSummaryConfig.emptyMessage(summary)}</span>
            {addActions}
          </div>
        )}
        chart={summary && (
          <PeriodChart
            label={`Money in and out by sub-period, ${summary.label ?? ''}`}
            items={summary.breakdown}
            {...ledgerSummaryConfig.chart}
            onSelect={(key) => setGroupFocus({ key, nonce: Date.now() })}
          />
        )}
      />

      <DataSection
        label="Ledger records"
        toolbar={(
          <Toolbar end={<ResultCount count={resultCount} noun={['record', 'records']} />}>
            <ToolbarSearch label="Search records" value={ledgerFilters.search} onChange={(value) => setFilter('search', value)} placeholder="Search customer, item, reference…" />
            <ToolbarSelect label="Type" value={ledgerFilters.type} onChange={(value) => setFilter('type', value)} options={TYPE_OPTIONS} />
            <ToolbarSelect label="Category" value={ledgerFilters.category} onChange={(value) => setFilter('category', value)} options={categoryOptions} />
            <FilterChips chips={chips} onReset={() => setLedgerFilters(EMPTY_FILTERS)} />
          </Toolbar>
        )}
        notices={(
          <>
            {isLoading && <SlowLoadingHint label="transactions" />}
            {periodUnavailable && (
              <p role="status" className="border-b border-ink/10 bg-ink-50 px-4 py-2 text-xs text-ink-muted">
                The period couldn’t load, so this list shows every date.
              </p>
            )}
            {data?.summary_scope?.typo_matched && (
              <p role="status" className="border-b border-ink/10 bg-ink-50 px-4 py-2 text-sm text-ink">
                No exact match for “{data.summary_scope.search_query}”. Showing results for {data.summary_scope.matched_names?.join(', ')}.
              </p>
            )}
            {ledgerLoadState === 'stale' && <StaleDataNotice label="transactions" error={error} onRetry={refetch} />}
          </>
        )}
      >
        <div className="hidden xl:block">
          <table className="w-full table-fixed border-collapse text-left">
            <TableHead columns={COLUMNS} />
            <tbody className="bg-card">
              {isLoading ? (
                <TableSkeletonRows columns={COLUMNS.length} />
              ) : isListUnavailable ? (
                <tr><td colSpan={COLUMNS.length}><ListLoadMessage state={ledgerLoadState} label="transactions" error={error} onRetry={refetch} /></td></tr>
              ) : transactions.length > 0 ? (
                <GroupedList {...groupedListProps} variant="table" columns={COLUMNS} renderRecord={renderRow} />
              ) : (
                <tr><td colSpan={COLUMNS.length} className="p-10 text-center text-sm text-ink-muted !font-sans">{emptyMessage}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="xl:hidden">
          {isLoading ? <div className="divide-y divide-ink/10"><CardSkeletons /></div>
            : isListUnavailable ? <ListLoadMessage state={ledgerLoadState} label="transactions" error={error} onRetry={refetch} />
              : transactions.length > 0 ? <GroupedList {...groupedListProps} variant="cards" renderRecord={renderCard} />
                : <div className="p-6 text-center text-sm text-ink-muted">{emptyMessage}</div>}
        </div>
      </DataSection>

      {modalTransactionType && (
        <LedgerEntryFormModal
          key={modalTransactionType}
          onClose={() => setModalTransactionType(null)}
          transactionType={modalTransactionType}
          farmId={farmId}
          tenantId={tenantId}
        />
      )}

      {transactionToCorrect && correctableAs(transactionToCorrect) && (
        <LedgerCorrectionModal
          kind={correctableAs(transactionToCorrect)}
          transaction={transactionToCorrect}
          onClose={() => setTransactionToCorrect(null)}
          onSubmit={(payload) => correctionMutation.mutate({ transactionId: transactionToCorrect.id, payload, kind: correctableAs(transactionToCorrect) })}
          isPending={correctionMutation.isPending}
          error={correctionError}
          tenantId={tenantId}
          farmId={farmId}
        />
      )}

      {photosFor && (
        <ReceiptPhotosModal
          transaction={transactions.find((tx) => tx.id === photosFor.id) ?? photosFor}
          title={[photosFor.item_name || photosFor.description || photosFor.category, photosFor.reference_code].filter(Boolean).join(' · ')}
          canUpload={canUploadReceipts}
          onClose={() => setPhotosFor(null)}
          onUploaded={invalidateLedger}
        />
      )}

      {selectedReceipt && (
        <ReceiptPreview
          receipt={selectedReceipt}
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          onDownload={handleDownloadReceipt}
          onShare={handleShareReceipt}
          isDownloading={isReceiptDownloading}
        />
      )}
    </div>
  );
};

export default FinancialLedger;
