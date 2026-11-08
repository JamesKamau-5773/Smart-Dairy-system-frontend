import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Hand, RefreshCw, Search, ShieldAlert, ShieldCheck, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { Skeleton } from '../../components/ui';
import ReleaseMilkModal from '../../components/operations/ReleaseMilkModal';
import PlaceHoldModal from '../../components/operations/PlaceHoldModal';
import RecordMilkTestModal from '../../components/operations/RecordMilkTestModal';
import MilkTestHistory from '../../components/operations/MilkTestHistory';
import { getApiErrorCode } from '../../lib/apiErrors';
import { getApiErrorMessage, herdApi, safetyApi } from '../../lib/backendApi';
import { formatCowIdentity, resolveCowIdentityFromHerd } from '../../lib/cowIdentity';
import { SEVERITIES, countBySeverity, daysUntilClear, formatLockExpiry, milkTestsKey, readHardlockPage } from '../../lib/milkSafety';
import { hasRole } from '../../lib/roles';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { safetyCopy as copy } from '../../i18n/safety.en';
import { tone } from '../../components/ui/tones';

// Risk is the strength of the app's blue (./tones), with the label in words.
const SEVERITY_TONE = { high: tone('critical'), medium: tone('attention'), low: tone('neutral') };

function SeverityChip({ severity }) {
  if (!severity) return <span className="text-xs text-ink-muted">{copy.notRecorded}</span>;
  const tone = SEVERITY_TONE[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-badge px-2 py-0.5 text-xs font-semibold ${tone.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" /> {copy.severity[severity]}
    </span>
  );
}

function ClearsOn({ lockExpires }) {
  const date = formatLockExpiry(lockExpires);
  const days = daysUntilClear(lockExpires);
  if (!date) return <span className="text-sm text-ink-muted">{copy.noDate}</span>;
  return (
    <span className="block text-sm">
      <span className="font-semibold text-ink">{date}</span>
      <span className={`block text-xs ${days === 0 ? 'font-semibold text-brand' : 'text-ink-muted'}`}>
        {days === 0 ? copy.withdrawalOver : copy.clearsIn(days)}
      </span>
    </span>
  );
}

function HoldSummary({ total, counts }) {
  const onHold = total > 0;
  return (
    <section className="card-machined p-5 sm:p-6" aria-labelledby="hold-summary">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${onHold ? tone('critical').surface : tone('info').surface}`} aria-hidden="true">
          {onHold ? <ShieldAlert size={20} className={tone('critical').icon} /> : <ShieldCheck size={20} className={tone('info').icon} />}
        </span>
        <div className="min-w-0">
          <h2 id="hold-summary" className="text-lg font-bold text-ink">{onHold ? copy.holdTitle(total) : copy.clearTitle}</h2>
          <p className="text-sm text-ink-muted">{onHold ? copy.holdHint : copy.clearHint}</p>
        </div>
      </div>
      {onHold && (
        <dl className="mt-4 grid grid-cols-3 divide-x divide-ink/10 rounded-card border border-ink/10">
          {SEVERITIES.map((severity) => (
            <div key={severity} className="px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_TONE[severity].dot}`} aria-hidden="true" /> {copy.severity[severity]}
              </dt>
              <dd className="mt-0.5 text-xl font-bold tabular-nums text-ink">{counts[severity]}</dd>
              <dd className="text-[11px] text-ink-muted">{copy.severityHint[severity]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function LockCard({ lock, tenantId, canRelease, canRecordTest, isReleasing, onRelease, onRecordTest }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border border-ink/10 bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-ink">{formatCowIdentity(lock)}</h3>
          <SeverityChip severity={lock.severity} />
        </div>
        <p className="text-sm text-ink">{lock.reason ?? copy.notRecorded}</p>
        <p className="text-xs text-ink-muted">{copy.medication}: {lock.medication ?? copy.notRecorded}</p>
        {lock.vetName && <p className="text-xs text-ink-muted">{copy.treatedBy(lock.vetName)}</p>}
        {lock.source === 'manual' && <p className="text-xs text-ink-muted">{lock.updatedBy ? copy.heldBy(lock.updatedBy) : copy.manualHold}</p>}
        {lock.latestTest && <p className="text-xs text-ink-muted">{copy.latestTest(lock.latestTest.test_type, lock.latestTest.result)}</p>}
        {lock.notes && <p className="text-xs text-ink-muted">{copy.notes}: {lock.notes}</p>}
        {lock.cowRecordId && (
          <Link to={`/operations/animal/${lock.cowRecordId}`} className="inline-flex min-h-8 items-center text-sm font-semibold text-brand hover:underline">
            {copy.openCow}
          </Link>
        )}
        <MilkTestHistory tenantId={tenantId} cowId={lock.cowId} />
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:text-right">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{copy.columns.clears}</p>
        <ClearsOn lockExpires={lock.lockExpires} />
        {canRecordTest && (
          <button type="button" onClick={() => onRecordTest(lock)} className="btn-ghost gap-2 text-sm font-semibold">
            <FlaskConical size={15} aria-hidden="true" /> {copy.recordTest}
          </button>
        )}
        {canRelease && (
          <button type="button" onClick={() => onRelease(lock)} disabled={isReleasing} className="btn-secondary gap-2 text-sm font-semibold">
            <Unlock size={15} aria-hidden="true" /> {copy.release}
          </button>
        )}
      </div>
    </article>
  );
}

/** Cows whose milk is on hold (withdrawal), as the backend reports them. */
export default function MilkSafetyBoard() {
  const { tenantId, farmId } = useTenant();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const confirmation = useConfirmation();
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('all');
  const canRelease = hasRole(currentUser, ['FARMER']);
  // The backend lets anyone who can see the board hold milk or record a test.
  const canRecord = hasRole(currentUser, ['FARMER', 'VET', 'FARM_HAND']);

  const boardQuery = useQuery({
    queryKey: ['hardlocks-board', tenantId, farmId],
    queryFn: () => safetyApi.hardlockPage(),
    enabled: !!tenantId && !!farmId,
  });
  const { data: herd = [] } = useQuery({
    queryKey: ['herd', tenantId, farmId],
    queryFn: () => herdApi.list(),
    enabled: !!tenantId && !!farmId,
  });

  const { items, total } = useMemo(() => readHardlockPage(boardQuery.data), [boardQuery.data]);
  const locks = useMemo(() => items.map((lock) => {
    const identity = resolveCowIdentityFromHerd({ cowId: lock.cowId, cowTag: lock.cowTag ?? '', cowName: lock.cowName ?? '' }, herd);
    return { ...lock, cowName: identity.name, cowTag: identity.earTag, cowRecordId: identity.recordId || lock.cowId };
  }), [items, herd]);
  const counts = useMemo(() => countBySeverity(locks), [locks]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return locks.filter((lock) => (severity === 'all' || lock.severity === severity)
      && (!term || [lock.cowName, lock.cowTag, lock.reason, lock.medication, lock.notes].join(' ').toLowerCase().includes(term)));
  }, [locks, query, severity]);

  // A lock the backend says isn't safe to release yet; releasing needs an audited reason.
  const [overrideLock, setOverrideLock] = useState(null);
  // { kind: 'hold' | 'test', cowId?, cowName? }
  const [form, setForm] = useState(null);

  const refreshBoard = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['hardlocks-board', tenantId, farmId] }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HARDLOCKS(tenantId, farmId) }),
  ]);
  const cowLabel = (cowId) => {
    const cow = herd.find((candidate) => String(candidate.id) === String(cowId));
    return cow ? formatCowIdentity(cow) : formatCowIdentity(locks.find((lock) => String(lock.cowId) === String(cowId)) ?? {});
  };
  const saveErrorMessage = (error, fallback) => (error?.response ? getApiErrorMessage(error, fallback) : copy.offlineSafety);

  const placeHold = useMutation({
    mutationFn: (values) => safetyApi.placeHold(values),
    onSuccess: async (result, values) => {
      setForm(null);
      await refreshBoard();
      toast.success(copy.held(cowLabel(values.cowId)));
    },
  });
  const recordTest = useMutation({
    mutationFn: (values) => safetyApi.recordMilkTest(values),
    onSuccess: async (result, values) => {
      setForm(null);
      await Promise.all([refreshBoard(), queryClient.invalidateQueries({ queryKey: milkTestsKey(tenantId, values.cowId) })]);
      const cow = cowLabel(values.cowId);
      toast.success(result.placedOnHold ? copy.testFailedHeld(cow) : copy.testSaved(cow));
    },
  });
  const openForm = (kind, lock) => {
    placeHold.reset();
    recordTest.reset();
    // A cow added since the board loaded (another phone, another tab) must be choosable.
    queryClient.invalidateQueries({ queryKey: ['herd', tenantId, farmId] });
    setForm({ kind, cowId: lock?.cowId ?? '', cowName: lock ? formatCowIdentity(lock) : null });
  };

  const release = useMutation({
    mutationFn: ({ lock, overrideReason }) => safetyApi.setHardlock(lock.cowId, false, { overrideReason }),
    onSuccess: async (result, { lock }) => {
      setOverrideLock(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hardlocks-board', tenantId, farmId] }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HARDLOCKS(tenantId, farmId) }),
      ]);
      toast.success(copy.released(formatCowIdentity(lock)));
    },
    onError: (error, { lock }) => {
      // The withdrawal is still running on the server: ask for the reason instead.
      if (getApiErrorCode(error) === 'WITHDRAWAL_ACTIVE') {
        setOverrideLock({ ...lock, withdrawalEndsAt: error.response.data?.withdrawal_ends_at ?? lock.withdrawalEndsAt });
        return;
      }
      toast.error(error?.response ? getApiErrorMessage(error, copy.releaseFailed) : copy.offlineRelease);
    },
  });

  const confirmRelease = async (lock) => {
    if (!lock.canRelease || lock.withdrawalActive) {
      setOverrideLock(lock);
      return;
    }
    const confirmed = await confirmation.confirm({
      title: copy.releaseTitle(formatCowIdentity(lock)),
      message: copy.releaseMessage,
      confirmText: copy.release,
      type: 'warning',
    });
    if (confirmed) release.mutate({ lock });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-6 pt-4 animate-reveal sm:px-6">
      <Confirmation {...confirmation} />
      {overrideLock && (
        <ReleaseMilkModal
          lock={overrideLock}
          cowName={formatCowIdentity(overrideLock)}
          onClose={() => setOverrideLock(null)}
          onConfirm={(overrideReason) => release.mutate({ lock: overrideLock, overrideReason })}
          isPending={release.isPending}
        />
      )}
      {form?.kind === 'hold' && (
        <PlaceHoldModal
          cows={herd}
          initialCowId={form.cowId}
          onClose={() => setForm(null)}
          onSubmit={(values) => placeHold.mutate(values)}
          isPending={placeHold.isPending}
          error={placeHold.isError ? saveErrorMessage(placeHold.error, copy.holdFailed) : null}
        />
      )}
      {form?.kind === 'test' && (
        <RecordMilkTestModal
          cows={herd}
          initialCowId={form.cowId}
          cowName={form.cowName}
          onClose={() => setForm(null)}
          onSubmit={(values) => recordTest.mutate(values)}
          isPending={recordTest.isPending}
          error={recordTest.isError ? saveErrorMessage(recordTest.error, copy.testSaveFailed) : null}
        />
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{copy.eyebrow}</p>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          {canRecord && (
            <>
              <button type="button" onClick={() => openForm('hold')} className="btn-command gap-2 text-sm">
                <Hand size={15} aria-hidden="true" /> {copy.placeHold}
              </button>
              <button type="button" onClick={() => openForm('test')} className="btn-secondary gap-2 text-sm">
                <FlaskConical size={15} aria-hidden="true" /> {copy.recordTest}
              </button>
            </>
          )}
          <button type="button" onClick={() => boardQuery.refetch()} disabled={boardQuery.isFetching} className="btn-ghost gap-2 text-sm">
            <RefreshCw size={15} className={boardQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" />
            {boardQuery.isFetching ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      {boardQuery.isError ? (
        <AlertBanner type="danger" message={copy.loadFailed} onRetry={() => boardQuery.refetch()} />
      ) : boardQuery.isLoading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-28 w-full" />)}</div>
      ) : (
        <>
          <HoldSummary total={total} counts={counts} />

          {total > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">{copy.search}</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="input-machined w-full pl-9 text-sm" />
              </label>
              <label className="sm:w-48">
                <span className="sr-only">{copy.columns.risk}</span>
                <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="input-machined w-full text-sm">
                  <option value="all">{copy.allSeverities}</option>
                  {SEVERITIES.map((value) => <option key={value} value={value}>{copy.severity[value]}</option>)}
                </select>
              </label>
            </div>
          )}

          {total > locks.length && <p className="text-xs text-ink-muted">{copy.showing(locks.length, total)}</p>}

          <div className="space-y-3">
            {visible.map((lock) => (
              <LockCard
                key={lock.id}
                lock={lock}
                tenantId={tenantId}
                canRelease={canRelease}
                canRecordTest={canRecord}
                onRecordTest={(target) => openForm('test', target)}
                isReleasing={release.isPending && release.variables?.lock?.cowId === lock.cowId}
                onRelease={confirmRelease}
              />
            ))}
          </div>

          {total > 0 && visible.length === 0 && (
            <p className="text-sm text-ink-muted">
              {copy.noMatches}{' '}
              <button type="button" onClick={() => { setQuery(''); setSeverity('all'); }} className="font-semibold text-brand hover:underline">{copy.clearFilters}</button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
