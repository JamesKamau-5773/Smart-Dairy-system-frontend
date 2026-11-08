import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import PeriodSummary from "../../components/periods/PeriodSummary";
import PeriodControl from "../../components/periods/PeriodControl";
import PageHeader from "../../components/layout/PageHeader";
import DataSection from "../../components/data/DataSection";
import { SURFACE } from "../../components/data/surface";
import { TableHead, cellClass } from "../../components/data/DataTable";
import { FilterChips, Toolbar, ToolbarSearch } from "../../components/data/Toolbar";
import OverflowMenu from "../../components/ui/OverflowMenu";
import DateField from "../../components/ui/DateField";
import GroupedList from "../../components/periods/GroupedList";
import { productionGroupConfig, productionSummaryConfig } from "../../components/periods/periodConfigs";
import { useInvalidateProduction, useProductionGroupTotals, useProductionSummary, usePeriodSelection } from "../../hooks/usePeriodTotals";
import { formatLitres } from "../../lib/numberFormat";
import { toTotalsParams } from "../../lib/periodTotals";
import { CardSkeletons, ListLoadMessage, SlowLoadingHint, StaleDataNotice, TableSkeletonRows } from "../../components/ui/ListLoadState";
import { getListLoadState } from "../../lib/listLoadState";
import toast from "react-hot-toast";
import { toNormalizedSessionLabel } from "../../lib/milkUtils";
import { formatDate } from "../../lib/herdUtils";
import { formatCowIdentity } from "../../lib/cowIdentity";
import { Link } from "react-router-dom";
import { todayLocalIso, toLocalIsoDate } from '../../lib/localDate';
import { reportError } from '../../lib/telemetry';

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
};

function normalizeStatus(raw) {
  if (!raw) return 'Pending';
  return BACKEND_STATUS_MAP[String(raw).toUpperCase()] ?? raw;
}

const getBucket = (row) => row.bucket;

// One column definition for the header, rows and group rows (litres totals line up).
const COLUMNS = [
  { id: 'session', header: 'Session' },
  { id: 'milker', header: 'Milker' },
  { id: 'cow', header: 'Cow' },
  { id: 'litres', header: 'Litres', align: 'right', mono: true },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions', align: 'right' },
];
const column = Object.fromEntries(COLUMNS.map((entry) => [entry.id, entry]));
const EMPTY_FILTERS = { date: "", cowId: "", status: "all", session: "all" };

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
    date: row?.date ?? row?.milkingDate ?? row?.milking_date ?? row?.entry_date ?? (timestamp ? toLocalIsoDate(timestamp) : todayLocalIso()),
    time: timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (row?.time ?? null),
    milker: row?.milker_name ?? row?.milker ?? row?.created_by ?? 'SYSTEM',
    animalRefId: row?.cow_tag ?? row?.cowTag ?? row?.animal_id ?? row?.animalId ?? row?.cow_id ?? row?.cowId ?? row?.cow ?? null,
    cowId: row?.cow_tag ?? row?.cowTag ?? row?.cowId ?? row?.cow_id ?? row?.animal_id ?? '',
    cowName: row?.cowName ?? row?.cow_name ?? row?.animal_name ?? row?.animalName ?? row?.name ?? '',
    amount: amountCandidate.value,
    session: row?.session ?? row?.milking_session ?? row?.milkingSession ?? 'morning',
    status: normalizeStatus(row?.status),
  };
}

const formatMilker = (value) => {
  const milker = String(value || 'SYSTEM');
  const digits = milker.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('254') ? `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}` : milker;
};

