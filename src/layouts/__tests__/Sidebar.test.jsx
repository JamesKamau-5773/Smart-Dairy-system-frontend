import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

// Every section starts folded, so tests about which links a role sees unfold them all first;
// otherwise "no Ledger link" would pass only because its section is closed.
const unfoldAll = () => {
  screen.queryAllByRole('button', { name: /^Toggle .* section$/ }).forEach((button) => fireEvent.click(button));
};

function renderAs(currentUser, { unfold = true, path = '/' } = {}) {
  useAuth.mockReturnValue({ currentUser });
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>
  );
  if (unfold) unfoldAll();
  return result;
}

describe('Sidebar', () => {
  it('shows the white horizontal logo in its dark header, linking home on desktop', () => {
    renderAs(herdsman);
    const home = screen.getByRole('link', { name: 'Maziwa Smart home' });
    expect(home.getAttribute('href')).toBe('/app');
    const logo = home.querySelector('img');
    expect(logo.getAttribute('src')).toBe('/brand/logo-horizontal-white.svg');
    expect(logo.getAttribute('height')).toBe('34');
  });

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

describe('Sidebar section headers', () => {
  const farmer = { name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' };

  it('all start folded on desktop, with only the ungrouped links showing', () => {
    renderAs(farmer, { unfold: false });
    const toggles = screen.getAllByRole('button', { name: /^Toggle .* section$/ });
    expect(toggles.length).toBeGreaterThan(3);
    toggles.forEach((toggle) => expect(toggle.getAttribute('aria-expanded')).toBe('false'));
    expect(screen.getByRole('link', { name: 'Command Center' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Cow Register' })).toBeNull();
  });

  it('keep the current section folded too, marking it by colour', () => {
    renderAs(farmer, { unfold: false, path: '/operations/herd' });
    const herd = screen.getByRole('button', { name: 'Toggle Herd Management section' });
    expect(herd.getAttribute('aria-expanded')).toBe('false');
    expect(herd.className).toContain('text-brand-700');
    expect(screen.getByRole('button', { name: 'Toggle Feeding section' }).className).not.toContain('text-brand-700');
  });

  it('unfold and fold their section when tapped', () => {
    renderAs(farmer, { unfold: false });
    const herd = screen.getByRole('button', { name: 'Toggle Herd Management section' });

    fireEvent.click(herd);
    expect(herd.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('link', { name: 'Cow Register' })).toBeTruthy();

    fireEvent.click(herd);
    expect(herd.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('link', { name: 'Cow Register' })).toBeNull();
  });

  it('also all start folded in the phone drawer, even the current section', () => {
    window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
    useAuth.mockReturnValue({ currentUser: farmer });
    render(
      <MemoryRouter initialEntries={['/operations/herd']}>
        <Sidebar mobileOpen setMobileOpen={() => {}} />
      </MemoryRouter>
    );
    screen.getAllByRole('button', { name: /^Toggle .* section$/ })
      .forEach((toggle) => expect(toggle.getAttribute('aria-expanded')).toBe('false'));
    window.matchMedia = desktopWidth;
  });
});

describe('Sidebar section icons', () => {
  it('gives each main section its own farm icon, hidden from screen readers', () => {
    renderAs({ name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' });
    const iconOf = (section) => screen.getByRole('button', { name: `Toggle ${section} section` }).querySelector('svg');
    expect(iconOf('Herd Management').getAttribute('class')).toContain('lucide-cow-head');
    expect(iconOf('Feeding').getAttribute('class')).toContain('lucide-wheat');
    expect(iconOf('Herd Management').getAttribute('aria-hidden')).toBe('true');
    // Links stay text only.
    expect(screen.getByRole('link', { name: 'Cow Register' }).querySelector('svg')).toBeNull();
  });
});

describe('Sidebar phone drawer', () => {
  const farmer = { name: 'Farmer', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', farm_name: 'F1' };

  it('closes on Escape and keeps Tab inside while open', async () => {
    const { fireEvent } = await import('@testing-library/react');
    // The drawer exists on phones only (on desktop the sidebar is always shown).
    window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
    useAuth.mockReturnValue({ currentUser: farmer });
    const setMobileOpen = vi.fn();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { container, unmount } = render(<MemoryRouter><Sidebar mobileOpen setMobileOpen={setMobileOpen} /></MemoryRouter>);
    const close = screen.getByRole('button', { name: 'Close navigation menu' });
    // Focus moves into the drawer when it opens.
    expect(document.activeElement).toBe(close);

    // Shift+Tab from the first control wraps to the last one, not out to the page.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    const controls = container.querySelectorAll('aside a, aside button');
    expect(document.activeElement).toBe(controls[controls.length - 1]);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(setMobileOpen).toHaveBeenCalledWith(false);

    // Closing hands focus back to the button that opened it.
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
    window.matchMedia = desktopWidth;
  });

  it('shows the logo in the drawer header as a plain image, 32px tall', () => {
    window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
    useAuth.mockReturnValue({ currentUser: farmer });
    const { container } = render(<MemoryRouter><Sidebar mobileOpen setMobileOpen={() => {}} /></MemoryRouter>);
    const logo = container.querySelector('img[src="/brand/logo-horizontal-white.svg"]');
    expect(logo.getAttribute('height')).toBe('32');
    expect(logo.getAttribute('alt')).toBe('Maziwa Smart');
    expect(logo.closest('a')).toBeNull();
    window.matchMedia = desktopWidth;
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
