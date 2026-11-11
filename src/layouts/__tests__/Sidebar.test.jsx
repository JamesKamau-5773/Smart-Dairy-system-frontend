import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Sidebar';
import { getDefaultStaffPageAccess } from '../../lib/staffOnboarding';

void React;

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
// FarmSwitcher loads farms from the backend; it is not under test here.
vi.mock('../FarmSwitcher', () => ({ default: () => null }));
afterEach(cleanup);

// These tests check the desktop sidebar (always shown); on phones it's a drawer that is inert
// while closed, which the drawer test covers.
const desktopWidth = (query) => ({ matches: query === '(min-width: 768px)', addEventListener() {}, removeEventListener() {} });
beforeAll(() => { window.matchMedia = desktopWidth; });
afterAll(() => { delete window.matchMedia; });

// Staff accounts carry backend-assigned page_access; a herdsman gets the FARM_HAND defaults.
const herdsman = {
  name: 'Herdsman',
  role: 'Herdsman',
  tenant_id: 't1',
  farm_id: 'f1',
  farm_name: 'F1',
  page_access: getDefaultStaffPageAccess('FARM_HAND'),
};

function renderAs(currentUser) {
  useAuth.mockReturnValue({ currentUser });
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('does not show customer, finance or payroll pages to farmhands', () => {
    renderAs(herdsman);
    expect(screen.queryByRole('link', { name: 'Customer Management' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ledger' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Payroll' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Cow Register' }).length).toBeGreaterThan(0);
  });

  it('shows Customer Management for farmer', () => {
    renderAs({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' });
    expect(screen.getAllByRole('link', { name: 'Customer Management' }).length).toBeGreaterThan(0);
  });

  it('shows staff onboarding for a cooperative farmer', () => {
    renderAs({
      name: 'Farm Owner',
      role: 'FARMER',
      tenant_type: 'cooperative',
      tenant_id: 't1',
      cooperative_id: 't1',
      farm_id: 'f1',
    });

    expect(screen.getAllByRole('link', { name: 'Staff Registry' }).length).toBeGreaterThan(0);
  });

  it('shows Customer Management for primary admin', () => {
    renderAs({ name: 'Admin', role: 'PRIMARY_ADMIN', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' });
    expect(screen.getAllByRole('link', { name: 'Customer Management' }).length).toBeGreaterThan(0);
  });

  it('shows Farm Task View for farmer', () => {
    renderAs({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' });
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });

  it('shows Farm Task View for herdsman', () => {
    renderAs(herdsman);
    expect(screen.getAllByText('Farm Task View').length).toBeGreaterThan(0);
  });
});

describe('Sidebar phone drawer', () => {
  const farmer = { name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' };

  it('closes on Escape and keeps Tab inside while open', async () => {
    const { fireEvent } = await import('@testing-library/react');
    useAuth.mockReturnValue({ currentUser: farmer });
    const setMobileOpen = vi.fn();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(<MemoryRouter><Sidebar mobileOpen setMobileOpen={setMobileOpen} /></MemoryRouter>);
    const close = screen.getByRole('button', { name: 'Close navigation menu' });
    // Focus moves into the drawer when it opens.
    expect(document.activeElement).toBe(close);

    // Shift+Tab from the first control wraps to the last one, not out to the page.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    const links = screen.getAllByRole('link');
    expect(document.activeElement).toBe(links[links.length - 1]);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(setMobileOpen).toHaveBeenCalledWith(false);

    // Closing hands focus back to the button that opened it.
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('Sidebar on a phone', () => {
  it('keeps the closed drawer out of Tab order and screen readers', () => {
    window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
    useAuth.mockReturnValue({ currentUser: { name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' } });
    const { container, rerender } = render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(container.querySelector('aside').hasAttribute('inert')).toBe(true);
    rerender(<MemoryRouter><Sidebar mobileOpen setMobileOpen={() => {}} /></MemoryRouter>);
    expect(container.querySelector('aside').hasAttribute('inert')).toBe(false);
    delete window.matchMedia;
  });
});
