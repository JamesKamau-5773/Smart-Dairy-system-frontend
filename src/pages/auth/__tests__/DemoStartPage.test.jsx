import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../contexts/AuthContext';
import { authApi } from '../../../lib/backendApi';
import { loadSession, saveSession } from '../../../lib/sessionStore';
import DemoStartPage from '../DemoStartPage';

void React;

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, authApi: { ...actual.authApi, me: vi.fn(), demo: vi.fn() } };
});

vi.mock('../../../lib/sessionStore', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(async (session) => session),
  clearSession: vi.fn(async () => {}),
  readActiveSession: vi.fn(() => null),
}));

// The demo login answer, as in the backend's docs/demo-account.md.
const demoSession = {
  token: 'demo-jwt', is_demo: true, read_only: true, name: 'Demo Visitor', role: 'FARMER',
  tenant_id: 'tenant_7', tenant_name: 'Silato Farm', farm_id: 'farm_9', farm_name: 'Silato Farm',
  tenant_type: 'single', auth_state: 'ACTIVE',
};

const refusal = (status, data = {}, headers = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data, headers } });

function Where() {
  return <p>at {useLocation().pathname}</p>;
}

const renderDemo = () => render(
  <AuthProvider>
    <MemoryRouter initialEntries={['/demo']}>
      <Routes>
        <Route path="/demo" element={<DemoStartPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  </AuthProvider>,
);

describe('Try the live demo (/demo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSession.mockResolvedValue(null);
    authApi.me.mockRejectedValue(refusal(401));
  });
  afterEach(cleanup);

  it('starts a demo session through the API and lands on the dashboard like a login', async () => {
    authApi.demo.mockResolvedValue(demoSession);
    renderDemo();

    expect(await screen.findByText('at /dashboard')).toBeTruthy();
    expect(authApi.demo).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenCalledWith(demoSession);
  });

  it('tells the visitor how long the demo lasts, from the backend’s session_expires_at', async () => {
    const ready = vi.spyOn(toast, 'success').mockImplementation(() => '');
    const sessionExpiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    authApi.demo.mockResolvedValue({ ...demoSession, session_expires_at: sessionExpiresAt });
    renderDemo();

    await screen.findByText('at /dashboard');
    expect(ready).toHaveBeenCalledWith('Your demo farm is ready. You have 45 minutes to explore.', expect.anything());
    ready.mockRestore();
  });

  it('says only that the demo is ready when the backend sends no expiry', async () => {
    const ready = vi.spyOn(toast, 'success').mockImplementation(() => '');
    authApi.demo.mockResolvedValue(demoSession);
    renderDemo();

    await screen.findByText('at /dashboard');
    expect(ready).toHaveBeenCalledWith('Your demo farm is ready.', expect.anything());
    ready.mockRestore();
  });

  it('shows a loading state while the demo starts', async () => {
    authApi.demo.mockReturnValue(new Promise(() => {}));
    renderDemo();

    expect((await screen.findByRole('status')).textContent).toMatch(/Starting your demo farm/);
  });

  it('explains a rate limit and waits out Retry-After before allowing a retry', async () => {
    authApi.demo.mockRejectedValue(refusal(429, { code: 'RATE_LIMITED' }, { 'retry-after': '30' }));
    renderDemo();

    expect(await screen.findByText('Too many attempts. Try again in 30 seconds.')).toBeTruthy();
    const retry = await screen.findByRole('button', { name: /Try again in \d+s/ });
    expect(retry.disabled).toBe(true);
  });

  it.each([
    ['being prepared (503)', refusal(503, { code: 'DEMO_UNAVAILABLE' }), /being prepared/],
    ['switched off (404)', refusal(404, {}), /isn’t available right now/],
    ['unreachable', Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }), /couldn’t connect/],
  ])('shows a friendly message when the demo is %s, with a way to sign up', async (_, error, message) => {
    authApi.demo.mockRejectedValue(error);
    renderDemo();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create your free farm' }).getAttribute('href')).toBe('/register');
  });

  it('tries again from the failure screen', async () => {
    authApi.demo.mockRejectedValueOnce(refusal(503, { code: 'DEMO_UNAVAILABLE' })).mockResolvedValueOnce(demoSession);
    renderDemo();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('at /dashboard')).toBeTruthy();
    expect(authApi.demo).toHaveBeenCalledTimes(2);
  });

  it('never replaces a signed-in farmer’s session with the demo', async () => {
    loadSession.mockResolvedValue({ id: 7, name: 'Wanjiru', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', tenant_type: 'single', token: 'real' });
    authApi.me.mockReturnValue(new Promise(() => {}));
    renderDemo();

    expect(await screen.findByText('at /dashboard')).toBeTruthy();
    expect(authApi.demo).not.toHaveBeenCalled();
  });
});
