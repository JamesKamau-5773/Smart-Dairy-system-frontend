// The Ledger table's columns and status badges. A new column or status is a new entry here.

// Fixed widths for every column but Description, which takes what's left, so nothing moves
// when groups open and close. The day group row carries the date, so rows don't repeat it.
export const LEDGER_COLUMNS = Object.freeze([
  { id: 'party', width: 'w-[11.5rem]' }, // fits the "CUSTOMER / SUPPLIER" header
  { id: 'category', width: 'w-[7rem]' },
  { id: 'description' },
  { id: 'ref', width: 'w-[7rem]' },
  { id: 'amount', align: 'right', width: 'w-[8.5rem]' },
  { id: 'status', width: 'w-[6rem]' },
  { id: 'receipt', width: 'w-[6.5rem]' },
  { id: 'actions', align: 'right', width: 'w-[3rem]', srOnly: true },
]);

// One tone per status (components/ui/tones.js: brand blue and ink only). Statuses not listed
// use `fallback`; voided entries are struck through. `quietInList`: the normal state, so the
// phone list shows no badge for it (the table and the record sheet still do).
export const LEDGER_STATUS_STYLES = Object.freeze({
  posted: { tone: 'info', quietInList: true },
  paid: { tone: 'info' },
  pending: { tone: 'attention' },
  unpaid: { tone: 'attention' },
  draft: { tone: 'neutral' },
  voided: { tone: 'neutral', struck: true },
  void: { tone: 'neutral', struck: true },
  cancelled: { tone: 'neutral', struck: true },
  fallback: { tone: 'neutral' },
});
