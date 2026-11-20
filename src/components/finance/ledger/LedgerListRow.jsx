import { partyOf } from '../../../lib/ledgerRecord';
import { LedgerStatus } from './LedgerRow';
import LedgerAmount from './LedgerAmount';

/**
 * One record in the phone list: the whole row is one button (at least 64px) that opens the
 * record's sheet. Line one: who | amount; line two: category, and a badge only for a status
 * other than the normal one. Amounts keep the text colour; the minus shows the direction.
 */
export default function LedgerListRow({ tx, categoryText, onSelect }) {
  return (
    <button
      type="button"
      onClick={(event) => onSelect(tx, event.currentTarget)}
      data-record-id={tx.id}
      className="flex min-h-16 w-full min-w-0 flex-col justify-center gap-0.5 !rounded-none bg-card px-4 py-2.5 text-left hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
    >
      <span className="flex w-full min-w-0 items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-body-strong text-ink">{partyOf(tx)}</span>
        <span className="shrink-0 whitespace-nowrap text-ink"><LedgerAmount tx={tx} tone="neutral" /></span>
      </span>
      <span className="flex w-full min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-meta text-ink-muted">{categoryText(tx.category)}</span>
        <LedgerStatus status={tx.status} quiet />
      </span>
    </button>
  );
}
