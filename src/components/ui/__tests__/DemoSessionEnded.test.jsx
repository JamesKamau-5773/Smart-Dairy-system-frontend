import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../contexts/AuthContext';
import { authApi } from '../../../lib/backendApi';
import { loadSession } from '../../../lib/sessionStore';
import { SESSION_EXPIRED_EVENT } from '../../../lib/sessionEvents';
import SessionExpiredSheet from '../SessionExpiredSheet';

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, authApi: { ...actual.authApi, me: vi.fn(), demo: vi.fn(), logout: vi.fn() } };
});

vi.mock('../../../lib/sessionStore', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(async (session) => session),
  clearSession: vi.fn(async () => {}),
  readActiveSession: vi.fn(() => null),
}));

const demoSession = {
  id: 99, token: 'demo-jwt', is_demo: true, read_only: true, name: 'Demo Visitor', role: 'FARMER',
  tenant_id: 'tenant_7', farm_id: 'farm_9', tenant_type: 'single', auth_state: 'ACTIVE',
};
const expired = () => Object.assign(new Error('HTTP 401'), { response: { status: 401, data: {} } });

function Where() {
  return <p>at {useLocation().pathname}</p>;
}

const renderApp = () => render(
  <AuthProvider>
    <MemoryRouter initialEntries={['/milk']}>
      <Routes><Route path="*" element={<><Where /><SessionExpiredSheet /></>} /></Routes>
    </MemoryRouter>
  </AuthProvider>,
);

describe('when the demo session ends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSession.mockResolvedValue(demoSession);
    authApi.me.mockReturnValue(new Promise(() => {}));
    authApi.logout.mockResolvedValue({});
  });
  afterEach(cleanup);

  it('offers restart and sign-up instead of a password form', async () => {
    renderApp();
    await screen.findByText('at /milk');
    act(() => { window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT)); });

    expect(await screen.findByText('Your demo has ended')).toBeTruthy();
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.getByRole('button', { name: 'Restart demo' })).toBeTruthy();
  });

  it('shows the same sheet when a stored demo session has already expired on reopening', async () => {
    authApi.me.mockRejectedValue(expired());
    renderApp();

    expect(await screen.findByText('Your demo has ended')).toBeTruthy();
  });

  it('ends the demo session before going to sign-up', async () => {
    renderApp();
    await screen.findByText('at /milk');
    act(() => { window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT)); });
    fireEvent.click(await screen.findByRole('button', { name: 'Create your free farm' }));

    expect(await screen.findByText('at /register')).toBeTruthy();
    expect(authApi.logout).toHaveBeenCalledTimes(1);
  });

  it('restarts the demo with a new session and keeps the visitor on their page', async () => {
    authApi.demo.mockResolvedValue({ ...demoSession, token: 'fresh-jwt' });
    renderApp();
    await screen.findByText('at /milk');
    act(() => { window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT)); });
    fireEvent.click(await screen.findByRole('button', { name: 'Restart demo' }));

    await waitFor(() => expect(screen.queryByText('Your demo has ended')).toBeNull());
    expect(authApi.demo).toHaveBeenCalledTimes(1);
    expect(screen.getByText('at /milk')).toBeTruthy();
  });
});
