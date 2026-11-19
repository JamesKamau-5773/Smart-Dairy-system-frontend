/**
 * Text for the Production Log page, its period totals and grouped list, the "not sent yet"
 * milk list and the recent calf feedings card. The milk form itself is in milk.en.js.
 */
export const productionCopy = {
  title: 'Production Log',
  heading: { lead: 'Daily', rest: 'Milk Log' },
  description: 'Review milk entries, keep withdrawals visible, and work from a single place with filters and edit history.',
  recordMilk: 'Record Milk',
  feedCalf: 'Feed Calf',
  rowsLabel: 'milk records',
  sectionLabel: 'Milk entries',
  searchLabel: 'Search by cow name or ear tag',
  searchPlaceholder: 'Search cow name or ear tag',
  date: 'Date',
  session: 'Session',

  columns: {
    lead: '',
    session: 'Session',
    cow: 'Cow',
    morning: 'Morning',
    midday: 'Midday',
    evening: 'Evening',
    milker: 'Milker',
    litres: 'Litres',
    total: 'Total (L)',
    status: 'Status',
    vsAvg: 'vs 5-day Avg',
    recordedBy: 'Recorded By',
    actions: 'Actions',
  },
  // Who entered a record when there is no user (BR-019): the backend's `recorded_via`.
  recordedVia: { app: 'App', whatsapp: 'WhatsApp', import: 'Import', system: 'System' },
  showing: (shown, total) => (total == null
    ? `${shown} ${shown === 1 ? 'record' : 'records'}`
    : shown === total ? `Showing all ${total} of ${total} records` : `Showing ${shown} of ${total} records`),
  sessions: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', unknown: 'Unknown' },
  allSessions: 'All sessions',
  filtersTitle: 'Search and filter milk records',
  statuses: { Verified: 'Verified', Pending: 'Pending', Flagged: 'Flagged', Isolated: 'Kept apart' },

  milker: 'Milker',
  verify: 'Verify',
  edit: 'Edit',
  delete: 'Delete',
  actionsFor: (cow) => `Actions for milk record ${cow}`,

  emptyFirst: 'No milk recorded yet. Logged milkings will appear here.',
  recordFirst: 'Record the first milking',
  emptyFiltered: 'No milk log entries match the selected filters.',

  deleteTitle: 'Delete milk record',
  deleteMessage: (cow) => `Delete milk record for ${cow}? This can’t be undone.`,
  deleted: 'Milk record deleted.',
  deleteFailed: 'Couldn’t delete this milk record. Try again.',
  verifyFailed: 'Couldn’t verify this milk record. Try again.',

  medicineTitle: 'Cows on medicine: do not mix their milk',
  medicineMessage: (count) => `${count} ${count === 1 ? 'cow is' : 'cows are'} in a withdrawal period. Their milk entries are restricted so the batch isn’t contaminated.`,

  tiles: {
    label: 'Milk totals',
    totalVolume: 'Total Volume',
    verified: 'Verified Entries',
    pending: 'Pending Entries',
    flagged: 'Flagged Entries',
  },

  group: {
    noun: ['entry', 'entries'],
    entries: (count, formatted) => `${formatted} ${count === 1 ? 'entry' : 'entries'}`,
    entriesWord: (count) => (count === 1 ? 'entry' : 'entries'),
    describe: (litres) => litres,
  },

  queued: {
    title: (count) => `Not sent yet (${count})`,
    savedHere: 'Saved on this phone.',
    whenOnline: 'They will be sent automatically when you’re back online.',
    sending: 'Sending now…',
    soon: 'They will be sent automatically in a moment.',
    cow: 'Cow',
    needsAttention: 'Needs attention',
    notSent: 'Not sent yet',
  },

  // The records list on phones (the desktop table keeps the keys above).
  phone: {
    today: 'Today',
    atAvg: 'at avg',
    drop: 'drop',
    higher: 'up',
    lower: 'down',
    rowLabel: ({ cow, litres, session, time, status }) => [cow, `${litres} litres`, session, time, status].filter(Boolean).join(', '),
    noMatch: 'No records match these filters',
    clearFilters: 'Clear filters',
    sheetLabel: 'Milk record details',
    close: 'Close',
    yield: 'Yield',
    vsAvg: (avg) => `vs 5-day avg ${avg}`,
    status: 'Status',
    sessionLabel: 'Session',
    milkedBy: 'Milked by',
    recordedBy: 'Recorded by',
    sameAsMilker: 'Same as milker',
    recordedAt: 'Recorded at',
    editRecord: 'Edit record',
    verify: 'Verify record',
    history: 'Milk history',
    deleteRecord: 'Delete record',
  },

  calves: {
    title: 'Recent calf milk allocations',
    // "53 feedings · 310.00 L allocated"; each part is the backend's or "—".
    totals: (count, formattedCount, litres) => `${formattedCount} ${count === 1 ? 'feeding' : 'feedings'} · ${litres} allocated`,
    viewAll: 'View all',
    loading: 'Loading calf feedings…',
    failed: 'Couldn’t load calf feedings.',
    empty: 'No calf feedings recorded.',
    date: 'Date',
    calf: 'Calf',
    litres: 'Milk Consumed',
    notes: 'Notes',
  },
};
