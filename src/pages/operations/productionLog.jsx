import { useQuery } from "@tanstack/react-query";
import { useTenant } from "../../hooks/useTenant";
import { useAuth } from "../../contexts/AuthContext";
import { canViewAdminControls } from "../../lib/roles";
import { QUERY_KEYS } from "../../providers/QueryProvider";
import { getApiErrorMessage, productionApi, safetyApi } from "../../lib/backendApi";
import { Plus, AlertTriangle, ShieldCheck, SlidersHorizontal, Pencil, Trash2, Baby } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import FastMilkLog from "../../components/operations/FastMilkLog";
import QueuedMilkEntries from "../../components/operations/QueuedMilkEntries";
import CalfMilkFeedModal from "../../components/operations/CalfMilkFeedModal";
import RecentCalfFeedings from "../../components/operations/RecentCalfFeedings";
import Confirmation, { useConfirmation } from "../../components/ui/Confirmation";
import PageHeader from "../../components/layout/PageHeader";
import DataSection from "../../components/data/DataSection";
import { SURFACE } from "../../components/data/surface";
import { cellClass } from "../../components/data/DataTable";
import GroupedDataTable from "../../components/data/GroupedDataTable";
import SummaryStrip from "../../components/data/SummaryStrip";
import { FilterChips, ResultCount, Toolbar, ToolbarSearch } from "../../components/data/Toolbar";
import OverflowMenu from "../../components/ui/OverflowMenu";
import ToolbarDateRange from "../../components/data/ToolbarDateRange";
import { productionGroupConfig, productionSummaryConfig, summaryIsEmpty, summaryScope } from "../../components/periods/periodConfigs";
import { useInvalidateProduction } from "../../hooks/usePeriodTotals";
import { useProductionData } from "../../hooks/useProductionData";
import { formatLitres } from "../../lib/numberFormat";
import { currentMonthRange } from "../../lib/periodTotals";
import { formatDateRange } from "../../lib/dateFormat";
import toast from "react-hot-toast";
import { productionCopy as copy, sessionLabel } from "../../i18n/production";
import { commonCopy } from "../../i18n/common";
import { formatDate } from "../../lib/herdUtils";
import { formatCowIdentity } from "../../lib/cowIdentity";
import { Link } from "react-router-dom";
import { todayLocalIso, toLocalIsoDate } from '../../lib/localDate';
import { reportError } from '../../lib/telemetry';
import { ISO_DATE_FILTER, useUrlFilters } from '../../hooks/useUrlFilters';

const AMOUNT_FIELD_CANDIDATES = [
  'amount',
  'volume',
  'liters',
  'milk_volume',
  'milkVolume',
  'yield_amount',
  'yieldAmount',
  'volume_liters',
  'volumeLiters',
  'quantity',
  'qty',
  'amount_liters',
  'amountLiters',
  'quantity_liters',
  'quantityLiters',
  'milk_amount',
  'milkAmount',
  'produced_liters',
  'producedLiters',
];

function isDevEnvironment() {
  return Boolean(import.meta.env?.DEV);
}

function logDevWarning(message, details) {
  if (!isDevEnvironment()) return;
  console.warn(`[productionLog] ${message}`, details);
}

function logDevError(message, details) {
  if (!isDevEnvironment()) return;
  console.error(`[productionLog] ${message}`, details);
}

function extractAmountCandidate(row) {
  if (!row || typeof row !== 'object') {
    return { value: null, key: null, found: false };
  }

  for (const key of AMOUNT_FIELD_CANDIDATES) {
    if (row[key] !== undefined && row[key] !== null && `${row[key]}`.trim() !== '') {
      return { value: row[key], key, found: true };
    }
  }

  return { value: null, key: null, found: false };
}

const BACKEND_STATUS_MAP = {
  RECORDED: 'Pending',
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  FLAGGED: 'Flagged',
  ISOLATED: 'Isolated',
};

// A record without a status shows "—": the backend decides it, the page never assumes one.
function normalizeStatus(raw) {
  if (!raw) return null;
  return BACKEND_STATUS_MAP[String(raw).toUpperCase()] ?? raw;
}

