import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ToolbarSearch } from '../Toolbar';

const viewport = (phone) => vi.stubGlobal('matchMedia', (query) => ({
  matches: phone && query === '(max-width: 640px)',
  addEventListener: () => {},
  removeEventListener: () => {},
}));

const renderSearch = () => render(
  <ToolbarSearch label="Search by cow name or ear tag" value="" onChange={() => {}} placeholder="Search cow name or ear tag" />,
);

describe('ToolbarSearch placeholder', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the page's placeholder on wider screens", () => {
    viewport(false);
    renderSearch();
    expect(screen.getByRole('searchbox').getAttribute('placeholder')).toBe('Search cow name or ear tag');
  });

  it('shortens it to "Search" on a phone, keeping the full label', () => {
    viewport(true);
    renderSearch();
    const input = screen.getByRole('searchbox', { name: 'Search by cow name or ear tag' });
    expect(input.getAttribute('placeholder')).toBe('Search');
  });
});
