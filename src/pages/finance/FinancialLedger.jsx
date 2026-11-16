import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, Minus, Paperclip, PencilLine, Plus, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../contexts/AuthContext';
import { hasRole } from '../../lib/roles';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { offlineFailureMessage } from '../../lib/offlinePolicy';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { todayLocalIso } from '../../lib/localDate';
import { formatDate } from '../../lib/dateFormat';
import Money from '../../components/ui/Money';
import OverflowMenu from '../../components/ui/OverflowMenu';
import ReceiptPreview from '../../components/finance/ReceiptPreview';
import LedgerEntryFormModal from '../../components/finance/LedgerEntryFormModal';
import LedgerCorrectionModal from '../../components/finance/LedgerCorrectionModal';
import ReceiptPhotosModal from '../../components/finance/ReceiptPhotosModal';
import { downloadReceiptPdf, shareReceiptText } from '../../lib/receipt';
import PageHeader from '../../components/layout/PageHeader';
import DataSection from '../../components/data/DataSection';
import { cellClass } from '../../components/data/DataTable';
import GroupedDataTable from '../../components/data/GroupedDataTable';
import SummaryStrip from '../../components/data/SummaryStrip';
import ToolbarDateRange from '../../components/data/ToolbarDateRange';
import { FilterChips, ResultCount, Toolbar, ToolbarSearch, ToolbarSelect } from '../../components/data/Toolbar';
import { ledgerGroupConfig, ledgerSummaryConfig, summaryIsEmpty, summaryNotice, summaryScope } from '../../components/periods/periodConfigs';
import { useInvalidateLedger } from '../../hooks/usePeriodTotals';
import { useLedgerData } from '../../hooks/useLedgerData';
import { formatDateRange } from '../../lib/dateFormat';
import { currentYearRange } from '../../lib/periodTotals';
import { ledgerCopy } from '../../i18n/ledger';
import { correctionKind } from '../../lib/ledgerCorrection';
import { readAttachments } from '../../lib/receiptAttachments';
import { ISO_DATE_FILTER, useUrlFilters } from '../../hooks/useUrlFilters';

// Type, category and the date range live in the address, so other pages can link to a
// filtered view (e.g. /finance/ledger?from=2026-11-01&to=2026-11-30). Search stays in the
// page: it can hold a customer's name or phone number, which never go in a URL.
const URL_FILTERS = { type: 'all', category: 'all', from: '', to: '' };
const URL_FILTER_VALUES = { type: ['all', 'revenue', 'expense'], from: ISO_DATE_FILTER, to: ISO_DATE_FILTER };

/** The address's range when it is complete and in order (ISO dates compare as text); else null. */
const rangeFrom = ({ from, to }) => (from && to && from <= to ? { from, to } : null);
const TYPE_OPTIONS = [['all', 'All types'], ['revenue', 'Money in'], ['expense', 'Money out']];
const TYPE_LABELS = Object.fromEntries(TYPE_OPTIONS);

// Fixed widths for every column but Description, which takes what's left, so nothing moves
// when groups open and close. At 1280px Customer / Supplier and Ref fit without truncating.
// The day group row carries the date, so rows don't repeat it. Headers are read at render
// so they follow the language.
const COLUMN_LAYOUT = [
  { id: 'party', width: 'w-[13rem]' },
  { id: 'category', width: 'w-[8rem]' },
  { id: 'ref', width: 'w-[8rem]' },
  { id: 'description' },
  { id: 'amount', align: 'right', mono: true, width: 'w-[8rem]' },
  { id: 'status', width: 'w-[5.5rem]' },
  { id: 'actions', align: 'right', width: 'w-[3.5rem]', srOnly: true },
];
const column = Object.fromEntries(COLUMN_LAYOUT.map((entry) => [entry.id, entry]));

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

/** The amount signed by the entry's own type: income as is, an expense negative; null if unknown. */
const signedAmount = (tx) => {
  const amount = Number(tx.amount);
  const direction = directionOf(tx);
  if (!direction || tx.amount === null || tx.amount === undefined || !Number.isFinite(amount)) return null;
  return direction === 'out' ? -Math.abs(amount) : amount;
};

