import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import InlineNotice from '../../components/ui/InlineNotice';
import { nutritionApi } from '../../lib/backendApi';
import { getFeedErrorMessage } from '../../lib/feedErrors';
import { feedingGroupLabel } from '../../lib/feedingGroups';
import { getFeedingReadiness, isValidFeedAmount } from '../../lib/feedingToday';
import { todayLocalIso } from '../../lib/localDate';
import { isQueuedOffline, queuedOfflineMessage } from '../../lib/offlinePolicy';
import LABELS from '../../lib/labels';
import { useTenant } from '../../hooks/useTenant';
import { feedCopy } from '../../i18n/feed';
import RecordedValue from '../../components/ui/RecordedValue';

const { today: copy } = feedCopy;

const kg = (value) => Number(Number(value || 0).toFixed(2));

/**
 * What the people doing the feeding need, and nothing else: how much each
 * group gets and a one-tap "Fed" record. No prices, costs or recipe shares
 * (page access `feeding`, backend `GET /nutrition/feeding/today`).
 */
export default function TodayFeedingPage() {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();

  const todayQuery = useQuery({
    queryKey: ['feeding-today', tenantId, farmId],
    queryFn: () => nutritionApi.feedingToday(),
    enabled: !!tenantId && !!farmId,
  });

  const recordFeeding = useMutation({
    mutationFn: ({ batchId, amount, group }) => nutritionApi.createConsumptionEvent(batchId, {
      consumedWeight: amount,
      consumedOn: todayLocalIso(),
      feeding_group: group,
    }),
    onSuccess: async (result, { amount, group }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feeding-today', tenantId, farmId] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-feed-cost-efficiency', tenantId, farmId] }),
      ]);
      if (isQueuedOffline(result)) toast(queuedOfflineMessage());
      else toast.success(copy.recorded(amount, feedingGroupLabel(group)));
    },
    onError: (error) => toast.error(getFeedErrorMessage(error, feedCopy.errors.recordFeeding)),
  });

  const today = todayQuery.data;
  const groups = today?.groups ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-reveal">
      <header className="border-b border-ink/10 pb-4">
        <h1 className="text-page-title text-ink">{LABELS.TODAY_FEEDING}</h1>
        <p className="mt-1 text-body text-ink-muted">{copy.subtitle}</p>
        {today?.totals && (
          <p className="mt-2 text-meta text-ink-muted">
            {/* Figures the backend didn't send show as "—", never as 0. */}
            <RecordedValue value={today.totals.total_active_animals} format={copy.animalCount} missingLabel={copy.animalsNotRecorded} />
            {' · '}
            <RecordedValue value={today.totals.total_daily_feed_kg} format={(value) => copy.feedNeeded(kg(value))} missingLabel={copy.feedNotRecorded} />
          </p>
        )}
      </header>

      {todayQuery.isLoading && (
        <p role="status" className="flex items-center gap-2 text-body text-ink-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {copy.loading}
        </p>
      )}

      {todayQuery.isError && (
        <AlertBanner
          type="danger"
          message={getFeedErrorMessage(todayQuery.error, feedCopy.errors.loadToday)}
          action={{ label: copy.retry, onClick: () => todayQuery.refetch() }}
        />
      )}

      {todayQuery.isSuccess && groups.length === 0 && <p className="text-body text-ink-muted">{copy.empty}</p>}

      <div className="space-y-4">
        {groups.map((group) => (
          <GroupCard
            key={group.feeding_group}
            group={group}
            readiness={getFeedingReadiness(today, group)}
            isRecording={recordFeeding.isPending && recordFeeding.variables?.group === group.feeding_group}
            onFed={(batchId, amount) => recordFeeding.mutateAsync({ batchId, amount, group: group.feeding_group })}
          />
        ))}
      </div>

      {(today?.active_batches ?? []).length > 0 && (
        <section aria-labelledby="feed-in-store" className="rounded-card border border-ink/10 bg-surface p-4">
          <h2 id="feed-in-store" className="mb-3 text-section-title text-ink">{copy.batchesTitle}</h2>
          <ul className="divide-y divide-ink/10">
            {today.active_batches.map((batch) => (
              <li key={batch.batch_id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-body">
                <span className="text-body-strong text-ink">{batch.batch_name}</span>
                <span className="text-ink-muted">
                  {copy.remaining(kg(batch.remaining_kg))}
                  {Number.isFinite(Number(batch.days_until_empty)) && batch.days_until_empty !== null && ` · ${copy.daysLeft(kg(batch.days_until_empty))}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Measure({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-meta text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-body-strong tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function GroupCard({ group, readiness, isRecording, onFed }) {
  // Prefilled with one feeding's worth, so "Fed" is a single tap on most days.
  const [amount, setAmount] = useState(readiness.perFeedingKg ? String(readiness.perFeedingKg) : '');
  const buckets = group.physical_measures?.group_buckets_per_feeding;
  const amountOk = isValidFeedAmount(amount, readiness.batch);

  const submit = async (event) => {
    event.preventDefault();
    if (!amountOk) return;
    try {
      await onFed(readiness.batch.batch_id, Number(amount));
    } catch {
      // The page shows the error; keep the amount for another try.
    }
  };

  return (
    <article className="rounded-card border border-ink/10 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-section-title text-ink">{feedingGroupLabel(group.feeding_group)}</h2>
          <p className="text-meta text-ink-muted">
            {copy.headcount(group.headcount ?? 0)}
            {group.mix_name && ` · ${group.mix_name}`}
            {group.quantity_label && ` · ${group.quantity_label}`}
          </p>
        </div>
        {group.feeding_times_per_day > 0 && (
          <span className="shrink-0 rounded-badge border border-brand/20 bg-brand-50 px-2 py-1 text-badge text-brand-dark">{copy.timesPerDay(group.feeding_times_per_day)}</span>
        )}
      </div>

      {!readiness.canFeed ? (
        <div className="mt-3">
          <InlineNotice tone="warning" title={copy.notReadyTitle}>{readiness.reason}</InlineNotice>
        </div>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-brand-50 p-3 sm:grid-cols-4">
            <Measure label={copy.perFeeding} value={`${kg(group.group_batch_per_feeding_kg)} kg`} />
            <Measure label={copy.perHead} value={`${kg(group.kg_per_head_per_feeding)} kg`} />
            <Measure label={copy.perDay} value={`${kg(group.daily_group_batch_kg)} kg`} />
            {buckets > 0 && <Measure label={copy.bucketsPerFeeding} value={copy.buckets(kg(buckets))} />}
          </dl>

          <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-meta text-ink-muted">{copy.recordLabel}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                max={readiness.batch?.remaining_kg}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={amount !== '' && !amountOk ? true : undefined}
                className="input-machined text-control"
              />
            </label>
            <button type="submit" disabled={isRecording || !amountOk} className="btn-command min-h-12 gap-2 px-5 text-control">
              {isRecording ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> {copy.recording}</> : copy.record}
            </button>
          </form>
          {!amountOk && amount !== '' && (
            <p className="mt-1 text-meta text-danger">{copy.amountInvalid(kg(readiness.batch?.remaining_kg))}</p>
          )}
        </>
      )}
    </article>
  );
}
