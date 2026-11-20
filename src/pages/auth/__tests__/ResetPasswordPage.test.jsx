import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from '../ResetPasswordPage';

void React;
afterEach(cleanup);

const auth = vi.hoisted(() => ({ currentUser: null, logout: vi.fn() }));
const api = vi.hoisted(() => ({ validateResetToken: vi.fn(), resetPassword: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../lib/backendApi', () => ({ authApi: api }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function LoginProbe() {
  const { state } = useLocation();
  return <div>Login page {state?.notice}</div>;
}

const renderPage = (search = '?token=abc123') => render(
  <MemoryRouter initialEntries={[`/reset-password${search}`]}>
    <Routes>
      <Route path="/reset-password" element={<><ResetPasswordPage /><LocationProbe /></>} />
      <Route path="/login" element={<LoginProbe />} />
    </Routes>
  </MemoryRouter>,
);

const invalidToken = () => Object.assign(new Error('400'), { response: { status: 400, data: { code: 'RESET_TOKEN_INVALID' }, headers: {} } });

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = null;
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    api.validateResetToken.mockResolvedValue({ valid: true, expires_at: '2026-11-02T10:10:00Z' });
    api.resetPassword.mockResolvedValue({ message: 'Password updated.' });
  });

  it('takes the token out of the address bar and keeps it out of referrers', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/reset-password'));
    expect(api.validateResetToken).toHaveBeenCalledWith('abc123');
    expect(document.querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe('no-referrer');
  });

  it('says a link has expired before asking for a password', async () => {
    api.validateResetToken.mockRejectedValue(invalidToken());
    renderPage();
    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeTruthy();
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(screen.getByRole('link', { name: 'Request a new link' }).getAttribute('href')).toBe('/forgot-password');
  });

  it('treats a missing token as an expired link', () => {
    renderPage('');
    expect(screen.getByRole('heading', { name: 'This link has expired' })).toBeTruthy();
    expect(api.validateResetToken).not.toHaveBeenCalled();
  });

  it('lets the farmer retry when the check fails on a bad connection', async () => {
    api.validateResetToken.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('New password')).toBeTruthy();
  });

  it('checks the new password and confirmation before sending', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'Maziwa2026' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Maziwa2027' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(screen.getByText('The passwords don’t match.')).toBeTruthy();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('saves the password and sends the farmer to log in, without signing them in', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'Maziwa2026' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Maziwa2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByText('Login page passwordUpdated')).toBeTruthy();
    expect(api.resetPassword).toHaveBeenCalledWith({ token: 'abc123', password: 'Maziwa2026', confirm_password: 'Maziwa2026' });
  });

  it('signs out a session on this device, since the reset revoked it', async () => {
    auth.currentUser = { id: 7 };
    renderPage();
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'Maziwa2026' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Maziwa2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });

  it('shows a password the server rejects as too common next to the field', async () => {
    api.resetPassword.mockRejectedValue(Object.assign(new Error('400'), {
      response: { status: 400, data: { code: 'WEAK_PASSWORD', violations: ['not_common'] }, headers: {} },
    }));
    renderPage();
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByText('That password is too common. Choose another one.')).toBeTruthy();
  });
});
