// UX audit phase 7: list filters live in the address, so Back, reload and shared links keep them.
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ISO_DATE_FILTER, useUrlFilters } from '../useUrlFilters';

const DEFAULTS = { q: '', status: 'all', date: '' };
const ALLOWED = { status: ['all', 'dry'], date: ISO_DATE_FILTER };

function setup(url) {
  return renderHook(() => ({ ...useUrlFilters(DEFAULTS, { allowed: ALLOWED }), location: useLocation() }), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
  });
}

describe('useUrlFilters', () => {
  it('reads filters from the address and keeps other parameters', () => {
    const { result } = setup('/herd?status=dry&q=Neema&tab=photos');
    expect(result.current.filters).toEqual({ q: 'Neema', status: 'dry', date: '' });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.setFilter('status', 'all'));
    expect(result.current.location.search).toBe('?q=Neema&tab=photos');
  });

  it('ignores values a filter can’t take', () => {
    const { result } = setup('/herd?status=<script>&date=yesterday&q=' + 'x'.repeat(500));
    expect(result.current.filters.status).toBe('all');
    expect(result.current.filters.date).toBe('');
    expect(result.current.filters.q).toHaveLength(100);
  });

  it('leaves defaults out of the address and resets everything at once', () => {
    const { result } = setup('/herd');
    act(() => result.current.setFilters({ q: 'KE-012', date: '2026-11-03' }));
    expect(result.current.location.search).toBe('?q=KE-012&date=2026-11-03');
    act(() => result.current.resetFilters());
    expect(result.current.location.search).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
