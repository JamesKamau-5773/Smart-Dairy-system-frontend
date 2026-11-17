import { useQuery } from "@tanstack/react-query";
import { useTenant } from "../../hooks/useTenant";
import { useAuth } from "../../contexts/AuthContext";
import { canViewAdminControls } from "../../lib/roles";
import { QUERY_KEYS } from "../../providers/QueryProvider";
import { getApiErrorMessage, productionApi, safetyApi } from "../../lib/backendApi";
import { AlertTriangle, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import FastMilkLog from "../../components/operations/FastMilkLog";
import QueuedMilkEntries from "../../components/operations/QueuedMilkEntries";
import CalfMilkFeedModal from "../../components/operations/CalfMilkFeedModal";
import RecentCalfFeedings from "../../components/operations/RecentCalfFeedings";
import Confirmation, { useConfirmation } from "../../components/ui/Confirmation";
import ProductionLogHeader from "../../components/operations/ProductionLogHeader";
import ProductionSummaryTiles from "../../components/operations/ProductionSummaryTiles";
import MilkStatusBadge from "../../components/operations/MilkStatusBadge";
import { SURFACE } from "../../components/data/surface";
import { cellClass } from "../../components/data/DataTable";
import GroupedDataTable from "../../components/data/GroupedDataTable";
import { FilterChips, Toolbar, ToolbarSearch } from "../../components/data/Toolbar";
import OverflowMenu from "../../components/ui/OverflowMenu";
import ToolbarDateRange from "../../components/data/ToolbarDateRange";
import { productionGroupConfig } from "../../components/periods/periodConfigs";
import { useInvalidateProduction } from "../../hooks/usePeriodTotals";
import { useProductionData } from "../../hooks/useProductionData";
import { formatLitres, formatSignedLitres } from "../../lib/numberFormat";
import { currentYearRange } from "../../lib/periodTotals";
import { formatDateRange } from "../../lib/dateFormat";
import toast from "react-hot-toast";
import { productionCopy as copy, sessionLabel } from "../../i18n/production";
import { commonCopy } from "../../i18n/common";
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
// Each row is one milking record, as the backend sends it: its litres sit in its own session
// column and in Total (L). Fixed widths for every column but Milker, which takes what's
// left; the table scrolls sideways below its minimum width. Headers follow the language.
const COLUMN_LAYOUT = [
  { id: 'lead', width: 'w-12' },
  { id: 'cow', width: 'w-[11rem]' },
  { id: 'morning', align: 'right', width: 'w-[5rem]' },
  { id: 'midday', align: 'right', width: 'w-[5rem]' },
  { id: 'evening', align: 'right', width: 'w-[5rem]' },
  { id: 'milker', align: 'right' },
  { id: 'total', align: 'right', width: 'w-[6rem]', headerClassName: 'text-ink-900' },
  { id: 'status', align: 'center', width: 'w-[8rem]' },
  { id: 'vsAvg', align: 'right', width: 'w-[7rem]' },
  { id: 'recordedBy', width: 'w-[7.5rem]' },
  { id: 'actions', align: 'right', width: 'w-[5rem]', headerClassName: 'pr-6' },
];
// From md up the table keeps its full width and scrolls sideways; phones get cards instead.
const TABLE_MIN_WIDTH = 'min-w-[1140px]';
// The session columns, by the backend's session value ("Midday"; older rows may say "Afternoon").
const SESSION_COLUMN = { morning: 'morning', midday: 'midday', afternoon: 'midday', evening: 'evening' };
const sessionColumnOf = (session) => SESSION_COLUMN[String(session ?? '').trim().toLowerCase()] ?? null;
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
    // TODO(BR-026): this record's litres against the cow's 5-day average, and whether the
    // backend counts it as a significant drop. "—" until sent.
    vsAvgLitres: row?.vs_avg_litres ?? null,
    significantDrop: row?.significant_drop === true,
    // TODO(BR-019): who entered the record (a person) or how (`recorded_via`). "—" until sent.
    recordedBy: row?.recorded_by_name ?? null,
    recordedVia: row?.recorded_via ?? null,
  };
}

const formatMilker = (value) => {
  if (!value) return '—';
  const milker = String(value);
  const digits = milker.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('254') ? `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}` : milker;
};

