/**
 * Text for shared building blocks used on many pages: confirmation dialogs, list load states,
 * filters, period totals and grouped lists, the session-expired sheet, restored drafts, the
 * offline queue and the density switch. A page passes its own nouns in (e.g. "milk records"),
 * so these sentences are written to read well around any noun.
 */
export const commonCopy = {
  confirm: {
    title: 'Confirm action',
    message: 'Are you sure you want to go ahead?',
    confirm: 'Confirm',
    cancel: 'Cancel',
    pleaseWait: 'Please wait…',
    // "Type KE-012 to confirm": the text to type sits between these two.
    typeBefore: 'Type',
    typeAfter: 'to confirm',
  },

  density: {
    soft: 'Soft',
    softHint: 'Soft typography',
    dense: 'Dense',
    denseHint: 'Dense typography (higher contrast)',
  },

  modal: {
    close: 'Close',
  },

  // Names for buttons that show only an icon (screen readers read these).
  controls: {
    moreActions: 'More actions',
    close: 'Close',
    back: 'Back',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    increase: 'Increase',
    decrease: 'Decrease',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    dismiss: 'Dismiss',
    pickDate: (label) => `Pick ${label.toLowerCase()} from a calendar`,
    dismissMilestone: 'Dismiss milestone',
    hideChecklist: 'Hide the setup checklist',
    about: (label) => `About ${label}`,
    explainCostTypes: 'Explain cost classifications',
    toggleSuggestions: 'Show or hide suggestions',
    showConfirmPassword: 'Show confirmation password',
    hideConfirmPassword: 'Hide confirmation password',
    showPasswords: 'Show passwords',
    hidePasswords: 'Hide passwords',
    actionsFor: (name) => `Actions for ${name}`,
    previousMonth: 'Go to the previous month',
    nextMonth: 'Go to the next month',
    syncStatus: (online, pending) => `${online ? 'Online' : 'Offline'}, ${pending} pending changes`,
  },

  draft: {
    restored: 'Restored what you were typing before the app closed.',
    startOver: 'Start over',
    ok: 'OK',
  },

  session: {
    title: 'Please sign in again',
    message: 'For your security you’ve been signed out. What you typed on this page is kept. Sign in, then press Save again.',
    identifier: 'Username or phone number',
    password: 'Password',
    missing: 'Enter your username or phone number and your password.',
    pending: (count) => `${count === 1 ? '1 change is' : `${count} changes are`} waiting to be sent. Sign in to keep sending them; if you sign out, they stay on this phone until you sign in here again.`,
    signingIn: 'Signing in…',
    signIn: 'Sign in and continue',
    signOut: 'Sign out instead',
  },

  queue: {
    title: 'Changes saved on this phone',
    intro: 'Changes saved on this phone are sent automatically when your connection returns.',
    empty: 'Everything has been sent.',
    kinds: {
      milk: 'Milk record',
      inventory: 'Stock change',
      customer: 'Buyer record',
      staff: 'Staff record',
      finance: 'Money record',
      other: 'Saved change',
    },
    rejected: (detail) => `This change wasn’t accepted. ${detail} Correct the details on the right page, then remove this saved copy if you no longer need it.`,
    removeQuestion: 'Remove this unsent change?',
    keep: 'Keep',
    remove: 'Remove',
    removeLabel: (kind) => `Remove ${kind}`,
    removeHint: 'Remove unsent change',
    close: 'Close',
    sending: 'Sending…',
    sendNow: 'Send now',
  },

  list: {
    tryAgain: 'Try again',
    offlineTitle: (label) => `You’re offline, and ${label} haven’t been saved on this phone yet.`,
    offlineDetail: 'They will load automatically when your connection returns.',
    errorTitle: (label) => `Couldn’t load ${label}.`,
    errorDetail: 'Check your connection and try again.',
    stale: (label) => `Showing ${label} saved on this phone. Couldn’t refresh:`,
    staleDetail: 'check your connection.',
    statUnavailable: (label) => `Not available until ${label} load`,
    slow: (label) => `Still loading ${label} – your connection seems slow. They’ll appear as soon as they arrive.`,
  },

  filters: {
    remove: (label) => `Remove filter ${label}`,
    reset: 'Reset',
    filters: 'Filters',
    all: 'All',
  },

  summary: {
    offline: 'You’re offline and these totals haven’t been saved on this phone yet. They will load when your connection returns.',
    loadFailed: 'Couldn’t load totals.',
    refreshFailed: 'Couldn’t refresh.',
    checkConnection: 'Check your connection.',
    asOf: (time) => `As of ${time}`,
    scope: (label) => `Totals for ${label}`,
    acrossYears: 'Totals cover one calendar year at a time. Choose dates within one year to see them.',
    fullReport: 'View full report',
    dates: 'Dates',
  },

  groups: {
    totalsUnavailable: 'totals not available',
    countUnavailable: 'count not available',
    totalsFailed: 'Group totals couldn’t load, so headers show —.',
    ungrouped: 'Date group not available',
    emptyDay: 'No records loaded for this day.',
  },

  // "Updated 3 hours ago" and similar (lib/audit.js).
  time: {
    unknown: 'Unknown',
    justNow: 'Just now',
    minutesAgo: (count) => `${count} minute${count > 1 ? 's' : ''} ago`,
    hoursAgo: (count) => `${count} hour${count > 1 ? 's' : ''} ago`,
    daysAgo: (count) => `${count} day${count > 1 ? 's' : ''} ago`,
  },

  photo: {
    dataSaverHint: 'Data saver is on. Tap to load this photo.',
    show: 'Show photo',
  },

  // Small shared controls.
  ui: {
    dismiss: 'Dismiss',
    close: 'Close',
    moreActions: 'More actions',
    didYouMean: 'Did you mean',
    syncStatus: 'Open synchronization status',
  },
  dateRange: {
    label: 'Custom date range',
    from: 'From',
    to: 'To',
    reversed: 'The From date must be on or before the To date.',
    cancel: 'Cancel',
    apply: 'Apply',
  },
};
