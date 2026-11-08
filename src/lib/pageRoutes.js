import { hasPageAccess } from './roles';

// Which page-access key guards each app route. The single list read by both the
// role guard (App) and the page gate (DashboardLayout), so they cannot drift apart.
export const PAGE_ROUTES = Object.freeze([
  ['/dashboard', 'dashboard'],
  ['/operations/yield', 'production'],
  ['/operations/milk-usage', 'production'],
  ['/operations/routine', 'tasks'],
  ['/tasks', 'tasks'],
  ['/operations/herd', 'herd'],
  ['/operations/breeding', 'breeding'],
  ['/operations/records', 'medical'],
  ['/operations/milk-drop-reports', 'medical'],
  ['/feeding', 'feeding'],
  ['/feed-nutrition', 'feed'],
  ['/operations/lab', 'feed'],
  ['/settings/unit-conversions', 'feed'],
  ['/operations/customers', 'customers'],
  ['/finance/buyers', 'customers'],
  ['/finance/ledger', 'finance'],
  ['/operations/inventory', 'inventory'],
  ['/operations/reports', 'reports'],
  ['/finance/reports', 'reports'],
  ['/operations/safety', 'safety'],
  ['/hr/staff', 'staff'],
  ['/hr/payroll', 'payroll'],
  ['/cooperative-admin/members', 'member_admin'],
]);

/**
 * What each page-access key is called, for messages about the whole area (e.g. the
 * "isn't in your plan" card). The same keys are the plan feature keys (BR-014).
 */
export const PAGE_TITLES = Object.freeze({
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
});

const matches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

/** The page-access key for a route, or undefined when the route isn't access-controlled. */
export function getPageKeyForPath(pathname) {
  return PAGE_ROUTES.find(([path]) => matches(pathname, path))?.[1];
}

/** The first route this user may open, for redirecting away from one they may not. */
export function getFirstAllowedPath(user) {
  return PAGE_ROUTES.find(([, pageKey]) => hasPageAccess(user, pageKey))?.[0] ?? null;
}
