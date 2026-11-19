import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useFilterState } from '../useFilterState';

void React;
afterEach(cleanup);

const DEFAULTS = { search: '', status: 'all', from: '', to: '' };
const URL_KEYS = ['status', 'from', 'to'];
const LINKED = [['from', 'to']];
const UNCOUNTED = ['sort'];

const renderFilters = (path = '/list') => renderHook(() => ({
  filters: useFilterState(DEFAULTS, { urlKeys: URL_KEYS, allowed: { status: ['all', 'open'] }, linked: LINKED }),
  location: useLocation(),
}), { wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> });

describe('useFilterState', () => {
  it('starts on the defaults with nothing active', () => {
    const { result } = renderFilters();
    expect(result.current.filters.values).toEqual(DEFAULTS);
    expect(result.current.filters.activeCount).toBe(0);
  });

  it('keeps address filters in the URL and the search in memory', () => {
    const { result } = renderFilters();
    act(() => result.current.filters.setValues({ search: 'Mama Njeri', status: 'open' }));
    expect(result.current.filters.values).toMatchObject({ search: 'Mama Njeri', status: 'open' });
    expect(result.current.location.search).toBe('?status=open');
  });

  it('reads address filters and ignores values that aren’t allowed', () => {
    expect(renderFilters('/list?status=open').result.current.filters.values.status).toBe('open');
    expect(renderFilters('/list?status=bogus').result.current.filters.values.status).toBe('all');
  });

  it('counts each changed filter once, and a linked pair as one', () => {
    const { result } = renderFilters();
    act(() => result.current.filters.setValues({ from: '2026-10-01', to: '2026-10-15' }));
    expect(result.current.filters.activeCount).toBe(1);
    act(() => result.current.filters.setValue('search', 'Auntie'));
    expect(result.current.filters.activeCount).toBe(2);
  });

  it('resets every filter, in the address and in memory', () => {
    const { result } = renderFilters('/list?status=open&from=2026-10-01&to=2026-10-15&page=2');
    act(() => result.current.filters.setValue('search', 'Auntie'));
    expect(result.current.filters.activeCount).toBe(3);
    act(() => result.current.filters.reset());
    expect(result.current.filters.values).toEqual(DEFAULTS);
    expect(result.current.filters.activeCount).toBe(0);
    // Other query parameters on the page are left alone.
    expect(result.current.location.search).toBe('?page=2');
  });

  it('keeps uncounted values (a sort order) out of the count and out of reset', () => {
    const SORTED = { search: '', sort: 'age' };
    const { result } = renderHook(() => useFilterState(SORTED, { uncounted: UNCOUNTED }), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    act(() => result.current.setValues({ sort: 'breed', search: 'Neema' }));
    expect(result.current.activeCount).toBe(1);
    act(() => result.current.reset());
    expect(result.current.values).toEqual({ search: '', sort: 'breed' });
  });

  it('ignores names that aren’t filters', () => {
    const { result } = renderFilters();
    act(() => result.current.filters.setValues({ nope: 'x' }));
    expect(result.current.filters.values).toEqual(DEFAULTS);
  });
});
