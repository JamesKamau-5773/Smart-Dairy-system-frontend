import { isNavItemActive } from './navigation';
import { FEED_CATEGORY } from './inventoryItemRules';

// The app's navigation, in one place. Every sidebar destination, keyed by its label in
// shellCopy.nav.items, with its path and sidebar group. The sidebar draws its groups from this
// list and the phone bottom nav finds its active tab with it, so the two always agree on which
// page belongs where. Visibility (roles, plan, page access) stays in the components.
//
// item: { id, to, group, exact?, query? } (see lib/navigation for `exact` and `query`)
export const NAV_ROUTES = Object.freeze([
  { id: 'systemAdmin', to: '/system-admin/dashboard', group: 'platform' },
  { id: 'memberOnboarding', to: '/cooperative-admin/members', group: 'cooperative' },
  { id: 'commandCenter', to: '/dashboard', group: null },

  { id: 'production', to: '/operations/yield', group: 'operations' },
  { id: 'milkUsage', to: '/operations/milk-usage', group: 'operations' },
  { id: 'dailyRoutine', to: '/operations/routine', group: 'operations' },
  { id: 'farmTasks', to: '/tasks', group: 'operations' },

  { id: 'cowRegister', to: '/operations/herd', group: 'herd' },
  { id: 'breeding', to: '/operations/breeding', group: 'herd' },
  { id: 'medical', to: '/operations/records', group: 'herd' },
  { id: 'milkDrops', to: '/operations/milk-drop-reports', group: 'herd' },

  { id: 'todayFeeding', to: '/feeding', group: 'feeding' },
  { id: 'feedDashboard', to: '/feed-nutrition', group: 'feeding', exact: true },
  { id: 'feedMixes', to: '/feed-nutrition/mix', group: 'feeding' },
  // Inventory filtered to feed: one page, two ways in (Feeding and Finance & Supply).
  { id: 'ingredients', to: '/operations/inventory', group: 'feeding', query: { category: FEED_CATEGORY } },
  { id: 'milkLab', to: '/operations/lab', group: 'feeding' },
  { id: 'unitHelpers', to: '/operations/unit-conversions', group: 'feeding' },

  { id: 'buyers', to: '/finance/buyers', group: 'finance' },
  { id: 'customers', to: '/operations/customers', group: 'finance' },
  { id: 'inventory', to: '/operations/inventory', group: 'finance' },
  { id: 'ledger', to: '/finance/ledger', group: 'finance' },

  { id: 'farmReports', to: '/operations/reports', group: 'reports' },
  { id: 'customerValue', to: '/finance/reports/dairy-unit-economics', group: 'reports' },
  { id: 'cowProfit', to: '/finance/reports/animal-economics', group: 'reports' },
  { id: 'milkInventory', to: '/operations/reports/milk-inventory', group: 'reports' },

  { id: 'safety', to: '/operations/safety', group: 'compliance' },

  { id: 'staff', to: '/hr/staff', group: 'hr' },
  { id: 'payroll', to: '/hr/payroll', group: 'hr' },
]);

/** Sidebar group order (null is the ungrouped Command Center). */
export const NAV_GROUPS = Object.freeze(['platform', 'cooperative', null, 'operations', 'herd', 'feeding', 'finance', 'reports', 'compliance', 'hr']);

// Pages that are not in the sidebar themselves, with the sidebar item they belong to:
// detail pages, other ways into the same page, and old addresses that redirect.
export const NAV_CHILDREN = Object.freeze([
  ['/system-admin', 'systemAdmin'],
  ['/cooperative-admin', 'memberOnboarding'],
  ['/operations/clerk', 'production'],
  ['/operations/herdsman', 'farmTasks'],
  ['/operations/schedule-planner', 'dailyRoutine'],
  ['/operations/animal', 'cowRegister'],
  ['/operations/nutrition', 'feedDashboard'],
  ['/operations/feed-formulation', 'feedMixes'],
  ['/settings/unit-conversions', 'unitHelpers'],
  ['/finance/customers', 'buyers'],
  ['/operations/buyers', 'buyers'],
]);

const byId = new Map(NAV_ROUTES.map((route) => [route.id, route]));

/** The navigation entry for a label key, e.g. navRoute('cowRegister'). */
export function navRoute(id) {
  const route = byId.get(id);
  if (!route) throw new Error(`Unknown nav route "${id}"`);
  return route;
}

const startsWithPath = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

/**
 * The navigation entry the current page belongs to, or null. Among the `candidates` (default:
 * every route; the sidebar passes the links it shows), the most specific match wins, so
 * /operations/reports/milk-inventory is Milk Inventory, not Farm Reports. A page outside the
 * sidebar resolves to the item it belongs to (NAV_CHILDREN).
 */
export function activeNavRoute(location, candidates = NAV_ROUTES) {
  const direct = candidates
    .filter((route) => isNavItemActive(route, location, candidates))
    .sort((a, b) => b.to.length - a.to.length)[0];
  if (direct) return direct;
  const child = NAV_CHILDREN
    .filter(([path]) => startsWithPath(location.pathname, path))
    .sort(([a], [b]) => b.length - a.length)[0];
  if (!child) return null;
  return candidates.find((route) => route.id === child[1]) ?? null;
}

// The phone bottom nav: each tab stands for one sidebar destination (by label key). A tab is
// active when the current page resolves to that destination (activeNavRoute), so the bottom nav
// and the sidebar never disagree. Pages with no tab (herd, feeding, reports…) leave every tab
// inactive: Low milk alerts, for one, belongs to Herd, which has no tab.
export const BOTTOM_TABS = Object.freeze([
  { id: 'dashboard', navId: 'commandCenter' },
  { id: 'production', navId: 'production' },
  { id: 'buyers', navId: 'buyers' },
  { id: 'ledger', navId: 'ledger' },
]);

/** The id of the bottom-nav tab for this page, or null. Dashboard is the user's landing page. */
export function activeTabId(location, landingPath) {
  if (location.pathname === landingPath) return 'dashboard';
  const current = activeNavRoute(location);
  return BOTTOM_TABS.find((tab) => tab.navId === current?.id)?.id ?? null;
}
