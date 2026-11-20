import { useQuery } from "@tanstack/react-query";
import { useTenant } from "../../hooks/useTenant";
import { useAuth } from "../../contexts/AuthContext";
import { canViewAdminControls } from "../../lib/roles";
import { QUERY_KEYS } from "../../providers/QueryProvider";
import { getApiErrorMessage, productionApi, safetyApi } from "../../lib/backendApi";
import { AlertTriangle, CheckCircle, Clock, Flag, ShieldAlert } from "lucide-react";
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
import { Toolbar, ToolbarSearch, ToolbarSelect } from "../../components/data/Toolbar";
import FilterPanel from "../../components/data/FilterPanel";
import OverflowMenu from "../../components/ui/OverflowMenu";
import ToolbarDateRange from "../../components/data/ToolbarDateRange";
import { productionGroupConfig } from "../../components/periods/periodConfigs";
import { useInvalidateProduction } from "../../hooks/usePeriodTotals";
import { useProductionData } from "../../hooks/useProductionData";
import { formatLitres, formatSignedLitres } from "../../lib/numberFormat";
import { formatDayLabel } from "../../lib/dateFormat";
import toast from "react-hot-toast";
import { productionCopy as copy, sessionLabel } from "../../i18n/production";
import { formatCowIdentity } from "../../lib/cowIdentity";
import { Link } from "react-router-dom";
import { formatFarmTime, todayLocalIso, toLocalIsoDate } from '../../lib/localDate';
import { groupByDaySession, normalizeYieldRow, vsAverage } from '../../lib/milkRecords';
import { enumLabel } from '../../lib/enumLabel';
import MilkRecordList from '../../components/operations/milkLog/MilkRecordList';
import MilkRecordRow from '../../components/operations/milkLog/MilkRecordRow';
import MilkRecordSheet from '../../components/operations/milkLog/MilkRecordSheet';
import { reportError } from '../../lib/telemetry';
import { PRODUCTION_SESSIONS, useProductionFilters } from '../../hooks/useProductionFilters';

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

