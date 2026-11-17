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
    renderAt('/hr/staff');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('uses the sidebar labels for the herd list and breeding (one key each)', () => {
    renderAt('/operations/herd');
    expect(screen.getByText('Cow Register')).toBeTruthy();
    cleanup();
    renderAt('/operations/breeding');
    expect(screen.getByText('AI & Pregnancy')).toBeTruthy();
  });

  it('matches whole paths, with :id standing for one segment', () => {
    expect(pageOwnsHeading('/finance/ledger/')).toBe(true);
    expect(pageOwnsHeading('/operations/reports/milk-inventory')).toBe(false);
    expect(pageOwnsHeading('/operations/animal/42')).toBe(true);
    expect(pageOwnsHeading('/operations/animal/42/milk-history')).toBe(true);
    expect(pageOwnsHeading('/operations/animal/42/other')).toBe(false);
  });
});