const getBucket = (row) => row.bucket;

// One column definition for the header, rows and group rows (litres totals line up).
// Fixed widths sized to their content for every column but Milker, which takes what's
// left, so nothing moves as groups open and close. Litres sit right beside Cow.
// Headers are read at render so they follow the language.
const COLUMN_LAYOUT = [
  { id: 'session', width: 'w-[7rem]' },
  { id: 'cow', width: 'w-[14rem]' },
  { id: 'litres', align: 'right', mono: true, width: 'w-[6rem]' },
  { id: 'milker' },
  { id: 'status', width: 'w-[7.5rem]' },
  { id: 'actions', align: 'right', width: 'w-[9.5rem]' },
];
const column = Object.fromEntries(COLUMN_LAYOUT.map((entry) => [entry.id, entry]));
// Kept in the address (Back, reload and shared links keep them). The search is a cow's
// name or tag, which is safe in a URL.
// No status filter: the backend ignores status (except "anomaly") on this list, so it would
// look like it filtered while showing everything (BACKEND_REQUESTS.md, BR-019).
// `date` is the older one-day filter, still read so saved links keep working.
const EMPTY_FILTERS = { from: "", to: "", date: "", cowId: "", session: "all" };
const FILTER_VALUES = {
  from: ISO_DATE_FILTER,
  to: ISO_DATE_FILTER,
  date: ISO_DATE_FILTER,
  session: ["all", "Morning", "Midday", "Evening"],
};

/** The range chosen in the address (ISO dates compare as text), or null for the default month. */
const chosenRangeOf = ({ from, to, date }) => {
  if (from && to && from <= to) return { from, to };
  return date ? { from: date, to: date } : null;
};

// Maps a yield record from the API to what the page shows. Display only: the amount
// is formatted, never parsed into a total.
function normalizeYieldRow(row) {
  const amountCandidate = extractAmountCandidate(row);
  const timestamp = row?.timestamp ?? row?.createdAt ?? row?.created_at;

  if (!amountCandidate.found) {
    logDevWarning('Yield row missing expected amount field.', {
      rowId: row?.id ?? row?.yield_id ?? row?.recordId ?? null,
      knownAmountKeys: AMOUNT_FIELD_CANDIDATES,
      receivedKeys: row && typeof row === 'object' ? Object.keys(row) : [],
      row,
    });
  }

  return {
    id: row?.id ?? row?.yield_id ?? row?.recordId,
    bucket: row?.bucket ?? null,
    date: row?.date ?? row?.milkingDate ?? row?.milking_date ?? row?.entry_date ?? (timestamp ? toLocalIsoDate(timestamp) : null),
    time: timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (row?.time ?? null),
    milker: row?.milker_name ?? row?.milker ?? row?.created_by ?? null,
    animalRefId: row?.cow_tag ?? row?.cowTag ?? row?.animal_id ?? row?.animalId ?? row?.cow_id ?? row?.cowId ?? row?.cow ?? null,
    cowId: row?.cow_tag ?? row?.cowTag ?? row?.cowId ?? row?.cow_id ?? row?.animal_id ?? '',
    cowName: row?.cowName ?? row?.cow_name ?? row?.animal_name ?? row?.animalName ?? row?.name ?? '',
    amount: amountCandidate.value,
    session: row?.session ?? row?.milking_session ?? row?.milkingSession ?? null,
    status: normalizeStatus(row?.status),
  };
}

const formatMilker = (value) => {
  if (!value) return '—';
  const milker = String(value);
  const digits = milker.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('254') ? `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}` : milker;
};

// Verified is the normal state, so only other statuses get a badge.
const StatusChip = ({ status }) => (status === 'Verified' ? null : status ? (
  <span
    className={`inline-flex items-center gap-1 rounded-badge border px-2 py-1 font-sans text-[11px] font-medium ${
      status === 'Verified'
        ? 'border-brand/20 bg-brand/5 text-brand'
        : status === 'Pending'
          ? 'border-brand-200 bg-brand-50 text-brand-800'
          : 'border-brand/20 bg-brand/10 text-brand-dark'
    }`}
  >
    <ShieldCheck size={10} aria-hidden="true" /> {copy.statuses[status] ?? status}
  </span>
) : <span className="text-xs text-ink-muted">—</span>);