// Posted is the normal state, so only other statuses get a badge.
const StatusBadge = ({ status }) => {
  if (!status) return <span className="text-xs text-ink-muted">—</span>;
  const text = String(status).toLowerCase().replace(/_/g, ' ');
  if (text === 'posted') return null;
  const voided = ['voided', 'void', 'cancelled'].includes(text);
  return (
    <span className={`inline-flex max-w-full items-center rounded-badge border border-ink/10 bg-ink-50 px-1.5 py-0.5 text-[11px] font-medium capitalize ${voided ? 'text-ink-muted line-through' : 'text-ink'}`}>
      <span className="truncate">{text}</span>
    </span>
  );
};

const FinancialLedger = () => {
  const { tenantId, farmId } = useTenant();
  const { currentUser } = useAuth();
  const invalidateLedger = useInvalidateLedger();
  const categories = useLedgerCategories(tenantId, farmId);
  const { filters: urlFilters, setFilters: setUrlFilters, resetFilters: resetUrlFilters } = useUrlFilters(URL_FILTERS, { allowed: URL_FILTER_VALUES });
  const [search, setSearch] = useState('');
  const ledgerFilters = { ...urlFilters, search };
  // The table and the strip open on the current year (1 Jan to today); a range in the
  // address replaces it, and removing that range goes back to the year.
  const chosenRange = rangeFrom(urlFilters);
  const range = chosenRange ?? currentYearRange(todayLocalIso());
  const COLUMNS = COLUMN_LAYOUT.map((entry) => ({
    ...entry,
    header: entry.srOnly ? <span className="sr-only">{ledgerCopy.columns[entry.id]}</span> : ledgerCopy.columns[entry.id],
  }));
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

  // One hook requests the rows, the group totals and the summary strip with the same
  // filters and date range, so the strip always sums up exactly what the table shows.
  const { rows, groupTotals, summary: ledgerSummary } = useLedgerData({
    filters: { type: ledgerFilters.type, category: ledgerFilters.category, search: debouncedSearchQuery },
    range,
  });
  const summary = ledgerSummary.data;
  const transactions = rows.items;
  const groupsUnavailable = groupTotals.loadState === 'error' || groupTotals.loadState === 'offline';

  const categoryOptions = (() => {
    const options = ledgerFilters.type === 'revenue' ? categories.income
      : ledgerFilters.type === 'expense' ? categories.expense
        : [...categories.income, ...categories.expense];
    return [['all', 'All categories'], ...new Map(options).entries()];
  })();
  const categoryLabel = Object.fromEntries(categoryOptions)[ledgerFilters.category] ?? ledgerFilters.category;

  const setFilter = (name, value) => {
    if (name === 'search') setSearch(value);
    else setUrlFilters({ [name]: value, ...(name === 'type' ? { category: 'all' } : {}) });
  };
  const setRange = (next) => setUrlFilters({ from: next?.from ?? '', to: next?.to ?? '' });
  const chips = [
    searchQuery && { key: 'search', label: `“${searchQuery}”`, onRemove: () => setFilter('search', '') },
    chosenRange && { key: 'range', label: formatDateRange(chosenRange.from, chosenRange.to), onRemove: () => setRange(null) },
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

  // Income plain, expenses negative in the negative colour; the header names the currency.
  const amountCell = (tx) => {
    const amount = signedAmount(tx);
    return amount === null
      ? <span className="text-xs text-ink-muted">—</span>
      : <Money amount={amount} size="sm" tone="signed" showCurrency={false} className="font-semibold" />;
  };

  // Desktop row, 44px. The full description and reference open in the row detail.
  const renderRow = (tx) => {
    const description = descriptionOf(tx);
    const expanded = expandedIds.has(tx.id);
    const detailId = `ledger-detail-${tx.id}`;
    return [
      <tr key={tx.id} className="h-11 border-b border-ink/5 hover:bg-ink-50/60">
        <td className={cellClass(column.party, '!py-0')}><span className="block truncate text-sm font-medium text-ink" title={partyOf(tx)}>{partyOf(tx)}</span></td>
        <td className={cellClass(column.category, '!py-0')}><span className="block truncate text-xs text-ink-muted" title={tx.category || undefined}>{tx.category || '—'}</span></td>
        <td className={cellClass(column.ref, '!py-0')}><span className="block truncate text-[11px] text-ink-muted" title={tx.reference_code || undefined}>{tx.reference_code || '—'}</span></td>
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
        <td className={cellClass(column.amount, '!py-0 whitespace-nowrap')}>{amountCell(tx)}</td>
        <td className={cellClass(column.status, '!py-0')}><StatusBadge status={tx.status} /></td>
        <td className={cellClass(column.actions, '!py-0')}>{menuFor(tx, 'h-8 w-8')}</td>
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
            {signedAmount(tx) === null
              ? <Money amount={tx.amount} size="sm" className="font-semibold" />
              : <Money amount={signedAmount(tx)} size="sm" tone="signed" className="font-semibold" />}
          </div>
          <div className="flex shrink-0 items-center">{menuFor(tx, 'h-11 w-11')}</div>
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
    ? 'No records match these filters.'
    : (
      <div className="flex flex-col items-center gap-3">
        <p>No records yet. Record milk sales, payments and costs to see your profit.</p>
        {addActions}
      </div>
    );

  // The dashboard opens on the same dates as the ledger.
  const reportLink = `/operations/reports?period=custom&start_date=${range.from}&end_date=${range.to}`;
  // "No records" only when the table is empty too (the strip and table share filters and dates).
  const tableIsEmpty = (rows.loadState === 'ready' || rows.loadState === 'stale') && transactions.length === 0;

  return (
    <div className="mx-auto max-w-7xl animate-reveal space-y-4">
      <PageHeader
        title="Ledger"
        primaryAction={{ label: 'Log income', icon: Plus, onClick: () => openForm('income') }}
        secondaryActions={[{ key: 'expense', label: 'Log expense', icon: Minus, onClick: () => openForm('expense') }]}
      />

      <SummaryStrip
        label="Money in and out"
        items={summary ? ledgerSummaryConfig.items(summary) : []}
        scope={summaryScope(range, { isDefault: !chosenRange })}
        empty={summaryIsEmpty(summary) && tableIsEmpty && 'No records'}
        notice={summaryNotice(ledgerSummary)}
        link={{ to: reportLink }}
        loadState={ledgerSummary.loadState}
        hasData={Boolean(summary)}
        error={ledgerSummary.error}
        asOf={ledgerSummary.asOf}
        onRetry={ledgerSummary.refetch}
      />

      <DataSection
        label="Ledger records"
        toolbar={(
          <Toolbar end={<ResultCount count={rows.total} noun={['record', 'records']} />}>
            <ToolbarSearch label="Search records" value={ledgerFilters.search} onChange={(value) => setFilter('search', value)} placeholder="Search customer, item, reference…" />
            <ToolbarSelect label="Type" value={ledgerFilters.type} onChange={(value) => setFilter('type', value)} options={TYPE_OPTIONS} />
            <ToolbarSelect label="Category" value={ledgerFilters.category} onChange={(value) => setFilter('category', value)} options={categoryOptions} />
            <ToolbarDateRange range={range} onChange={setRange} maxDate={todayLocalIso()} />
            <FilterChips chips={chips} onReset={() => { setSearch(''); resetUrlFilters(); }} />
          </Toolbar>
        )}
        notices={rows.searchScope?.typo_matched && (
          <p role="status" className="border-b border-ink/10 bg-ink-50 px-4 py-2 text-sm text-ink">
            No exact match for “{rows.searchScope.search_query}”. Showing results for {rows.searchScope.matched_names?.join(', ')}.
          </p>
        )}
      >
        <GroupedDataTable
          columns={COLUMNS}
          rows={transactions}
          getBucket={getBucket}
          groups={groupTotals.data}
          groupsUnavailable={groupsUnavailable}
          onRetryGroups={groupTotals.refetch}
          config={ledgerGroupConfig}
          renderRow={renderRow}
          renderCard={renderCard}
          loadState={rows.loadState}
          error={rows.error}
          onRetry={rows.refetch}
          rowsLabel="transactions"
          empty={emptyMessage}
        />
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
