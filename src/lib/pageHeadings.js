// Pages that render their own <h1> (PageHeader or a page heading). On these the top bar shows
// its title as plain text, so the page has exactly one h1. Every other page keeps the top-bar
// h1 until it gets its own (typography phase 7). Whole paths only: a sub-page such as
// /operations/reports/milk-inventory is a different page with its own entry. A `:name`
// segment matches any one segment, as in the route.
export const PAGES_WITH_OWN_HEADING = Object.freeze([
  // Phase 2 pilot
  '/operations/yield',
  '/finance/ledger',
  '/operations/reports',
  // Phase 3: herd management
  '/operations/herd',
  '/operations/breeding',
  '/operations/records',
  '/operations/milk-drop-reports',
  '/operations/animal/:id',
  '/operations/animal/:id/milk-history',
  // Phase 4: operations and feeding (clerk entry has no page heading of its own yet).
  '/operations/milk-usage',
  '/operations/routine',
  '/tasks',
  '/operations/herdsman',
  '/feeding',
  '/feed-nutrition',
  '/operations/nutrition',
  '/feed-nutrition/mix',
  '/operations/feed-formulation',
  '/operations/lab',
  '/operations/unit-conversions',
  // Phase 5a: finance, supply and reports.
  '/finance/buyers',
  '/operations/customers',
  '/finance/customers/:customerId',
  '/operations/inventory',
  '/finance/reports/dairy-unit-economics',
  '/finance/reports/animal-economics',
  '/operations/reports/milk-inventory',
  // Phase 5b: compliance and HR.
  '/operations/safety',
  '/hr/staff',
  '/hr/payroll',
  // Phase 6: dashboards.
  '/dashboard',
  '/member/dashboard',
]);

const segments = (path) => path.split('/').filter(Boolean);

const matches = (pattern, parts) => {
  const want = segments(pattern);
  return want.length === parts.length && want.every((segment, index) => segment.startsWith(':') || segment === parts[index]);
};

/** True when the page at `pathname` provides its own h1. */
export function pageOwnsHeading(pathname) {
  const parts = segments(pathname);
  return PAGES_WITH_OWN_HEADING.some((pattern) => matches(pattern, parts));
}