const StatusChip = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-badge border px-2 py-1 font-sans text-[11px] font-medium ${
      status === 'Verified'
        ? 'border-brand/20 bg-brand/5 text-brand'
        : status === 'Pending'
          ? 'border-brand-200 bg-brand-50 text-brand-800'
          : 'border-brand/20 bg-brand/10 text-brand-dark'
    }`}
  >
    <ShieldCheck size={10} aria-hidden="true" /> {status}
  </span>
);

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Every filter runs on the server so rows, group headers and period totals agree.
  const serverFilters = useMemo(() => ({
    search: filters.cowId.trim(),
    date_from: filters.date,
    date_to: filters.date,
    status: filters.status,
    session: filters.session,
  }), [filters]);

  const { period, anchor, setPeriod, step } = usePeriodSelection('production');
  const periodSummary = useProductionSummary({ period, anchor, filters: serverFilters });
  const summary = periodSummary.data;
  const groupTotals = useProductionGroupTotals(serverFilters);

  const {
    data: yieldRowsRaw,
    error: yieldRowsError,
    isError: hasYieldRowsError,
    status: yieldRowsStatus,
    fetchStatus: yieldRowsFetchStatus,
    refetch: refetchYieldRows,
  } = useQuery({
    queryKey: [...QUERY_KEYS.YIELD_ROWS(tenantId, farmId), toTotalsParams(serverFilters)],
    queryFn: () => productionApi.listYield(toTotalsParams(serverFilters)),
    placeholderData: keepPreviousData,
  });
  const milkLoadState = getListLoadState({ status: yieldRowsStatus, fetchStatus: yieldRowsFetchStatus, data: yieldRowsRaw });
  const hasMilkRowsToShow = milkLoadState === 'ready' || milkLoadState === 'stale';

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

  const hasActiveFilters = Boolean(filters.date || filters.cowId.trim() || filters.status !== 'all' || filters.session !== 'all');
  const groupsUnavailable = groupTotals.loadState === 'error' || groupTotals.loadState === 'offline';

  const activeChips = [
    filters.cowId.trim() && { key: 'cowId', label: `“${filters.cowId.trim()}”`, clear: '' },
    filters.date && { key: 'date', label: formatDate(filters.date), clear: '' },
    filters.status !== 'all' && { key: 'status', label: filters.status, clear: 'all' },
    filters.session !== 'all' && { key: 'session', label: filters.session, clear: 'all' },
  ].filter(Boolean).map((chip) => ({ ...chip, onRemove: () => updateFilter(chip.key, chip.clear) }));

  const updateFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

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
    setFastLogInitialDate(filters.date || todayLocalIso());
    setShowFastLog(true);
  };

  const milkFirstTimeEmpty = (
    <div className="flex flex-col items-center gap-3">
      <p>No milk recorded yet. Logged milkings will appear here.</p>
      <button type="button" onClick={() => openCreateLog()} className="btn-command">Record the first milking</button>
    </div>
  );
  const emptyMessage = hasActiveFilters ? 'No milk log entries match the selected filters.' : milkFirstTimeEmpty;

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
      title: 'Delete Milk Record',
      message: `Delete milk record for ${formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId })}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await productionApi.deleteYield(row.id);
      handleFastLogSaved(row.animalRefId);
      toast.success('Milk record deleted.');
    } catch (error) {
      reportError(error, { where: 'productionLog.delete' });
      toast.error(getApiErrorMessage(error, 'Couldn’t delete this milk record. Try again.'));
    }
  };

  const handleVerifyEntry = async (row) => {
    try {
      await productionApi.verifyYield(row.id);
      handleFastLogSaved(row.animalRefId);
    } catch (error) {
      reportError(error, { where: 'productionLog.verify' });
      toast.error(getApiErrorMessage(error, 'Couldn’t verify this milk record. Try again.'));
    }
  };

  const actionsMenu = (row, size) => (
    <OverflowMenu
      label={`Actions for milk record ${formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId })}`}
      size={size}
      bordered
      items={[
        { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => openEditLog(row) },
        { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => handleDeleteFromTable(row) },
      ]}
    />
  );

  const tableLink = 'text-ink underline-offset-2 hover:text-brand hover:underline focus-visible:text-brand focus-visible:underline focus-visible:outline-none';
  const cowLink = (row, className) => (
    <Link to={`/operations/animal/${row.animalRefId ?? row.cowId}/milk-history`} className={className}>
      {formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId })}
    </Link>
  );

  // Dense desktop row (~40px).
  const renderRow = (row) => (
    <tr key={row.id} className="h-10 border-b border-ink/5 hover:bg-ink-50">
      <td className={cellClass(column.session, '!py-1 text-xs text-ink')}>{toNormalizedSessionLabel(row.session)}</td>
      <td className={cellClass(column.milker, '!py-1 text-xs text-ink')}>{formatMilker(row.milker)}</td>
      <td className={cellClass(column.cow, '!py-1 text-sm')}>{cowLink(row, tableLink)}</td>
      <td className={cellClass(column.litres, '!py-1 text-sm text-ink')}>{formatLitres(row.amount)}</td>
      <td className={cellClass(column.status, '!py-1')}><StatusChip status={row.status} /></td>
      <td className={cellClass(column.actions, '!py-1')}>
        <div className="inline-flex items-center gap-2">
          {canVerify && row.status !== 'Verified' && (
            <button type="button" onClick={() => handleVerifyEntry(row)} className="inline-flex h-8 items-center gap-1 !rounded-input border border-ink/10 px-2.5 text-xs font-semibold text-brand hover:bg-ink-50">
              <ShieldCheck size={12} aria-hidden="true" /> Verify
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
          <p className="mt-1 text-xs text-ink-muted">{toNormalizedSessionLabel(row.session)}</p>
        </div>
        <p className="shrink-0 pt-0.5 text-right font-mono text-lg font-bold tabular-nums text-brand">{formatLitres(row.amount)}</p>
        {actionsMenu(row, 'h-11 w-11')}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-ink/10 pt-2 text-xs">
        <span className="min-w-0 break-all text-ink-muted">Milker <span className="font-medium text-ink">{formatMilker(row.milker)}</span></span>
        <span className="flex items-center gap-2">
          <StatusChip status={row.status} />
          {canVerify && row.status !== 'Verified' && <button type="button" onClick={() => handleVerifyEntry(row)} className="min-h-11 rounded-lg border border-brand/20 px-3 text-xs font-semibold text-brand">Verify</button>}
        </span>
      </div>
    </article>
  );

  const groupedListProps = {
    records: milkRows,
    getBucket,
    groups: groupTotals.data,
    groupsUnavailable,
    onRetryGroups: groupTotals.refetch,
    config: productionGroupConfig,
  };


  return (
    <div className="space-y-4">
      <Confirmation {...confirmation} />
      <PageHeader
        title="Production Log"
        primaryAction={{ label: 'Record milk', icon: Plus, onClick: openCreateLog }}
        secondaryActions={[{ key: 'calf', label: 'Feed calf', icon: Baby, onClick: () => setShowCalfMilkFeed(true) }]}
        secondaryOnMobile="inline"
      />

      <PeriodSummary
        control={(
          <PeriodControl
            period={period}
            label={summary?.label}
            onPeriodChange={setPeriod}
            onPrevious={() => step(summary?.range, -1)}
            onNext={() => step(summary?.range, 1)}
            canGoPrevious={Boolean(summary?.range)}
            canGoNext={Boolean(summary?.range) && summary.hasNext}
          />
        )}
        loadState={periodSummary.loadState}
        hasData={Boolean(summary)}
        isEmpty={summary?.current?.count === 0}
        error={periodSummary.error}
        asOf={periodSummary.asOf}
        onRetry={periodSummary.refetch}
        metrics={summary ? productionSummaryConfig.metrics(summary) : []}
        emptyMessage={summary && productionSummaryConfig.emptyMessage(summary)}
        skeletonCount={3}
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
        initialDate={filters.date}
      />

      {hardlocks?.length > 0 && (
        <div role="status" className={`${SURFACE} flex items-start gap-3 p-3 sm:p-4`}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">Cows on medicine: do not mix their milk</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              <span className="tabular-nums">{hardlocks.length}</span> cows are under withdrawal periods. Their milk entries are restricted to prevent contamination of the batch.
            </p>
          </div>
        </div>
      )}

      <QueuedMilkEntries />

      <DataSection
        label="Milk entries"
        toolbar={(
          <>
            <Toolbar>
              <ToolbarSearch label="Search by cow name or ear tag" value={filters.cowId} onChange={(value) => updateFilter('cowId', value)} placeholder="Search cow name or ear tag" />
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
                aria-controls="production-filter-panel"
                className="inline-flex min-h-11 items-center gap-1.5 !rounded-input border border-ink/15 px-3 text-xs font-semibold text-ink hover:bg-ink-50 sm:min-h-9"
              >
                <SlidersHorizontal size={14} aria-hidden="true" /> Filters
              </button>
              <FilterChips chips={activeChips} onReset={clearFilters} />
            </Toolbar>
            {filtersOpen && (
              <div id="production-filter-panel" className="grid grid-cols-1 gap-3 pb-2 pt-1 sm:grid-cols-3">
                <DateField label="Date" value={filters.date} onChange={(value) => updateFilter('date', value)} max={todayLocalIso()} inputClassName="input-machined h-10 min-h-0 !py-2 text-sm" />
                <label className="space-y-1 text-xs font-semibold text-ink-muted">
                  Status
                  <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="input-machined">
                    <option value="all">All</option>
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                    <option value="Flagged">Flagged</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-ink-muted">
                  Session
                  <select value={filters.session} onChange={(e) => updateFilter('session', e.target.value)} className="input-machined">
                    <option value="all">All</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                  </select>
                </label>
              </div>
            )}
          </>
        )}
      >
        {milkLoadState === 'loading' && <SlowLoadingHint label="milk records" />}
        {milkLoadState === 'stale' && <StaleDataNotice label="milk records" error={yieldRowsError} onRetry={refetchYieldRows} />}
        {(milkLoadState === 'offline' || milkLoadState === 'error') && (
          <ListLoadMessage state={milkLoadState} label="milk records" error={yieldRowsError} onRetry={refetchYieldRows} />
        )}
        <div className={`hidden ${hasMilkRowsToShow || milkLoadState === 'loading' ? 'xl:block' : ''}`}>
          <table className="w-full border-collapse text-left">
            <TableHead columns={COLUMNS} />
            <tbody className="bg-card" aria-busy={milkLoadState === 'loading'}>
              {milkLoadState === 'loading' ? <TableSkeletonRows columns={COLUMNS.length} />
                : hasMilkRowsToShow && (milkRows.length > 0
                  ? <GroupedList {...groupedListProps} variant="table" columns={COLUMNS} renderRecord={renderRow} />
                  : <tr><td className="p-6 text-center text-sm text-ink-muted" colSpan={COLUMNS.length}>{emptyMessage}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="xl:hidden" aria-busy={milkLoadState === 'loading'}>
          {milkLoadState === 'loading' && <div className="divide-y divide-ink/10"><CardSkeletons /></div>}
          {hasMilkRowsToShow && (milkRows.length > 0
            ? <GroupedList {...groupedListProps} variant="cards" renderRecord={renderCard} />
            : <div className="p-6 text-center text-sm text-ink-muted">{emptyMessage}</div>)}
        </div>
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
