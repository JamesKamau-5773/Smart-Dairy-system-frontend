import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Link2Off, Receipt } from 'lucide-react';
import { financeApi } from '../../lib/backendApi';
import { normalizeStatement } from '../../lib/customerStatement';
import { isFeatureEnabled } from '../../lib/featureFlags';
import { formatMoneyText } from '../../components/ui/Money';
import { Skeleton } from '../../components/ui';
import { SITE } from '../../landing/content';
import { financeCopy } from '../../i18n/finance';

const STATUS_NOT_FOUND = 404;
const MAX_RETRIES = 2;

function Notice({ icon: Icon, title, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-warm p-4">
      <section aria-labelledby="statement-notice" className="mx-auto w-full max-w-md rounded-card border border-ink/10 bg-surface p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
          <Icon size={22} aria-hidden="true" />
        </div>
        <h1 id="statement-notice" className="text-xl font-bold text-ink">{title}</h1>
        <div className="mt-2 text-sm leading-6 text-ink-muted">{children}</div>
      </section>
    </main>
  );
}

/**
 * A buyer's statement opened from a shared link. Shows only what the backend's statement
 * route returns; a missing figure is "—". Off unless the `customerPortal` flag is on, because
 * today's links use the buyer's phone number as the token (BR-016); while off, no request is made.
 */
export default function CustomerPortal() {
  const copy = financeCopy.portal;
  const { token } = useParams();
  const enabled = isFeatureEnabled('customerPortal');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['shared-statement', token],
    queryFn: async () => normalizeStatement(await financeApi.statement(token)),
    enabled: enabled && Boolean(token),
    // An unknown link won't start working on a retry.
    retry: (count, err) => err?.response?.status !== STATUS_NOT_FOUND && count < MAX_RETRIES,
  });
  // Not sent to telemetry: the request address holds the link token.

  if (!enabled) {
    return (
      <Notice icon={Link2Off} title={copy.offTitle}>
        {copy.offMessage}
      </Notice>
    );
  }
  if (isLoading) {
    return <main className="p-4 sm:p-8" aria-busy="true"><span className="sr-only">{copy.loading}</span><Skeleton className="mx-auto h-96 w-full max-w-4xl" /></main>;
  }
  if (isError) {
    if (error?.response?.status === STATUS_NOT_FOUND) {
      return (
        <Notice icon={Link2Off} title={copy.invalidTitle}>
          {copy.invalidMessage}
        </Notice>
      );
    }
    return (
      <Notice icon={AlertTriangle} title={copy.failedTitle}>
        <p>{copy.failedMessage}</p>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-command mt-6 inline-flex justify-center">
          {isFetching ? copy.retrying : copy.retry}
        </button>
      </Notice>
    );
  }

  const { customerName, balance, transactions } = data;

  return (
    <main className="flex min-h-screen justify-center bg-surface-warm p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-6">
        <header className="border-b border-ink/10 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{copy.eyebrow(SITE.name)}</p>
          <h1 className="mt-2 break-words text-2xl font-bold text-ink sm:text-3xl">{customerName ?? '—'}</h1>
        </header>

        <section aria-labelledby="statement-balance" className="rounded-card border border-ink/10 bg-surface p-6">
          <h2 id="statement-balance" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            <Receipt size={16} aria-hidden="true" /> {copy.balance}
          </h2>
          <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-ink-strong">{formatMoneyText(balance)}</p>
        </section>

        <section aria-labelledby="statement-transactions" className="overflow-hidden rounded-card border border-ink/10 bg-surface">
          <h2 id="statement-transactions" className="border-b border-ink/10 p-4 text-lg font-semibold text-ink sm:p-6">{copy.transactions}</h2>
          {transactions.length === 0 ? (
            <p className="p-6 text-sm text-ink-muted">{copy.noTransactions}</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {transactions.map((tx, index) => (
                <li key={tx.id ?? index} className="flex items-start justify-between gap-4 p-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-ink">{tx.description ?? '—'}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {tx.date ?? '—'}{tx.reference ? ` · ${tx.reference}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">{formatMoneyText(tx.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
