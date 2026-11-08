// UX audit phase 3: an unknown address shows a not-found page (inside the app shell when
// signed in, a public page when signed out) instead of silently redirecting.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Outlet } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../providers/StaffProvider', () => ({ StaffProvider: ({ children }) => children }));
// The real shell needs the whole app's providers; its own tests cover it.
vi.mock('../layouts/DashboardLayout', () => ({
  default: ({ children = null }) => <div data-testid="app-shell">{children ?? <Outlet />}</div>,
}));

const FARM_OWNER = { id: 1, role: 'FARMER', tenant_id: 3, farm_id: 4, tenant_type: 'single' };

function renderAt(path, currentUser) {
  useAuth.mockReturnValue({ currentUser, isLoading: false });
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('unknown addresses', () => {
  it('signed in: shows the not-found page inside the app, with a way to the dashboard', async () => {
    renderAt('/operations/not-a-page', FARM_OWNER);

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that page' })).toBeTruthy();
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to your dashboard' }).getAttribute('href')).toBe('/dashboard');
    expect(window.location.pathname).toBe('/operations/not-a-page');
  });

  it('signed out: shows a public not-found page with a way to log in', async () => {
    renderAt('/operations/not-a-page', null);

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that page' })).toBeTruthy();
    expect(screen.queryByTestId('app-shell')).toBeNull();
    expect(screen.getByRole('link', { name: 'Go to log in' }).getAttribute('href')).toBe('/login');
  });
});

describe('known addresses still work with the pathless app shell', () => {
  it('the app entry sends a signed-in owner to their dashboard', async () => {
    renderAt('/app', FARM_OWNER);
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
    expect(screen.queryByRole('heading', { name: 'We couldn’t find that page' })).toBeNull();
  });

  it('the root sends a signed-in owner to their dashboard', async () => {
    renderAt('/', FARM_OWNER);
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
  });

  it('a real page still sends a signed-out visitor to log in', async () => {
    renderAt('/dashboard', null);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });
});
