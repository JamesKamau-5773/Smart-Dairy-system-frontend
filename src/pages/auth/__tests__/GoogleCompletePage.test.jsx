import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GoogleCompletePage from '../GoogleCompletePage';

void React;
afterEach(cleanup);

const auth = vi.hoisted(() => ({ refreshUser: vi.fn(), updateSession: vi.fn() }));
const api = vi.hoisted(() => ({
  googlePendingSignup: vi.fn(),
  googleSignup: vi.fn(),
  googleStartUrl: () => 'https://api.example/api/auth/google/start?intent=signin',
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../lib/backendApi', () => ({ authApi: api }));

const renderComplete = (search) => render(
  <MemoryRouter initialEntries={[`/auth/google/complete${search}`]}>
    <Routes>
      <Route path="/auth/google/complete" element={<GoogleCompletePage />} />
      <Route path="/verify-phone" element={<div>Verify phone page</div>} />
      <Route path="/dashboard" element={<div>Dashboard</div>} />
      <Route path="/login" element={<div>Login page</div>} />
      <Route path="/app" element={<div>App entry</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('GoogleCompletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    auth.updateSession.mockResolvedValue(undefined);
  });

  it('loads the cookie session and goes to `next`', async () => {
    auth.refreshUser.mockResolvedValue({ id: 7, auth_state: 'ACTIVE' });
    renderComplete('?result=signed_in&next=%2Fdashboard');
    expect(await screen.findByText('Dashboard')).toBeTruthy();
    expect(auth.refreshUser).toHaveBeenCalledTimes(1);
  });

  it('sends a user without a verified phone to the phone screen', async () => {
    auth.refreshUser.mockResolvedValue({ id: 7, auth_state: 'PHONE_VERIFICATION_REQUIRED' });
    renderComplete('?result=phone_verification_required&next=%2Fdashboard');
    expect(await screen.findByText('Verify phone page')).toBeTruthy();
  });

  it('ignores an off-site `next`', async () => {
    auth.refreshUser.mockResolvedValue({ id: 7, auth_state: 'ACTIVE' });
    renderComplete('?result=signed_in&next=https%3A%2F%2Fevil.example');
    expect(await screen.findByText('App entry')).toBeTruthy();
  });

  it('offers a retry if loading the account fails', async () => {
    auth.refreshUser
      .mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))
      .mockResolvedValueOnce({ id: 7, auth_state: 'ACTIVE' });
    renderComplete('?result=signed_in');
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('App entry')).toBeTruthy();
  });

  it('explains when an existing account must link Google itself', () => {
    renderComplete('?result=link_required');
    expect(screen.getByText(/Log in with your phone number and password, then link Google/)).toBeTruthy();
  });

  it.each([
    ['GOOGLE_CANCELLED', /was cancelled/],
    ['GOOGLE_ALREADY_LINKED', /already linked to a different/],
    ['SOMETHING_NEW', /Something went wrong with Google sign-in/],
  ])('explains error %s', (code, message) => {
    renderComplete(`?result=error&error_code=${code}`);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Continue with Google/ })).toBeTruthy();
  });

  describe('sign-up', () => {
    beforeEach(() => {
      api.googlePendingSignup.mockResolvedValue({ signup_token: 'st_1', email: 'jane@gmail.com', name: 'Jane Kamau', expires_in_seconds: 540 });
    });

    it('asks only for farm and phone, with the Google name filled in', async () => {
      renderComplete('?result=signup_required');
      expect(await screen.findByText(/Signed in with Google as jane@gmail.com/)).toBeTruthy();
      expect(screen.getByLabelText('Your name').value).toBe('Jane Kamau');
      expect(screen.getByLabelText('Farm name')).toBeTruthy();
      expect(screen.getByLabelText('Phone number')).toBeTruthy();
    });

    it('creates the account and goes on to phone verification', async () => {
      api.googleSignup.mockResolvedValue({ id: 9, auth_state: 'PHONE_VERIFICATION_REQUIRED', cookie_session: true });
      renderComplete('?result=signup_required');

      fireEvent.change(await screen.findByLabelText('Farm name'), { target: { value: 'Kamau Dairy' } });
      fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0712345678' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create farm account' }));

      expect(await screen.findByText('Verify phone page')).toBeTruthy();
      expect(api.googleSignup).toHaveBeenCalledWith({ signup_token: 'st_1', farm_name: 'Kamau Dairy', phone_number: '254712345678', name: 'Jane Kamau' });
      expect(auth.updateSession).toHaveBeenCalled();
    });

    it('starts Google again when the sign-up window has passed', async () => {
      api.googlePendingSignup.mockRejectedValue(Object.assign(new Error('404'), {
        response: { status: 404, data: { code: 'SIGNUP_SESSION_EXPIRED' }, headers: {} },
      }));
      renderComplete('?result=signup_required');
      expect(await screen.findByText(/took too long/)).toBeTruthy();
      await waitFor(() => expect(screen.getByRole('link', { name: /Continue with Google/ })).toBeTruthy());
    });
  });
});
