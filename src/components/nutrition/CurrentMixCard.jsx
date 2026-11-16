import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import { FEEDING_GROUPS } from '../../lib/feedingGroups';
import { feedCopy } from '../../i18n/feed';
import { tone } from '../ui/tones';

const { currentMix: copy } = feedCopy;
const critical = tone('critical');

const LOW_STOCK_DAYS = 3;

/** Why "Record feeding" can't be pressed yet, or '' when it can. */
function recordFeedingBlocker({ feedingGroup, amount, remaining }) {
  if (!feedingGroup) return feedCopy.recordFeeding.chooseGroup;
  if (!amount) return feedCopy.recordFeeding.enterAmount;
  if (amount > remaining) return feedCopy.recordFeeding.onlyLeft(remaining);
  return '';
}

function CardHeader({ recipeType, title, subtitle }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{copy.heading}</p>
        <h3 className="mt-1 break-words text-lg font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      <span className="inline-flex shrink-0 items-center rounded-badge bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-dark">
        {copy.types[recipeType]}
      </span>
    </header>
  );
}

function StockMeter({ percent, isLow }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink">
        <span>{copy.stockLevel}</span>
        <span className="font-mono tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-ink-100"
        role="meter"
        aria-label={copy.stockLevel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${isLow ? critical.bar : 'bg-brand'}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DepletionForecast({ daysLeft, feedingRate, isLow }) {
  if (daysLeft === null) {
    return (
      <div className="text-sm">
        <div>
          <p className="font-semibold text-ink">{copy.noForecast}</p>
          <p className="text-xs text-ink-muted">{copy.noForecastHint}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 text-sm">
      {isLow && <AlertCircle size={16} className={`mt-0.5 shrink-0 ${critical.icon}`} aria-hidden="true" />}
      <div>
        <p className={`font-semibold ${isLow ? critical.icon : 'text-ink'}`}>{isLow ? copy.lowStock(daysLeft) : copy.daysLeft(daysLeft)}</p>
        {feedingRate !== null && <p className="text-xs text-ink-muted">{copy.pace(feedingRate)}</p>}
      </div>
    </div>
  );
}

function MixStats({ consumedWeight, remainingWeight }) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-ink/10 rounded-card border border-ink/10">
      {[[copy.fedSoFar, consumedWeight], [copy.inStore, remainingWeight]].map(([label, value]) => (
        <div key={label} className="px-3 py-2.5 text-center">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
          <dd className="mt-0.5 font-mono text-base font-bold tabular-nums text-ink">{value === null || value === undefined ? copy.unknown : `${value} kg`}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecordFeedingForm({ mix, isRecording, onRecordConsumption }) {
  const [consumedWeight, setConsumedWeight] = useState('');
  const [feedingGroup, setFeedingGroup] = useState('');
  const blocker = recordFeedingBlocker({ feedingGroup, amount: Number(consumedWeight), remaining: mix.remainingWeight });
  const inputId = `consumption-${mix.batchId}`;

  const submit = async (event) => {
    event.preventDefault();
    if (blocker) return;
    try {
      await onRecordConsumption({ consumedWeight: Number(consumedWeight), feedingGroup });
      setConsumedWeight('');
    } catch {
      // The parent mutation shows the backend's message.
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-ink/10 pt-4">
      <label htmlFor={inputId} className="mb-2 block text-xs font-semibold text-ink">{copy.feedUsed}</label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <select
          value={feedingGroup}
          onChange={(event) => setFeedingGroup(event.target.value)}
          aria-label={copy.group}
          className="input-machined min-w-0 text-sm"
          required
        >
          <option value="">{copy.selectGroup}</option>
          {FEEDING_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
        </select>
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min="0.001"
          max={mix.remainingWeight}
          step="any"
          value={consumedWeight}
          onChange={(event) => setConsumedWeight(event.target.value)}
          placeholder={copy.upTo(mix.remainingWeight)}
          className="input-machined min-w-0 font-mono text-sm tabular-nums"
        />
        <button
          type="submit"
          disabled={isRecording || Boolean(blocker)}
          aria-describedby={blocker ? `${inputId}-blocker` : undefined}
          className="btn-command gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRecording ? copy.recording : copy.record}
        </button>
      </div>
      {blocker && !isRecording && <p id={`${inputId}-blocker`} className="mt-2 text-xs text-ink-muted">{blocker}</p>}
    </form>
  );
}

/**
 * The batch of one mix type that is being fed now: what's left, how long it
 * lasts, and recording what was fed. Shows an empty state with the next step
 * when no batch of this type is in store.
 */
/**
 * @param {object} props
 * @param {'loading'|'offline'|'error'|'stale'|'ready'} [props.status] The load state of what's
 *   in store (`getListLoadState`). `stale` shows the batch saved on this phone, like `ready`.
 */
export default function CurrentMixCard({ recipeType = 'dairy_meal', mix, status = 'ready', onRetry, onRecordConsumption, isRecording = false, onMixBatch }) {
  const typeLabel = copy.types[recipeType];

  // Until the backend has answered, "nothing in store" would be a guess.
  if (status !== 'ready' && status !== 'stale') {
    return (
      <section className="card-machined flex flex-col gap-4 p-5 sm:p-6" aria-label={typeLabel} aria-busy={status === 'loading' || undefined}>
        <CardHeader recipeType={recipeType} title={typeLabel} />
        {status === 'loading' ? (
          <div role="status" className="space-y-3">
            <span className="sr-only">{copy.loading}</span>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : status === 'offline' ? (
          <p role="status" className="text-sm text-ink">{copy.loadOffline}</p>
        ) : (
          <>
            <p role="alert" className="text-sm text-ink">{copy.loadFailed}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn-secondary gap-2 self-start text-sm font-semibold">
                {copy.retry}
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  if (!mix) {
    return (
      <section className="card-machined flex flex-col gap-4 p-5 sm:p-6" aria-label={typeLabel}>
        <CardHeader recipeType={recipeType} title={copy.emptyTitle(typeLabel)} />
        <p className="text-sm text-ink-muted">{copy.emptyHint}</p>
        {onMixBatch && (
          <button type="button" onClick={onMixBatch} className="btn-secondary mt-auto gap-2 self-start text-sm font-semibold">
            {copy.emptyAction(typeLabel)}
          </button>
        )}
      </section>
    );
  }

  // Display only: the share of the backend's total that the backend says is left.
  const percent = mix.totalWeight > 0 && mix.remainingWeight !== null && mix.remainingWeight !== undefined
    ? Math.max(0, Math.min(100, Math.round((mix.remainingWeight / mix.totalWeight) * 100)))
    : null;
  const daysLeft = mix.daysUntilEmpty ?? null;
  const isLow = daysLeft !== null && daysLeft <= LOW_STOCK_DAYS;

  return (
    <section className="card-machined flex flex-col gap-4 p-5 sm:p-6" aria-label={typeLabel}>
      <CardHeader recipeType={recipeType} title={mix.name} subtitle={mix.mixedOn ? `${copy.mixedOn} ${mix.mixedOn}` : null} />
      {percent !== null && <StockMeter percent={percent} isLow={isLow} />}
      <DepletionForecast daysLeft={daysLeft} feedingRate={mix.dailyFeedingRate ?? null} isLow={isLow} />
      <MixStats consumedWeight={mix.consumedWeight} remainingWeight={mix.remainingWeight} />
      {mix.remainingWeight > 0 && onRecordConsumption && (
        <RecordFeedingForm mix={mix} isRecording={isRecording} onRecordConsumption={onRecordConsumption} />
      )}
      {onMixBatch && (
        <button type="button" onClick={onMixBatch} className="btn-ghost gap-2 self-start text-sm">
          {copy.mixAgain}
        </button>
      )}
    </section>
  );
}