const getBucket = (row) => row.bucket;
// The desktop table's GroupedDataTable also renders cards below md; phones use MilkRecordList
// instead, so it gets none.
const renderNoCard = () => null;
// The sheet's props while closed (it renders nothing then).
const EMPTY_SHEET = { title: '', subtitle: '', litres: '', vsAvg: null, details: [], primaryAction: { label: '', onClick: () => {} } };

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
// Session filter options; labels are read when shown, so they follow the chosen language.
const SESSION_LABEL = { all: () => copy.allSessions, Morning: () => copy.sessions.morning, Midday: () => copy.sessions.afternoon, Evening: () => copy.sessions.evening };
const sessionOptions = () => PRODUCTION_SESSIONS.map((session) => [session, SESSION_LABEL[session]()]);

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
  // The filters live in the address (useProductionFilters, on the shared useFilterState).
  const filters = useProductionFilters({ today: todayLocalIso() });
  const COLUMNS = COLUMN_LAYOUT.map((entry) => ({ ...entry, header: copy.columns[entry.id], headerClassName: `!px-4 !py-3 ${entry.headerClassName ?? ''}` }));

  // Every filter runs on the server, and one hook requests the rows, the group totals and
  // the summary strip with the same params, so all three agree.
  // The table and the strip open on the current year, 1 Jan to today (as on the Ledger); a
  // range in the address replaces it, and removing that range goes back to the year.
  const chosenDay = filters.chosenDay;
  const { rows: yieldRows, totals: yieldTotals, groupTotals, summary: productionSummary } = useProductionData({
    filters: filters.query,
    range: filters.range,
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

  const hasActiveFilters = filters.activeCount > 0;
  const groupsUnavailable = groupTotals.loadState === 'error' || groupTotals.loadState === 'offline';


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

  // ── Phones: a list grouped by farm day and session, each row opening a details sheet ──
  // Everything shown is the backend's: the farm day (`bucket.day`), session, status, litres and
  // the change against the cow's average. "Today" is the farm's date (its timezone from the
  // backend), never the browser's UTC date.
  const phoneCopy = copy.phone;
  const today = todayLocalIso();
  const [sheetRecordId, setSheetRecordId] = useState(null);
  const sheetRecord = sheetRecordId == null ? null : milkRows.find((row) => row.id === sheetRecordId) ?? null;
  const closeSheet = () => setSheetRecordId(null);

  const statusText = (status) => (status ? enumLabel(copy.statuses, status) : '—');
  const phoneGroups = useMemo(() => groupByDaySession(milkRows).map((group) => ({
    key: group.key,
    label: [
      group.day ? formatDayLabel(group.day, { withYear: group.day.slice(0, 4) !== today.slice(0, 4) }) : '—',
      sessionLabel(group.session),
    ].join(' · '),
    isToday: group.day === today,
    rows: group.records,
  })), [milkRows, today]);

  const renderPhoneRow = (row) => {
    const litresText = formatLitres(row.amount, { unit: false });
    const time = formatFarmTime(row.timestamp);
    const exception = row.status && row.status !== 'Verified' ? statusText(row.status) : null;
    return (
      <MilkRecordRow
        key={row.id}
        cow={formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId })}
        time={time}
        litres={formatLitres(row.amount)}
        vsAvg={vsAverage(row.vsAvgLitres)}
        significantDrop={row.significantDrop}
        status={row.status}
        statusLabel={statusText(row.status)}
        ariaLabel={phoneCopy.rowLabel({
          cow: [row.cowName, row.cowId].filter(Boolean).join(' ') || formatCowIdentity({}),
          litres: litresText,
          session: sessionLabel(row.session),
          time,
          status: exception,
        })}
        onOpen={() => setSheetRecordId(row.id)}
      />
    );
  };

  const STATUS_ICON = { Verified: CheckCircle, Pending: Clock, Flagged: Flag, Isolated: ShieldAlert };
  const sheetProps = sheetRecord && (() => {
    const row = sheetRecord;
    const time = formatFarmTime(row.timestamp);
    const recordedAtDay = row.recordedAt ? toLocalIsoDate(row.recordedAt) : null;
    return {
      title: formatCowIdentity({ cowName: row.cowName, cowTag: row.cowId }),
      subtitle: [row.day ? formatDayLabel(row.day, { withYear: true }) : null, sessionLabel(row.session), time].filter(Boolean).join(' · '),
      litres: formatLitres(row.amount),
      vsAvg: vsAverage(row.vsAvgLitres),
      significantDrop: row.significantDrop,
      averageText: row.avgLitres == null ? null : phoneCopy.vsAvg(formatLitres(row.avgLitres)),
      details: [
        { key: 'status', label: phoneCopy.status, value: statusText(row.status), icon: STATUS_ICON[row.status] },
        { key: 'session', label: phoneCopy.sessionLabel, value: sessionLabel(row.session) },
        { key: 'milker', label: phoneCopy.milkedBy, value: formatMilker(row.milker) },
        { key: 'recordedBy', label: phoneCopy.recordedBy, value: row.recordedByIsMilker === true ? phoneCopy.sameAsMilker : recordedByText(row) },
        // TODO(BR-029): shown once the backend sends `recorded_at`.
        row.recordedAt && { key: 'recordedAt', label: phoneCopy.recordedAt, value: [formatDayLabel(recordedAtDay, { withYear: true }), formatFarmTime(row.recordedAt)].filter(Boolean).join(' · ') },
      ].filter(Boolean),
      // The ⋮ menu's actions, with the same handlers and permission check.
      primaryAction: { label: phoneCopy.editRecord, onClick: () => { closeSheet(); openEditLog(row); } },
      secondaryActions: [
        canVerify && row.status !== 'Verified' && { key: 'verify', label: phoneCopy.verify, onClick: () => handleVerifyEntry(row) },
        { key: 'history', label: phoneCopy.history, to: `/operations/animal/${row.animalRefId ?? row.cowId}/milk-history` },
      ].filter(Boolean),
      destructiveAction: { label: phoneCopy.deleteRecord, onClick: () => { closeSheet(); handleDeleteFromTable(row); } },
    };
  })();

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

      <FilterPanel
        title={copy.filtersTitle}
        activeCount={filters.activeCount}
        onReset={filters.reset}
        resultsSummary={hasMilkRowsToShow && <p role="status" className="m-0">{copy.showing(milkRows.length, totalRecords)}</p>}
      >
        <Toolbar>
          <ToolbarSearch label={copy.searchLabel} value={filters.values.cowId} onChange={filters.setSearch} placeholder={copy.searchPlaceholder} />
          <ToolbarSelect label={copy.session} value={filters.values.session} onChange={filters.setSession} options={sessionOptions()} />
          <ToolbarDateRange range={filters.range} onChange={filters.setRange} maxDate={todayLocalIso()} />
        </Toolbar>
      </FilterPanel>

      <section aria-label={copy.sectionLabel} className="flex flex-col overflow-clip rounded-xl border border-ink/10 bg-card shadow-sm md:overflow-hidden">
        {/* Phones: the grouped list (the desktop table is below). */}
        <div className="md:hidden">
          <MilkRecordList
            groups={phoneGroups}
            renderRow={renderPhoneRow}
            loadState={yieldRows.loadState}
            error={yieldRowsError}
            onRetry={yieldRows.refetch}
            rowsLabel={copy.rowsLabel}
            todayLabel={phoneCopy.today}
            empty={hasActiveFilters ? (
              <div className="flex flex-col items-center gap-2">
                <p>{phoneCopy.noMatch}</p>
                <button type="button" onClick={filters.reset} className="inline-flex min-h-11 items-center px-2 text-control text-brand underline underline-offset-2">
                  {phoneCopy.clearFilters}
                </button>
              </div>
            ) : milkFirstTimeEmpty}
          />
          <MilkRecordSheet open={Boolean(sheetProps)} onClose={closeSheet} labels={{ close: phoneCopy.close, yield: phoneCopy.yield }} {...(sheetProps ?? EMPTY_SHEET)} />
        </div>

        <div className="hidden md:block">
        <GroupedDataTable
          columns={COLUMNS}
          rows={milkRows}
          getBucket={getBucket}
          groups={groupTotals.data}
          groupsUnavailable={groupsUnavailable}
          onRetryGroups={groupTotals.refetch}
          config={productionGroupConfig}
          renderRow={renderRow}
          renderCard={renderNoCard}
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
        </div>
      </section>
    </div>
  );
}
