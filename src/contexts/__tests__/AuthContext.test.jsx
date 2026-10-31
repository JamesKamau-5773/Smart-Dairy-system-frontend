import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { authApi } from '../../lib/backendApi';
import { clearSession, loadSession } from '../../lib/sessionStore';

void React;

vi.mock('../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authApi: { ...actual.authApi, me: vi.fn() },
    tenantApi: { ...actual.tenantApi, profile: vi.fn() },
  };
});

vi.mock('../../lib/sessionStore', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(async (session) => session),
  clearSession: vi.fn(async () => {}),
}));

const savedSession = { id: 7, name: 'Wanjiru', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', token: 'saved-token' };

function SessionProbe() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <p>loading</p>;
  return <p>{currentUser ? `signed in as ${currentUser.name}` : 'signed out'}</p>;
}

const renderProvider = () => render(<AuthProvider><SessionProbe /></AuthProvider>);

describe('AuthProvider session bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSession.mockResolvedValue(savedSession);
  });
  afterEach(cleanup);

  it('opens from the saved session before the server answers', async () => {
    authApi.me.mockReturnValue(new Promise(() => {}));
    renderProvider();

    expect(await screen.findByText('signed in as Wanjiru')).toBeTruthy();
  });

  it.each([
    ['no network', Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })],
    ['a timeout', Object.assign(new Error('timeout'), { code: 'ECONNABORTED' })],
    ['a server error', Object.assign(new Error('Server Error'), { response: { status: 503 } })],
  ])('keeps the farmer signed in when verification fails with %s', async (_, error) => {
    authApi.me.mockRejectedValue(error);
    renderProvider();

    await waitFor(() => expect(authApi.me).toHaveBeenCalled());
    expect(await screen.findByText('signed in as Wanjiru')).toBeTruthy();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it.each([401, 403])('signs out when the server rejects the saved token with %s', async (status) => {
    authApi.me.mockRejectedValue(Object.assign(new Error('Rejected'), { response: { status } }));
    renderProvider();

    expect(await screen.findByText('signed out')).toBeTruthy();
    expect(clearSession).toHaveBeenCalled();
  });

  it('refreshes the session from the server when verification succeeds', async () => {
    authApi.me.mockResolvedValue({ ...savedSession, name: 'Wanjiru Kamau' });
    renderProvider();

    expect(await screen.findByText('signed in as Wanjiru Kamau')).toBeTruthy();
  });
});
