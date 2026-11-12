/**
 * Text for the Production Log page, its period totals and grouped list, the "not sent yet"
 * milk list and the recent calf feedings card. The milk form itself is in milk.en.js.
 */
export const productionCopy = {
  title: 'Production Log',
  recordMilk: 'Record milk',
  feedCalf: 'Feed calf',
  rowsLabel: 'milk records',
  sectionLabel: 'Milk entries',
  searchLabel: 'Search by cow name or ear tag',
  searchPlaceholder: 'Search cow name or ear tag',
  date: 'Date',
  session: 'Session',

  columns: {
    session: 'Session',
    milker: 'Milker',
    cow: 'Cow',
    litres: 'Litres',
    status: 'Status',
    actions: 'Actions',
  },
  sessions: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', unknown: 'Unknown' },
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

  summary: {
    totalMilk: 'Total milk',
    avgPerDay: 'Avg per day',
    entries: 'Entries',
    fedToCalves: 'Fed to calves',
    available: 'Available',
    emptyCurrent: (periodName) => `No entries this ${periodName}`,
    emptyIn: (label) => `No entries in ${label}`,
    lastEntry: (date) => ` · last entry ${date}`,
  },
  group: {
    noun: ['entry', 'entries'],
    entries: (count, formatted) => `${formatted} ${count === 1 ? 'entry' : 'entries'}`,
    perDayUnit: 'L/day',
    describe: (litres, perDay) => `${litres}, ${perDay} per day`,
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

  calves: {
    title: 'Recent calf feedings',
    viewAll: 'View all',
    loading: 'Loading calf feedings…',
    failed: 'Couldn’t load calf feedings.',
    empty: 'No calf feedings recorded.',
    date: 'Date',
    calf: 'Calf',
    litres: 'Litres',
    notes: 'Notes',
  },
};
