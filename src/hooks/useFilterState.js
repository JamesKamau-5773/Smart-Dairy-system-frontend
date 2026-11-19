import { useCallback, useMemo, useState } from 'react';
import { useUrlFilters } from './useUrlFilters';

const NONE = Object.freeze([]);
const pick = (source, keys, keep) => Object.fromEntries(Object.entries(source).filter(([key]) => keys.includes(key) === keep));

/**
 * The one filter-state hook for list pages. Page hooks (useLedgerFilters, …) compose it with
 * their defaults instead of keeping filter state of their own.
 *
 * Filters named in `urlKeys` live in the page address (useUrlFilters), so Back, a reload and a
 * shared link keep them; the rest stay in memory. Never put a value that could hold a name, a
 * phone number or money in the address: free-text search stays in memory.
 *
 * @template {Record<string, string>} T
 * @param {T} defaults Every filter with its default. Stable (module-level), like `urlKeys`,
 *   `allowed` and `linked`.
 * @param {object} [options]
 * @param {Array<keyof T>} [options.urlKeys] Filters kept in the address.
 * @param {object} [options.allowed] Allowed values for address filters (see useUrlFilters).
 * @param {Array<Array<keyof T>>} [options.linked] Filters counted as one, e.g. [['from', 'to']]
 *   for a date range.
 * @param {Array<keyof T>} [options.uncounted] Values kept with the filters that aren't filters
 *   (e.g. the sort order): never counted as active, and left alone by reset().
 * @returns {{ values: T, setValue: (name: keyof T, value: string) => void,
 *   setValues: (changes: Partial<T>) => void, activeCount: number, reset: () => void }}
 */
export function useFilterState(defaults, { urlKeys = NONE, allowed, linked = NONE, uncounted = NONE } = {}) {
  const urlDefaults = useMemo(() => pick(defaults, urlKeys, true), [defaults, urlKeys]);
  const memoryDefaults = useMemo(() => pick(defaults, urlKeys, false), [defaults, urlKeys]);
  const { filters: urlValues, setFilters: setUrlValues } = useUrlFilters(urlDefaults, { allowed });
  const [memoryValues, setMemoryValues] = useState(memoryDefaults);

  const values = useMemo(() => ({ ...memoryValues, ...urlValues }), [memoryValues, urlValues]);

  const setValues = useCallback((changes) => {
    const known = pick(changes, Object.keys(defaults), true);
    const toUrl = pick(known, urlKeys, true);
    const toMemory = pick(known, urlKeys, false);
    if (Object.keys(toUrl).length > 0) setUrlValues(toUrl);
    if (Object.keys(toMemory).length > 0) setMemoryValues((current) => ({ ...current, ...toMemory }));
  }, [defaults, urlKeys, setUrlValues]);

  const setValue = useCallback((name, value) => setValues({ [name]: value }), [setValues]);
  const reset = useCallback(() => setValues(pick(defaults, uncounted, false)), [defaults, uncounted, setValues]);

  // One per filter that differs from its default; linked filters count once together.
  const activeCount = useMemo(() => {
    const active = new Set();
    Object.keys(defaults).forEach((key) => {
      if (uncounted.includes(key) || values[key] === defaults[key]) return;
      const group = linked.find((keys) => keys.includes(key));
      active.add(group ? group.join('|') : key);
    });
    return active.size;
  }, [defaults, linked, uncounted, values]);

  return { values, setValue, setValues, activeCount, reset };
}
