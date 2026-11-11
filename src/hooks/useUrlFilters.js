import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// Long enough for any cow name, tag or item search; stops a pasted URL filling the page.
const MAX_FILTER_LENGTH = 100;
const ANY_VALUE = Object.freeze({});
/** A calendar date as the date filters store it. */
export const ISO_DATE_FILTER = /^\d{4}-\d{2}-\d{2}$/;

const isAllowed = (rule, value) => {
  if (!rule) return true;
  return rule instanceof RegExp ? rule.test(value) : rule.includes(value);
};

/**
 * List filters kept in the page address, so Back, a reload and a shared link all keep them.
 * Values equal to the default are left out of the address, and other query parameters on the
 * page are kept. Changes replace the history entry, so Back leaves the page rather than
 * stepping through every keystroke.
 *
 * Only put values here that are safe in a URL: never a phone number, a person's name or money.
 * Free-text search that could hold those (buyers, staff, ledger) stays in component state.
 *
 * @template {Record<string, string>} T
 * @param {T} defaults Every filter with its default. Must be a stable (module-level) object.
 * @param {object} [options]
 * @param {Partial<Record<keyof T, string[] | RegExp>>} [options.allowed] Values (or a pattern) a
 *   filter may take; any other value in the address falls back to the default.
 * @returns {{ filters: T, setFilter: (name: keyof T, value: string) => void,
 *   setFilters: (changes: Partial<T>) => void, resetFilters: () => void, hasActiveFilters: boolean }}
 *
 * @example
 * const STATUS_FILTERS = { status: 'all', search: '' };
 * const { filters, setFilter } = useUrlFilters(STATUS_FILTERS, { allowed: { status: ['all', 'active'] } });
 */
export function useUrlFilters(defaults, { allowed = ANY_VALUE } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => {
    const value = searchParams.get(name);
    if (value === null) return [name, fallback];
    if (!isAllowed(allowed[name], value)) return [name, fallback];
    return [name, value.slice(0, MAX_FILTER_LENGTH)];
  })), [defaults, allowed, searchParams]);

  const setFilters = useCallback((changes) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([name, value]) => {
        if (!Object.hasOwn(defaults, name)) return;
        const text = String(value ?? '');
        if (text === '' || text === defaults[name]) next.delete(name);
        else next.set(name, text.slice(0, MAX_FILTER_LENGTH));
      });
      return next;
    }, { replace: true });
  }, [defaults, setSearchParams]);

  const setFilter = useCallback((name, value) => setFilters({ [name]: value }), [setFilters]);
  const resetFilters = useCallback(() => setFilters(defaults), [defaults, setFilters]);
  const hasActiveFilters = Object.entries(defaults).some(([name, fallback]) => filters[name] !== fallback);

  return { filters, setFilter, setFilters, resetFilters, hasActiveFilters };
}
