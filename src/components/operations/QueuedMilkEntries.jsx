import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { herdApi } from '../../lib/backendApi';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatDate } from '../../lib/herdUtils';
import { toNormalizedSessionLabel } from '../../lib/milkUtils';
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

  const statusText = !online
    ? 'They will be sent automatically when you’re back online.'
    : flushing ? 'Sending now…' : 'They will be sent automatically in a moment.';

  return (
    <section aria-labelledby="queued-milk-title" className="card-machined !p-0">
      <div className="border-b border-ink/10 px-4 py-3 sm:px-6">
        <h2 id="queued-milk-title" className="flex items-center gap-2 text-sm font-bold text-ink">
          <Clock3 size={16} className="text-brand" aria-hidden="true" />
          Not sent yet ({rows.length})
        </h2>
        <p className="mt-1 text-xs text-ink-muted">Saved on this phone. {statusText}</p>
      </div>
      <ul className="divide-y divide-ink/10">
        {rows.map((row) => (
          <li key={row.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="break-words font-semibold text-ink">{formatCowIdentity(row.cow, 'Cow')}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{formatDate(row.date)} · {toNormalizedSessionLabel(row.session)}</p>
              {row.needsAttention && row.error && <p className="mt-1 text-xs text-danger-900">{row.error}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-lg font-bold tabular-nums text-brand">{row.amount} L</span>
              {row.needsAttention ? (
                <span className="inline-flex items-center gap-1 rounded-badge border border-danger-500/30 bg-danger-50 px-2 py-1 text-[10px] font-semibold text-danger-900">
                  <AlertTriangle size={11} aria-hidden="true" /> Needs attention
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-badge border border-warning-500/40 bg-warning-50 px-2 py-1 text-[10px] font-semibold text-ink">
                  <Clock3 size={11} aria-hidden="true" /> Not sent yet
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
