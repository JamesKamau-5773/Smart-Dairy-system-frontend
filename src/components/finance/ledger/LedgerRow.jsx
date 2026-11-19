import { ChevronDown } from 'lucide-react';
import OverflowMenu from '../../ui/OverflowMenu';
import { StatusBadge } from '../../ui/StatusBadge';
import { cellClass } from '../../data/DataTable';
import { descriptionOf, hasReceipt, partyOf } from '../../../lib/ledgerRecord';
import LedgerAmount from './LedgerAmount';
import { enumLabel } from '../../../lib/enumLabel';
import { formatDate } from '../../../lib/dateFormat';
import { LEDGER_STATUS_STYLES } from './ledgerTableConfig';
import { financeCopy } from '../../../i18n/finance';

const dash = <span className="text-meta text-ink-muted">—</span>;
// Clicks on these inside a row do their own thing instead of opening the row.
const INTERACTIVE = 'a, button, input, select, [role="menu"], [role="menuitem"], [role="dialog"]';

/**
 * A record's status badge, styled from LEDGER_STATUS_STYLES. `quiet` (the phone list) leaves out
 * the normal state's badge; "—" when the API sent no status, unless quiet.
 */
export function LedgerStatus({ status, quiet = false }) {
  if (!status) return quiet ? null : dash;
  const key = String(status).toLowerCase().replace(/_/g, ' ');
  const style = LEDGER_STATUS_STYLES[key] ?? LEDGER_STATUS_STYLES.fallback;
  if (quiet && style.quietInList) return null;
  return <StatusBadge label={enumLabel(financeCopy.ledger.statuses, key)} tone={style.tone} struck={style.struck} />;
}

function ReceiptLink({ tx, onOpen }) {
  if (!hasReceipt(tx)) return null;
  return (
    <button type="button" onClick={() => onOpen(tx)} className="!rounded-none text-body text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      {financeCopy.ledger.viewReceipt}
    </button>
  );
}

function RowMenu({ tx, items, size }) {
  return <OverflowMenu label={financeCopy.ledger.actionsFor(partyOf(tx), formatDate(tx.date, financeCopy.ledger.noDate))} size={size} items={items} />;
}

/**
 * A desktop ledger row (44px) and, when open, its detail row with the full description,
 * reference and category. The whole row opens the detail, as does the chevron.
 *
 * categoryText(code) → label; menuItems: the ⋮ items; onOpenReceipt(tx)
 */
export function LedgerTableRow({ tx, columns, expanded, onToggle, categoryText, menuItems, onOpenReceipt }) {
  const copy = financeCopy.ledger;
  const description = descriptionOf(tx);
  const detailId = `ledger-detail-${tx.id}`;
  const column = Object.fromEntries(columns.map((entry) => [entry.id, entry]));
  const cell = (id, extra = '') => cellClass(column[id], `!py-0 ${extra}`);
  const openFromRow = (event) => {
    if (event.target.closest(INTERACTIVE)) return;
    onToggle();
  };

  return [
    <tr key={tx.id} onClick={openFromRow} className="h-11 cursor-pointer border-b border-ink/5 hover:bg-ink-50/60">
      <td className={cell('party')}><span className="block truncate text-body-strong text-ink" title={partyOf(tx)}>{partyOf(tx)}</span></td>
      <td className={cell('category')}><span className="block truncate text-meta text-ink-muted" title={tx.category ? categoryText(tx.category) : undefined}>{categoryText(tx.category)}</span></td>
      <td className={cell('description')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailId}
          title={description || undefined}
          className="flex w-full min-w-0 items-center gap-1 !rounded-none text-left text-body"
        >
          <span className="min-w-0 truncate">
            {tx.item_name && <span className="text-body-strong text-ink">{tx.item_name}</span>}
            {tx.item_name && tx.description && <span className="text-ink-muted"> · </span>}
            <span className="text-ink-muted">{tx.description || (tx.item_name ? '' : '—')}</span>
          </span>
          <ChevronDown size={13} aria-hidden="true" className={`ml-auto shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </td>
      <td className={cell('ref')}>
        {tx.reference_code
          ? <span className="block truncate text-meta tabular-nums text-ink-muted" title={tx.reference_code}>{tx.reference_code}</span>
          : dash}
      </td>
      <td className={cell('amount', 'whitespace-nowrap')}><LedgerAmount tx={tx} /></td>
      <td className={cell('status')}><LedgerStatus status={tx.status} /></td>
      <td className={cell('receipt')}><ReceiptLink tx={tx} onOpen={onOpenReceipt} /></td>
      <td className={cell('actions')}><RowMenu tx={tx} items={menuItems} size="h-8 w-8" /></td>
    </tr>,
    expanded && (
      <tr key={`${tx.id}-detail`} id={detailId} className="border-b border-ink/5 bg-ink-50/60">
        <td colSpan={columns.length} className="px-4 !py-3">
          <dl className="grid gap-x-6 gap-y-2 text-body sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0"><dt className="text-meta text-ink-muted">{copy.description}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-ink">{description || '—'}</dd></div>
            <div className="min-w-0"><dt className="text-meta text-ink-muted">{copy.reference}</dt><dd className="mt-0.5 break-all tabular-nums text-ink">{tx.reference_code || '—'}</dd></div>
            <div className="min-w-0"><dt className="text-meta text-ink-muted">{copy.category}</dt><dd className="mt-0.5 break-words text-ink">{categoryText(tx.category)}</dd></div>
          </dl>
        </td>
      </tr>
    ),
  ];
}
