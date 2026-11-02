import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../contexts/AuthContext';
import { authApi } from '../../../lib/backendApi';
import apiClient from '../../../lib/apiClient';
import { SESSION_EXPIRED_EVENT } from '../../../lib/sessionEvents';
import SessionExpiredSheet from '../SessionExpiredSheet';

void React;

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, authApi: { ...actual.authApi, me: vi.fn(), login: vi.fn(), logout: vi.fn() } };
});

vi.mock('../../../lib/sessionStore', () => ({
  loadSession: vi.fn(async () => ({ id: 7, name: 'Wanjiru', username: '0722000000', role: 'FARMER', tenant_id: 't1', farm_id: 'f1', token: 'old' })),
  saveSession: vi.fn(async (session) => session),
  clearSession: vi.fn(async () => {}),
  readActiveSession: vi.fn(() => null),
}));

function Page() {
  return (
    <>
      <label htmlFor="litres">Litres</label>
      <input id="litres" defaultValue="" />
      <SessionExpiredSheet />
    </>
  );
}

describe('expired session while working', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.me.mockReturnValue(new Promise(() => {}));
  });
  afterEach(cleanup);

  it('asks to sign in over the page, keeps typed input, and closes after signing in', async () => {
    render(<AuthProvider><Page /></AuthProvider>);
    const litres = await screen.findByLabelText('Litres');
    fireEvent.change(litres, { target: { value: '12.5' } });

    act(() => { window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT)); });
    expect(await screen.findByText('Please sign in again')).toBeTruthy();
    expect(screen.getByLabelText('Username or phone number').value).toBe('0722000000');

    authApi.login.mockResolvedValue({ id: 7, name: 'Wanjiru', token: 'new-token', tenant_id: 't1', farm_id: 'f1' });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in and continue' }));

    await waitFor(() => expect(screen.queryByText('Please sign in again')).toBeNull());
    expect(authApi.login).toHaveBeenCalledWith({ username: '0722000000', password: 'secret' });
    expect(screen.getByLabelText('Litres').value).toBe('12.5');
  });

  it('shows the sign-in error and stays open when the password is wrong', async () => {
    render(<AuthProvider><Page /></AuthProvider>);
    await screen.findByLabelText('Litres');
    act(() => { window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT)); });

    authApi.login.mockRejectedValue(Object.assign(new Error('Unauthorized'), { response: { status: 401, data: {} } }));
    fireEvent.change(await screen.findByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in and continue' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Please sign in again')).toBeTruthy();
  });
});

describe('apiClient 401 handling', () => {
  afterEach(() => sessionStorage.clear());

  it('announces a rejected session for signed-in users', async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 't1', token: 'old' }));
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    const adapter = (config) => Promise.reject(Object.assign(new Error('Unauthorized'), { config, response: { status: 401, data: {}, config } }));

    await expect(apiClient.get('/herd', { adapter })).rejects.toBeTruthy();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
