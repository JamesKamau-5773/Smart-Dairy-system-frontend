// Pages that render their own <h1> (PageHeader or a page heading). On these the top bar shows
// its title as plain text, so the page has exactly one h1. Every other page keeps the top-bar
// h1 until it gets its own (typography phase 7). Exact paths: a sub-page such as
// /operations/reports/milk-inventory is a different page with its own entry.
export const PAGES_WITH_OWN_HEADING = Object.freeze([
  '/operations/yield',
  '/finance/ledger',
  '/operations/reports',
]);

/** True when the page at `pathname` provides its own h1. */
export function pageOwnsHeading(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGES_WITH_OWN_HEADING.includes(path);
}