const recordedByText = (row) => row.recordedBy
  || copy.recordedVia[String(row.recordedVia ?? '').toLowerCase()]
  || row.recordedVia
  || '—';

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
  const COLUMNS = COLUMN_LAYOUT.map((entry) => ({ ...entry, header: copy.columns[entry.id], headerClassName: `!px-4 !py-3 ${entry.headerClassName ?? ''}` }));

  // Every filter runs on the server, and one hook requests the rows, the group totals and
  // the summary strip with the same params, so all three agree.
  // The table and the strip open on the current year, 1 Jan to today (as on the Ledger); a
  // range in the address replaces it, and removing that range goes back to the year.
  const chosenRange = chosenRangeOf(filters);
  const dateRange = chosenRange ?? currentYearRange(todayLocalIso());
  const chosenDay = chosenRange && chosenRange.from === chosenRange.to ? chosenRange.from : '';
  const setRange = (next) => updateFilters({ from: next?.from ?? '', to: next?.to ?? '', date: '' });
  const { rows: yieldRows, totals: yieldTotals, groupTotals, summary: productionSummary } = useProductionData({
    filters: { search: filters.cowId.trim(), session: filters.session },
    range: dateRange,
  });
  const summary = productionSummary.data;
  const yieldRowsRaw = yieldRows.data;
  const yieldRowsError = yieldRows.error;
  const hasYieldRowsError = yieldRows.isError;

  // Calf feedings with the backend's totals. Under the dispositions key, so a new feeding
  // refetches it, with its own suffix because the shape differs from the plain list.
  const {
    data: calfFeedings,
    isLoading: isLoadingMilkDispositions,
    error: milkDispositionsError,
  } = useQuery({
    queryKey: [...QUERY_KEYS.MILK_DISPOSITIONS(tenantId, farmId), 'with-totals'],
    queryFn: () => productionApi.listMilkDispositionsWithTotals(),
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

  const actionsMenu = (row, size = 'h-8 w-8') => (
    <OverflowMenu
      label={copy.actionsFor(formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId }))}
      size={size}
      items={[
        canVerify && row.status !== 'Verified' && { key: 'verify', label: copy.verify, onSelect: () => handleVerifyEntry(row) },
        { key: 'edit', label: copy.edit, onSelect: () => openEditLog(row) },
        { key: 'delete', label: copy.delete, tone: 'danger', onSelect: () => handleDeleteFromTable(row) },
      ]}
    />
  );

  const cowLink = (row) => (
    <Link
      to={`/operations/animal/${row.animalRefId ?? row.cowId}/milk-history`}
      className="truncate text-ink-900 underline-offset-2 hover:text-brand hover:underline focus-visible:text-brand focus-visible:underline focus-visible:outline-none"
    >
      {formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId })}
    </Link>
  );

  // A drop the backend counts as significant is red and strong.
  const vsAvgClass = (row) => (row.significantDrop ? 'text-body-strong text-danger-900' : 'text-body text-ink-500');

  // One milking record. The day group above it carries the date.
  const td = (id, extra = '') => cellClass(column[id], `!px-4 !py-3 whitespace-nowrap ${extra}`);
  const litres = (row) => formatLitres(row.amount, { unit: false });
  const renderRow = (row) => {
    const sessionColumn = sessionColumnOf(row.session);
    return (
      <tr key={row.id} className="border-b border-ink-100 bg-card text-body transition-colors hover:bg-ink-50">
        <td className={td('lead')} />
        <td className={td('cow')}>
          <div className="flex min-w-0 items-center gap-2 text-body-strong text-ink-900">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            {cowLink(row)}
          </div>
        </td>
        {['morning', 'midday', 'evening'].map((id) => (
          <td key={id} className={td(id, 'tabular-nums text-ink-700')}>{sessionColumn === id ? litres(row) : ''}</td>
        ))}
        <td className={td('milker', 'truncate text-meta tabular-nums text-ink-500')}>{formatMilker(row.milker)}</td>
        <td className={td('total', 'text-body-strong tabular-nums text-ink-900')}>{litres(row)}</td>
        <td className={td('status')}><MilkStatusBadge status={row.status} /></td>
        <td className={td('vsAvg', `tabular-nums ${vsAvgClass(row)}`)}>
          {formatSignedLitres(row.vsAvgLitres)}
        </td>
        <td className={td('recordedBy', 'truncate text-meta text-ink-600')}>{recordedByText(row)}</td>
        <td className={td('actions', 'pr-6')}>
          <div className="inline-flex text-ink-400 hover:text-brand">{actionsMenu(row)}</div>
        </td>
      </tr>
    );
  };

  // Phones: one card per milking record (no sideways scrolling). The day group above it
  // carries the date; the same fields as the table row.
  const renderCard = (row) => (
    <article key={row.id} className="min-w-0 space-y-3 bg-card p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 text-body-strong text-ink-900">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            {cowLink(row)}
          </div>
          <p className="mt-1 text-meta text-ink-500">{sessionLabel(row.session)}</p>
        </div>
        <p className="shrink-0 pt-0.5 text-stat-value text-ink-900">{formatLitres(row.amount)}</p>
        {actionsMenu(row, 'h-11 w-11')}
      </div>
      <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink-100 pt-3 text-meta">
        <div className="min-w-0">
          <dt className="text-ink-500">{copy.columns.status}</dt>
          <dd className="m-0 mt-1"><MilkStatusBadge status={row.status} /></dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-500">{copy.columns.vsAvg}</dt>
          <dd className={`m-0 mt-1 tabular-nums ${vsAvgClass(row)}`}>{formatSignedLitres(row.vsAvgLitres)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-500">{copy.columns.milker}</dt>
          <dd className="m-0 mt-1 break-all tabular-nums text-ink-700">{formatMilker(row.milker)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-500">{copy.columns.recordedBy}</dt>
          <dd className="m-0 mt-1 break-words text-ink-700">{recordedByText(row)}</dd>
        </div>
      </dl>
    </article>
  );

  const hasMilkRowsToShow = yieldRows.loadState === 'ready' || yieldRows.loadState === 'stale';
  const totalRecords = yieldTotals.data?.totalRecords ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Confirmation {...confirmation} />
      <ProductionLogHeader onRecordMilk={openCreateLog} onFeedCalf={() => setShowCalfMilkFeed(true)} />

      <ProductionSummaryTiles
        litres={summary?.current?.litres ?? null}
        litresLoading={productionSummary.loadState === 'loading'}
        counts={yieldTotals.data}
        countsLoading={yieldTotals.loadState === 'loading'}
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

      <RecentCalfFeedings
        records={(calfFeedings?.items ?? []).slice(0, 5)}
        count={calfFeedings?.count ?? null}
        totalLitres={calfFeedings?.totalLitres ?? null}
        isLoading={isLoadingMilkDispositions}
        error={milkDispositionsError}
        viewAllHref="/operations/milk-usage"
      />

      {hardlocks?.length > 0 && (
        <div role="status" className={`${SURFACE} flex items-start gap-3 p-3 sm:p-4`}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body-strong text-ink">{copy.medicineTitle}</p>
            <p className="mt-0.5 text-meta text-ink-muted">{copy.medicineMessage(hardlocks.length)}</p>
          </div>
        </div>
      )}

      <QueuedMilkEntries />

      <section aria-label={copy.sectionLabel} className="flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-card shadow-sm">
        <div className="border-b border-ink-200 bg-ink-50/50 p-4">
          <Toolbar end={hasMilkRowsToShow && <p role="status" className="m-0 whitespace-nowrap text-meta text-ink-500">{copy.showing(milkRows.length, totalRecords)}</p>}>
            <ToolbarSearch label={copy.searchLabel} value={filters.cowId} onChange={(value) => updateFilter('cowId', value)} placeholder={copy.searchPlaceholder} />
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              aria-controls="production-filter-panel"
              className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border border-ink-300 bg-card px-3 text-control text-ink-700 shadow-sm transition-colors hover:bg-ink-50 sm:min-h-9"
            >
              <Filter size={16} className="text-ink-400" aria-hidden="true" /> {commonCopy.filters.filters}
            </button>
            <ToolbarDateRange range={dateRange} onChange={setRange} maxDate={todayLocalIso()} />
            <FilterChips chips={activeChips} onReset={clearFilters} />
          </Toolbar>
          {filtersOpen && (
            <div id="production-filter-panel" className="grid grid-cols-1 gap-3 pb-2 pt-3 sm:grid-cols-2">
              <label className="space-y-1 text-field-label text-ink-muted">
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
        </div>

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
          tableFrom="md"
          scroll
          headerVariant="neutral"
          tableClassName={TABLE_MIN_WIDTH}
          loadState={yieldRows.loadState}
          error={yieldRowsError}
          onRetry={yieldRows.refetch}
          rowsLabel={copy.rowsLabel}
          empty={emptyMessage}
        />
      </section>
    </div>
  );
}
