import { useQuery } from '@tanstack/react-query';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { herdApi } from '../../lib/backendApi';
import { formatLitres } from '../../lib/numberFormat';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatDate } from '../../lib/herdUtils';
import { productionCopy, sessionLabel } from '../../i18n/production';
import { toQueuedMilkRows } from '../../lib/queuedMilkRows';

/** Milk entries saved on this phone that haven't reached the server yet. */
export default function QueuedMilkEntries() {
  const { tenantId, farmId } = useTenant();
  const { entries, online, flushing } = useOfflineQueue();
  const hasQueuedMilk = entries.some((entry) => /\/production\/yield$/.test(entry.request?.url || ''));

  // Same query the milk form uses, so cow names usually come straight from cache.
  const { data: cowsRaw } = useQuery({
    queryKey: QUERY_KEYS.COWS(tenantId, farmId),
    queryFn: () => herdApi.list(),
    enabled: !!farmId && hasQueuedMilk,
  });
  const herd = Array.isArray(cowsRaw) ? cowsRaw : (cowsRaw?.items ?? []);
  const rows = toQueuedMilkRows(entries, herd);

  if (rows.length === 0) return null;

  const copy = productionCopy.queued;
  const statusText = !online ? copy.whenOnline : flushing ? copy.sending : copy.soon;

  return (
    <section aria-labelledby="queued-milk-title" className="min-w-0 rounded-card border border-ink/10 bg-card">
      <div className="border-b border-ink/10 px-4 py-3 sm:px-6">
        <h2 id="queued-milk-title" className="text-section-title text-ink">
          {copy.title(rows.length)}
        </h2>
        <p className="mt-1 text-meta text-ink-muted">{copy.savedHere} {statusText}</p>
      </div>
      <ul className="divide-y divide-ink/10">
        {rows.map((row) => (
          <li key={row.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="break-words text-body-strong text-ink">{formatCowIdentity(row.cow, copy.cow)}</p>
              <p className="mt-0.5 text-meta text-ink-muted">{formatDate(row.date)} · {sessionLabel(row.session)}</p>
              {row.needsAttention && row.error && <p className="mt-1 text-meta text-danger-900">{row.error}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-body-strong tabular-nums text-ink">{formatLitres(row.amount)}</span>
              {row.needsAttention ? (
                <span className="inline-flex items-center rounded-badge border border-danger-500/30 bg-danger-50 px-2 py-1 text-badge text-danger-900">
                  {copy.needsAttention}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-badge border border-warning-500/40 bg-warning-50 px-2 py-1 text-badge text-ink">
                  {copy.notSent}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
