import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FilterPanel from '../FilterPanel';

afterEach(cleanup);

const TITLE = 'Search and filter transactions';
const renderPanel = (props = {}) => render(
  <FilterPanel title={TITLE} activeCount={0} onReset={() => {}} resultsSummary={<span>Showing 9 records</span>} {...props}>
    <input type="search" aria-label="Search" />
  </FilterPanel>,
);

describe('FilterPanel', () => {
  it('starts collapsed, and the header button opens and closes the controls', () => {
    renderPanel();
    const toggle = screen.getByRole('button', { name: TITLE });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const body = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(body.hidden).toBe(true);
    expect(screen.queryByRole('searchbox')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeTruthy();
    expect(screen.getByText('Showing 9 records')).toBeTruthy();
  });

  it('can start open', () => {
    renderPanel({ defaultOpen: true });
    expect(screen.getByRole('button', { name: TITLE }).getAttribute('aria-expanded')).toBe('true');
  });

  it('offers Reset filters only while a filter is set, and says how many while collapsed', () => {
    const onReset = vi.fn();
    const { rerender } = renderPanel();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull();

    rerender(<FilterPanel title={TITLE} activeCount={2} onReset={onReset}><span /></FilterPanel>);
    expect(screen.getByRole('button', { name: `${TITLE} · 2 filters active` })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onReset).toHaveBeenCalledTimes(1);

    // Open, the controls show what is set, so the count goes.
    fireEvent.click(screen.getByRole('button', { name: `${TITLE} · 2 filters active` }));
    expect(screen.getByRole('button', { name: TITLE })).toBeTruthy();
  });

  it('says "1 filter active" in the singular', () => {
    renderPanel({ activeCount: 1 });
    expect(screen.getByRole('button', { name: `${TITLE} · 1 filter active` })).toBeTruthy();
  });
});
