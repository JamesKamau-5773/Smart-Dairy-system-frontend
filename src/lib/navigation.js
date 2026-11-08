// Which sidebar link is the current page. Two links may share a path when one is
// a filtered view (Feeding → Ingredients is Inventory filtered to feed), so a link
// can name the query it stands for; only one link is ever active.

const pathMatches = (item, pathname) => (item.exact
  ? pathname === item.to
  : pathname === item.to || pathname.startsWith(`${item.to}/`));

const queryMatches = (query, searchParams) => Object.entries(query)
  .every(([key, value]) => searchParams.get(key) === value);

/**
 * `item`: `{ to, exact?, query? }` where `query` is e.g. `{ category: 'Bulk Feed' }`.
 * `siblings`: every link in the menu, so a plain link yields to a filtered one.
 */
export function isNavItemActive(item, { pathname, search }, siblings = []) {
  if (!pathMatches(item, pathname)) return false;
  const params = new URLSearchParams(search);
  if (item.query) return queryMatches(item.query, params);
  return !siblings.some((other) => other !== item && other.query && pathMatches(other, pathname) && queryMatches(other.query, params));
}

/** The href for a link, including its query. */
export function navItemHref(item) {
  return item.query ? `${item.to}?${new URLSearchParams(item.query)}` : item.to;
}
