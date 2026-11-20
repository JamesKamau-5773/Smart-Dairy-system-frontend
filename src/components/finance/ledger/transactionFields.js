import { descriptionOf, directionOf } from '../../../lib/ledgerRecord';
import { financeCopy } from '../../../i18n/finance';

// The fields a record's sheet lists, in order. A new field is a new entry here.
// value(tx, { categoryText }) returns the text, or a falsy value to leave the field out
// (the sheet never shows "N/A").
const copy = () => financeCopy.ledger.sheet;

export const TRANSACTION_FIELDS = Object.freeze([
  {
    key: 'type',
    get label() { return copy().type; },
    value: (tx) => ({ in: copy().income, out: copy().expense })[directionOf(tx)] ?? null,
  },
  {
    key: 'category',
    get label() { return copy().category; },
    value: (tx, { categoryText }) => (tx.category ? categoryText(tx.category) : null),
  },
  {
    key: 'description',
    get label() { return copy().description; },
    value: (tx) => descriptionOf(tx) || null,
  },
  {
    key: 'reference',
    get label() { return copy().reference; },
    value: (tx) => tx.reference_code || null,
  },
]);