export default function YieldLog() {
  const { tenantId, farmId } = useTenant();
  const { currentUser } = useAuth();
  const canVerify = canViewAdminControls(currentUser);
  const invalidateProduction = useInvalidateProduction();
  const queryClient = useQueryClient();
  const [showFastLog, setShowFastLog] = useState(false);
  const [showCalfMilkFeed, setShowCalfMilkFeed] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [fastLogInitialDate, setFastLogInitialDate] = useState('');
  const [fastLogMode, setFastLogMode] = useState('create');
  const confirmation = useConfirmation();
  const { filters, setFilter: updateFilter, setFilters: updateFilters, resetFilters: clearFilters, hasActiveFilters: hasUrlFilters } = useUrlFilters(EMPTY_FILTERS, { allowed: FILTER_VALUES });
  const [filtersOpen, setFiltersOpen] = useState(hasUrlFilters);
  const COLUMNS = COLUMN_LAYOUT.map((entry) => ({ ...entry, header: copy.columns[entry.id] }));

  // Every filter runs on the server, and one hook requests the rows, the group totals and
  // the summary strip with the same params, so all three agree.
  // The table and the strip open on the current month (as on the Ledger); a range in the
  // address replaces it.
  const chosenRange = chosenRangeOf(filters);
  const dateRange = chosenRange ?? currentMonthRange(todayLocalIso());
  const chosenDay = chosenRange && chosenRange.from === chosenRange.to ? chosenRange.from : '';
  const setRange = (next) => updateFilters({ from: next?.from ?? '', to: next?.to ?? '', date: '' });
  const { rows: yieldRows, groupTotals, summary: productionSummary } = useProductionData({
    filters: { search: filters.cowId.trim(), session: filters.session },
    range: dateRange,
  });
  const summary = productionSummary.data;
  const yieldRowsRaw = yieldRows.data;
  const yieldRowsError = yieldRows.error;
  const hasYieldRowsError = yieldRows.isError;
  const [groupFocus, setGroupFocus] = useState(null);

  const {
    data: milkDispositions = [],
    isLoading: isLoadingMilkDispositions,
    error: milkDispositionsError,
  } = useQuery({
    queryKey: QUERY_KEYS.MILK_DISPOSITIONS(tenantId, farmId),
    queryFn: () => productionApi.listMilkDispositions(),
    enabled: !!tenantId && !!farmId,
  });

  const milkRows = useMemo(() => {
    if (!Array.isArray(yieldRowsRaw)) {
      if (yieldRowsRaw !== undefined) {
        logDevWarning('Expected yield rows array but received different payload shape.', { payloadType: typeof yieldRowsRaw, payload: yieldRowsRaw });
      }
      return [];
    }
    return yieldRowsRaw.map(normalizeYieldRow);
  }, [yieldRowsRaw]);

  useEffect(() => {
    if (!hasYieldRowsError) return;

    logDevError('Failed to load production yield rows.', {
      tenantId,
      farmId,
      error: {
        message: yieldRowsError?.message,
        status: yieldRowsError?.response?.status,
        statusText: yieldRowsError?.response?.statusText,
        data: yieldRowsError?.response?.data,
      },
    });
  }, [hasYieldRowsError, yieldRowsError, tenantId, farmId]);

  const hasActiveFilters = Boolean(chosenRange || filters.cowId.trim() || filters.session !== 'all');
  const groupsUnavailable = groupTotals.loadState === 'error' || groupTotals.loadState === 'offline';

  const activeChips = [
    filters.cowId.trim() && { key: 'cowId', label: `“${filters.cowId.trim()}”`, clear: '' },
    filters.session !== 'all' && { key: 'session', label: sessionLabel(filters.session), clear: 'all' },
  ].filter(Boolean).map((chip) => ({ ...chip, onRemove: () => updateFilter(chip.key, chip.clear) }));
  if (chosenRange) activeChips.push({ key: 'range', label: formatDateRange(chosenRange.from, chosenRange.to), onRemove: () => setRange(null) });


  // Integrated Safety Check: Fetching active medical withdrawals
  const {
    data: hardlocksRaw,
    error: hardlocksError,
    isError: hasHardlocksError,
  } = useQuery({
    queryKey: QUERY_KEYS.HARDLOCKS(tenantId, farmId),
    queryFn: () => safetyApi.activeHardlocks(),
  });

  const hardlocks = Array.isArray(hardlocksRaw)
    ? hardlocksRaw
    : Array.isArray(hardlocksRaw?.items)
      ? hardlocksRaw.items
      : Array.isArray(hardlocksRaw?.data)
        ? hardlocksRaw.data
        : [];

  useEffect(() => {
    if (!hasHardlocksError) return;

    logDevError('Failed to load active hardlocks.', {
      tenantId,
      farmId,
      queryKey: QUERY_KEYS.HARDLOCKS(tenantId, farmId),
      error: {
        message: hardlocksError?.message,
        status: hardlocksError?.response?.status,
        statusText: hardlocksError?.response?.statusText,
        data: hardlocksError?.response?.data,
      },
    });
  }, [hasHardlocksError, hardlocksError, tenantId, farmId]);

  // After any write, the rows and every total are refetched from the server.
  const handleFastLogSaved = (animalRefId) => {
    invalidateProduction();
    if (animalRefId) {
      queryClient.invalidateQueries({ queryKey: ['milk-history', tenantId, farmId, animalRefId] });
    }
  };

  const openCreateLog = () => {
    setFastLogMode('create');
    setSelectedRecord(null);
    setFastLogInitialDate(chosenDay || todayLocalIso());
    setShowFastLog(true);
  };

  const milkFirstTimeEmpty = (
    <div className="flex flex-col items-center gap-3">
      <p>{copy.emptyFirst}</p>
      <button type="button" onClick={() => openCreateLog()} className="btn-command">{copy.recordFirst}</button>
    </div>
  );
  const emptyMessage = hasActiveFilters ? copy.emptyFiltered : milkFirstTimeEmpty;

  const openEditLog = (row) => {
    setFastLogMode('edit');
    setSelectedRecord(row);
    setFastLogInitialDate('');
    setShowFastLog(true);
  };

  const handleLogSave = (savedRecord) => {
    const animalRefId = savedRecord?.animal_id || savedRecord?.animalId || savedRecord?.cow_id || savedRecord?.cowId || selectedRecord?.animalRefId || selectedRecord?.cowId || null;
    handleFastLogSaved(animalRefId);
  };

  const handleLogDelete = (deletedRecord) => {
    handleFastLogSaved(deletedRecord?.animalRefId || selectedRecord?.animalRefId);
  };

  const handleDeleteFromTable = async (row) => {
    const confirmed = await confirmation.confirm({
      title: copy.deleteTitle,
      message: copy.deleteMessage(formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId })),
      confirmText: copy.delete,
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await productionApi.deleteYield(row.id);
      handleFastLogSaved(row.animalRefId);
      toast.success(copy.deleted);
    } catch (error) {
      reportError(error, { where: 'productionLog.delete' });
      toast.error(getApiErrorMessage(error, copy.deleteFailed));
    }
  };

  const handleVerifyEntry = async (row) => {
    try {
      await productionApi.verifyYield(row.id);
      handleFastLogSaved(row.animalRefId);
    } catch (error) {
      reportError(error, { where: 'productionLog.verify' });
      toast.error(getApiErrorMessage(error, copy.verifyFailed));
    }
  };

  const actionsMenu = (row, size) => (
    <OverflowMenu
      label={copy.actionsFor(formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId }))}
      size={size}
      bordered
      items={[
        { key: 'edit', label: copy.edit, icon: Pencil, onSelect: () => openEditLog(row) },
        { key: 'delete', label: copy.delete, icon: Trash2, tone: 'danger', onSelect: () => handleDeleteFromTable(row) },
      ]}
    />
  );

  const tableLink = 'text-ink underline-offset-2 hover:text-brand hover:underline focus-visible:text-brand focus-visible:underline focus-visible:outline-none';
  const cowLink = (row, className) => (
    <Link to={`/operations/animal/${row.animalRefId ?? row.cowId}/milk-history`} className={className}>
      {formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId })}
    </Link>
  );

  // Desktop row (44px). The day group above it carries the date.
  const renderRow = (row) => (
    <tr key={row.id} className="h-11 border-b border-ink/5 hover:bg-ink-50">
      <td className={cellClass(column.session, '!py-1 text-xs text-ink')}>{sessionLabel(row.session)}</td>
      <td className={cellClass(column.cow, '!py-1 text-sm')}><span className="block truncate">{cowLink(row, tableLink)}</span></td>
      <td className={cellClass(column.litres, '!py-1 text-sm tabular-nums text-ink')}>{formatLitres(row.amount, { unit: false })}</td>
      <td className={cellClass(column.milker, '!py-1 text-xs text-ink')}><span className="block truncate">{formatMilker(row.milker)}</span></td>
      <td className={cellClass(column.status, '!py-1')}><StatusChip status={row.status} /></td>
      <td className={cellClass(column.actions, '!py-1')}>
        <div className="inline-flex items-center gap-2">
          {canVerify && row.status !== 'Verified' && (
            <button type="button" onClick={() => handleVerifyEntry(row)} className="inline-flex h-8 items-center gap-1 !rounded-input border border-ink/10 px-2.5 text-xs font-semibold text-brand hover:bg-ink-50">
              <ShieldCheck size={12} aria-hidden="true" /> {copy.verify}
            </button>
          )}
          {actionsMenu(row, 'h-8 w-8')}
        </div>
      </td>
    </tr>
  );

  // Inside a day group the card doesn't repeat the date; ⋮ sits in the top row.
  const renderCard = (row) => (
    <article key={row.id} className="min-w-0 space-y-2 bg-card p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          {cowLink(row, 'break-words font-semibold text-brand')}
          <p className="mt-1 text-xs text-ink-muted">{sessionLabel(row.session)}</p>
        </div>
        <p className="shrink-0 pt-0.5 text-right font-mono text-lg font-bold tabular-nums text-brand">{formatLitres(row.amount)}</p>
        {actionsMenu(row, 'h-11 w-11')}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-ink/10 pt-2 text-xs">
        <span className="min-w-0 break-all text-ink-muted">{copy.milker} <span className="font-medium text-ink">{formatMilker(row.milker)}</span></span>
        <span className="flex items-center gap-2">
          <StatusChip status={row.status} />
          {canVerify && row.status !== 'Verified' && <button type="button" onClick={() => handleVerifyEntry(row)} className="min-h-11 rounded-lg border border-brand/20 px-3 text-xs font-semibold text-brand">{copy.verify}</button>}
        </span>
      </div>
    </article>
  );

  const hasMilkRowsToShow = yieldRows.loadState === 'ready' || yieldRows.loadState === 'stale';
  // No entries for these filters: one line, never a row of zeros, and only when the table
  // is empty too. The last entry's date (from the API) opens that day in the table: its
  // month up to that day, with the other filters cleared.
  const lastEntryDate = summary?.current?.lastEntryDate;
  const showLastEntry = () => {
    updateFilters({ cowId: '', session: 'all', date: '', from: `${lastEntryDate.slice(0, 7)}-01`, to: lastEntryDate });
    setGroupFocus({ key: lastEntryDate, nonce: Date.now() });
  };
  const stripEmpty = summaryIsEmpty(summary) && hasMilkRowsToShow && milkRows.length === 0 && (
    <span>
      {copy.summary.noEntries}
      {/* TODO(BR-022): `last_entry_date` is requested from the backend; only "No entries" until then. */}
      {lastEntryDate && (
        <>
          {' · '}{copy.summary.lastEntry}{' '}
          <button type="button" onClick={showLastEntry} className="inline font-semibold text-brand underline-offset-2 hover:underline">
            {formatDate(lastEntryDate)}
          </button>
        </>
      )}
    </span>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Confirmation {...confirmation} />
      <PageHeader
        title={copy.title}
        primaryAction={{ label: copy.recordMilk, icon: Plus, onClick: openCreateLog }}
        secondaryActions={[{ key: 'calf', label: copy.feedCalf, icon: Baby, onClick: () => setShowCalfMilkFeed(true) }]}
        secondaryOnMobile="inline"
      />

      <SummaryStrip
        label={copy.summary.label}
        items={summary ? productionSummaryConfig.items(summary) : []}
        scope={summaryScope(dateRange, { isDefault: !chosenRange })}
        empty={stripEmpty}
        link={{ to: '/operations/reports/milk-inventory' }}
        loadState={productionSummary.loadState}
        hasData={Boolean(summary)}
        error={productionSummary.error}
        asOf={productionSummary.asOf}
        onRetry={productionSummary.refetch}
      />

      {showFastLog && (
        <FastMilkLog
          mode={fastLogMode}
          record={selectedRecord}
          initialDate={fastLogInitialDate}
          onClose={() => setShowFastLog(false)}
          onSaveSuccess={handleLogSave}
          onDeleteSuccess={handleLogDelete}
        />
      )}

      <CalfMilkFeedModal
        isOpen={showCalfMilkFeed}
        onClose={() => setShowCalfMilkFeed(false)}
        initialDate={chosenDay}
      />

      {hardlocks?.length > 0 && (
        <div role="status" className={`${SURFACE} flex items-start gap-3 p-3 sm:p-4`}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{copy.medicineTitle}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">{copy.medicineMessage(hardlocks.length)}</p>
          </div>
        </div>
      )}

      <QueuedMilkEntries />

      <DataSection
        label={copy.sectionLabel}
        toolbar={(
          <>
            <Toolbar end={hasMilkRowsToShow && <ResultCount count={milkRows.length} noun={copy.group.noun} />}>
              <ToolbarSearch label={copy.searchLabel} value={filters.cowId} onChange={(value) => updateFilter('cowId', value)} placeholder={copy.searchPlaceholder} />
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
                aria-controls="production-filter-panel"
                className="inline-flex min-h-11 items-center gap-1.5 !rounded-input border border-ink/15 px-3 text-xs font-semibold text-ink hover:bg-ink-50 sm:min-h-9"
              >
                <SlidersHorizontal size={14} aria-hidden="true" /> {commonCopy.filters.filters}
              </button>
              <ToolbarDateRange range={dateRange} onChange={setRange} maxDate={todayLocalIso()} />
              <FilterChips chips={activeChips} onReset={clearFilters} />
            </Toolbar>
            {filtersOpen && (
              <div id="production-filter-panel" className="grid grid-cols-1 gap-3 pb-2 pt-1 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-ink-muted">
                  {copy.session}
                  <select value={filters.session} onChange={(e) => updateFilter('session', e.target.value)} className="input-machined">
                    <option value="all">{commonCopy.filters.all}</option>
                    <option value="Morning">{copy.sessions.morning}</option>
                    <option value="Midday">{copy.sessions.afternoon}</option>
                    <option value="Evening">{copy.sessions.evening}</option>
                  </select>
                </label>
              </div>
            )}
          </>
        )}
      >
        <GroupedDataTable
          columns={COLUMNS}
          rows={milkRows}
          getBucket={getBucket}
          groups={groupTotals.data}
          groupsUnavailable={groupsUnavailable}
          onRetryGroups={groupTotals.refetch}
          config={productionGroupConfig}
          renderRow={renderRow}
          renderCard={renderCard}
          focus={groupFocus}
          loadState={yieldRows.loadState}
          error={yieldRowsError}
          onRetry={yieldRows.refetch}
          rowsLabel={copy.rowsLabel}
          empty={emptyMessage}
        />
      </DataSection>

      <RecentCalfFeedings
        records={milkDispositions.slice(0, 5)}
        isLoading={isLoadingMilkDispositions}
        error={milkDispositionsError}
        viewAllHref="/operations/milk-usage"
      />
    </div>
  );
}
