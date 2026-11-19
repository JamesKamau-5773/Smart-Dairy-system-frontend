import { useState } from 'react';
import BottomSheet from '../../ui/BottomSheet';
import { formatDate } from '../../../lib/dateFormat';
import { categoryLabeler, hasReceipt, partyOf } from '../../../lib/ledgerRecord';
import { financeCopy } from '../../../i18n/finance';
import { LedgerStatus } from './LedgerRow';
import LedgerAmount from './LedgerAmount';
import { TRANSACTION_FIELDS } from './transactionFields';

/**
 * A ledger record's details as a bottom sheet (phones and tablets): who, the amount, the date
 * and status, the fields in TRANSACTION_FIELDS (empty ones left out), and two actions:
 * "More actions" (the same items as the table's ⋮ menu) and "View receipt" (only when there
 * is one). Presentational: every value and action comes in as props.
 *
 * tx:            the record, or null when closed
 * categories:    useLedgerCategories() lists
 * menuItems:     the ⋮ items for this record ([{ key, label, onSelect } | falsy])
 * onViewReceipt: (tx) → void
 */
export default function TransactionSheet({ tx, categories, menuItems = [], onViewReceipt, onClose }) {
  const copy = financeCopy.ledger.sheet;
  const [showActions, setShowActions] = useState(false);
  const open = Boolean(tx);
  const actions = (menuItems ?? []).filter(Boolean);
  const receipt = open && hasReceipt(tx);

  const close = () => {
    setShowActions(false);
    onClose();
  };
  // The sheet closes first, so the dialog an action opens isn't stacked on it.
  const run = (action) => {
    close();
    action();
  };

  const fields = open
    ? TRANSACTION_FIELDS
      .map((field) => ({ key: field.key, label: field.label, value: field.value(tx, { categoryText: categoryLabeler(categories) }) }))
      .filter((field) => field.value)
    : [];
  const buttons = [
    actions.length > 0 && (
      <button key="more" type="button" onClick={() => setShowActions((current) => !current)} aria-expanded={showActions} className="btn-secondary min-h-12 w-full rounded-button">
        {copy.moreActions}
      </button>
    ),
    receipt && (
      <button key="receipt" type="button" onClick={() => run(() => onViewReceipt(tx))} className="btn-outline-brand min-h-12 w-full">
        {financeCopy.ledger.viewReceipt}
      </button>
    ),
  ].filter(Boolean);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={open ? partyOf(tx) : ''}
      titleClassName="text-body-strong text-ink-muted"
      closeLabel={copy.close}
      header={open && (
        <>
          <p className="m-0 mt-1 text-ink"><LedgerAmount tx={tx} tone="neutral" className="text-money-value-primary" /></p>
          <p className="m-0 mt-2 flex flex-wrap items-center gap-2 text-body tabular-nums text-ink-muted">
            <span>{formatDate(tx.date)}</span>
            <LedgerStatus status={tx.status} />
          </p>
        </>
      )}
    >
      {fields.length > 0 && (
        <dl className="mx-4 mt-4 divide-y divide-ink/10 border-y border-ink/10">
          {fields.map((field) => (
            <div key={field.key} className="flex items-start justify-between gap-4 py-3">
              <dt className="shrink-0 text-body text-ink-muted">{field.label}</dt>
              <dd className="m-0 min-w-0 break-words text-right text-body text-ink">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {buttons.length > 0 && (
        <div className={`mx-4 mt-4 grid gap-3 ${buttons.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>{buttons}</div>
      )}

      {showActions && (
        <div role="group" aria-label={copy.moreActions} className="mx-4 mt-3 divide-y divide-ink/10 rounded-card border border-ink/10">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={() => run(action.onSelect)}
              className="flex min-h-12 w-full items-center !rounded-none px-4 text-left text-control text-ink hover:bg-ink-50 disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
