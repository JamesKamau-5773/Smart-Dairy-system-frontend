// The raw English labels: this file is the English source, so it must not follow the language.
import { labelsCopy as LABELS } from './labels.en';

/**
 * Text for the signed-in app shell: header, menu, bottom navigation, connection banner and the
 * app-wide error and not-found screens. Labels shared with page headings come from LABELS so the
 * menu and the page keep the same name.
 */
export const shellCopy = {
  header: {
    openMenu: 'Open navigation menu',
    activeWorkspace: 'Active workspace',
    farmFallback: 'Farm',
    userFallback: 'User',
    roleUnknown: 'N/A',
    noRole: 'No role assigned',
    language: 'Language',
    dataSaver: 'Data saver',
    dataSaverHint: 'Hides cow photos until you tap them and refreshes less often, to save mobile data.',
    signOut: 'Sign out',
    accountMenu: (name) => `Account and settings, ${name}`,
    pendingTitle: 'Changes not sent yet',
    pendingMessage: (pending, online) => {
      const changes = pending === 1 ? '1 change' : `${pending} changes`;
      return `${changes} saved on this phone ${pending === 1 ? 'hasn’t' : 'haven’t'} been sent yet. `
        + (online
          ? 'Stay signed in for a moment so they can be sent. '
          : 'Stay signed in and they’ll be sent when you’re back online. ')
        + 'If you sign out, they stay on this phone and are sent the next time you sign in here.';
    },
    signOutAnyway: 'Sign out anyway',
    staySignedIn: 'Stay signed in',
    // The backend's role codes in words, so the header never shows FARM_ADMIN.
    roles: {
      SUPER_ADMIN: 'Platform admin',
      ADMIN: 'Administrator',
      COOPERATIVE_ADMIN: 'Cooperative admin',
      COOP_ADMIN: 'Cooperative admin',
      FARM_ADMIN: 'Farm administrator',
      FARM_MANAGER: 'Farm manager',
      FARM_SUPERVISOR: 'Farm supervisor',
      FARM_HAND: 'Farmhand',
      FARMER: 'Farmer',
      CLERK: 'Clerk',
      HERDSMAN: 'Herdsman',
      VETERINARY_DOCTOR: 'Vet',
      VET_ASSISTANT: 'Vet assistant',
    },
    titles: {
      dashboard: 'Dashboard',
      production: 'Production Log',
      buyers: 'Buyer List',
      ledger: 'Ledger',
      milkUsage: 'Milk Usage',
      feedMixing: 'Feed Mixing',
      clinical: 'Clinical Registry',
      stock: 'Stock Registry',
    },
  },

  nav: {
    mainLabel: 'Main navigation',
    closeMenu: 'Close navigation menu',
    toggleSection: (title) => `Toggle ${title} section`,
    groups: {
      platform: 'Platform',
      cooperative: 'Cooperative Admin',
      operations: LABELS.OPERATIONS,
      herd: 'Herd Management',
      feeding: LABELS.FEEDING_AREA,
      finance: 'Finance & Supply',
      reports: 'Reports',
      compliance: 'Compliance',
      hr: 'Human Resources',
    },
    items: {
      systemAdmin: 'System Admin Dashboard',
      memberOnboarding: 'Member Onboarding',
      commandCenter: LABELS.COMMAND_CENTER,
      production: LABELS.PRODUCTION_LOG,
      milkUsage: 'Milk Usage',
      dailyRoutine: LABELS.DAILY_ROUTINE,
      farmTasks: 'Farm Task View',
      cowRegister: 'Cow Register',
      breeding: 'AI & Pregnancy',
      medical: LABELS.MEDICAL_RECORDS,
      milkDrops: 'Milk Drop Alerts',
      todayFeeding: LABELS.TODAY_FEEDING,
      feedDashboard: LABELS.FEED_DASHBOARD,
      feedMixes: LABELS.FEED_FORMULATION,
      ingredients: LABELS.FEED_INGREDIENTS,
      milkLab: LABELS.MILK_LAB,
      unitHelpers: 'Unit Helpers',
      buyers: 'Buyers List',
      customers: 'Customer Management',
      inventory: 'Inventory',
      ledger: 'Ledger',
      farmReports: 'Farm Reporting Dashboard',
      customerValue: 'Customer Value & Profit',
      cowProfit: 'Cow Profitability',
      milkInventory: 'Milk Inventory Report',
      safety: 'Safety Dashboard',
      staff: 'Staff Registry',
      payroll: 'Payroll',
    },
  },

  bottomNav: {
    label: 'Primary mobile navigation',
    dashboard: 'Dashboard',
    production: 'Production Log',
    buyers: 'Buyer List',
    ledger: 'Ledger',
  },

  offline: {
    title: 'You’re offline.',
    body: 'Milk records and other daily work are saved on this phone and sent when you’re back online. Payments and payroll need internet.',
    waiting: (count) => `${count} saved ${count === 1 ? 'change' : 'changes'} waiting to send.`,
    needsAttention: (count) => (count === 1
      ? '1 saved change couldn’t be sent and needs your attention.'
      : `${count} saved changes couldn’t be sent and need your attention.`),
    sending: (count) => `Back online. Sending ${count} saved ${count === 1 ? 'change' : 'changes'}…`,
    queued: (count) => `Waiting to send ${count} saved ${count === 1 ? 'change' : 'changes'}…`,
    review: 'Review',
  },

  errorBoundary: {
    pageTitle: 'This page stopped working',
    appTitle: 'Maziwa Smart stopped working',
    message: 'This is a problem in the app, not something you did. Records you already saved are safe, and anything saved on this phone will still be sent. Try again, or reload the app.',
    tryAgain: 'Try again',
    reload: 'Reload the app',
    keepsHappening: (phone) => `This keeps happening. Reload the app, and if it still doesn’t work, call us on ${phone}.`,
  },

  notFound: {
    title: 'We couldn’t find that page',
    message: 'The link may be old or mistyped. Nothing on your farm has changed.',
    goToLogin: 'Go to log in',
    goToDashboard: 'Go to your dashboard',
    back: 'Go back',
  },

  // The public demo: banner, the sign-up prompt after a refused change, and the ended-session sheet.
  demo: {
    banner: 'You are exploring a demo farm with sample data. Changes are not saved.',
    // `time` is "12 min" or, in the last minutes, "4:59".
    endsIn: (time) => `Demo ends in ${time}`,
    minutes: (count) => `${count} min`,
    endingSoon: (minutes) => `Your demo ends in ${minutes === 1 ? '1 minute' : `${minutes} minutes`}. Create a free farm to keep your own records.`,
    createFarm: 'Create your free farm',
    logIn: 'Log in',
    expiredTitle: 'Your demo has ended',
    expiredMessage: 'Demo sessions are short. Start the demo again, or create your own free farm to keep your records.',
    restart: 'Restart demo',
    restarting: 'Starting…',
    backHome: 'Back to home',
  },

  plan: {
    lockedTitle: (feature) => `${feature} isn’t in your plan`,
    lockedNamedPlan: (plan, feature) => `Your ${plan} plan doesn’t include ${feature}.`,
    lockedPlan: (feature) => `Your plan doesn’t include ${feature}.`,
    lockedUpgrade: 'Upgrade to use it. Your records are not affected.',
    seePlans: 'See plans and upgrade',
    callToUpgrade: 'To upgrade, call us on',
    areas: {
      dashboard: 'Dashboard',
      production: 'Milk records',
      tasks: 'Daily tasks',
      herd: 'Cow register',
      breeding: 'Breeding',
      medical: 'Health records',
      feeding: 'Feeding',
      feed: 'Feed and nutrition',
      customers: 'Buyers',
      finance: 'Ledger',
      inventory: 'Inventory',
      reports: 'Reports',
      safety: 'Milk safety',
      staff: 'Staff',
      payroll: 'Payroll',
      member_admin: 'Member onboarding',
    },
  },
};
