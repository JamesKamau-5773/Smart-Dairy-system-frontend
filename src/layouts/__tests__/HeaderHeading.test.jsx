import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Header from '../Header';
import { pageOwnsHeading } from '../../lib/pageHeadings';

void React;

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 7, name: 'Wanjiru', role: 'FARMER' }, logout: vi.fn() }),
}));
vi.mock('../../hooks/useTenant', () => ({ useTenant: () => ({ activeFarm: { name: "Kamau's Farm" } }) }));

const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><Header /></MemoryRouter>);

describe('top bar title and the page h1', () => {
  afterEach(cleanup);

  it('is plain text on pages that render their own h1', () => {
    for (const path of ['/finance/ledger', '/operations/yield', '/operations/reports']) {
      renderAt(path);
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
      cleanup();
    }
  });

  it('stays the h1 on pages that have no heading of their own yet', () => {
    renderAt('/operations/herd');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('matches exact paths only', () => {
    expect(pageOwnsHeading('/finance/ledger/')).toBe(true);
    expect(pageOwnsHeading('/operations/reports/milk-inventory')).toBe(false);
  });
});
