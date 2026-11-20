import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SummaryStrip from '../SummaryStrip';

afterEach(cleanup);

const items = [
  { key: 'litres', label: 'Total milk', value: '246.0 L' },
  { key: 'avg', label: 'Avg per day', value: '41.0 L' },
  { key: 'available', label: 'Available', value: '—' },
];

const renderStrip = (props = {}) => render(
  <MemoryRouter>
    <SummaryStrip label="Milk totals" items={items} scope="Nov 2026" loadState="ready" hasData {...props} />
  </MemoryRouter>,
);

describe('SummaryStrip', () => {
  it('shows each figure as given, with its scope and a link to the full report', () => {
    renderStrip({ link: { to: '/operations/reports/milk-inventory' } });
    const strip = screen.getByRole('region', { name: 'Milk totals' });
    expect(within(strip).getAllByRole('term').map((term) => term.textContent)).toEqual(['Total milk', 'Avg per day', 'Available']);
    expect(within(strip).getAllByRole('definition').map((value) => value.textContent)).toEqual(['246.0 L', '41.0 L', '—']);
    expect(within(strip).getByText('Totals for Nov 2026')).toBeTruthy();
    expect(within(strip).getByRole('link', { name: /View full report/ }).getAttribute('href')).toBe('/operations/reports/milk-inventory');
  });

  it('shows one line instead of the figures when the result is empty', () => {
    renderStrip({ empty: 'No entries' });
    expect(screen.getByText('No entries')).toBeTruthy();
    expect(screen.queryByRole('term')).toBeNull();
  });

  it('shows placeholders while loading, never zeros', () => {
    renderStrip({ loadState: 'loading', hasData: false });
    expect(screen.getByRole('region', { name: 'Milk totals' }).querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText(/0/)).toBeNull();
  });

  it('offers a retry when the totals fail to load', () => {
    const onRetry = vi.fn();
    renderStrip({ loadState: 'error', hasData: false, error: new Error('Server error'), onRetry });
    expect(screen.getByRole('alert').textContent).toContain('Couldn’t load totals.');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows a notice instead of figures when the API can\'t total the view', () => {
    renderStrip({ notice: 'Totals cover one calendar year at a time.', loadState: 'loading', hasData: false });
    expect(screen.getByRole('status').textContent).toBe('Totals cover one calendar year at a time.');
    expect(screen.queryByRole('term')).toBeNull();
  });

  it('says so when offline with nothing saved', () => {
    renderStrip({ loadState: 'offline', hasData: false });
    expect(screen.getByRole('status').textContent).toMatch(/offline/);
  });
});
