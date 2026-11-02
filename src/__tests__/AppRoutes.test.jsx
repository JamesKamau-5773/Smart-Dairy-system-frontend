import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PhoneVerificationRoute, ProtectedRoute, RequiredPasswordResetRoute, RoleLandingRedirect } from '../App';
import { useAuth } from '../contexts/AuthContext';

void React;

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(cleanup);

const renderProtectedPath = (authState) => {
  useAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/hr/staff']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/reset-required-password" element={<div>Required reset page</div>} />
        <Route path="/verify-phone" element={<div>Verify phone page</div>} />
        <Route path="/hr/staff" element={<ProtectedRoute><div>Staff registry</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('forced password reset routing', () => {
  it('intercepts a direct protected URL while the backend reset flag is true', () => {
    renderProtectedPath({ currentUser: { id: 7, requires_password_reset: true }, isLoading: false });

    expect(screen.getByText('Required reset page')).toBeTruthy();
    expect(screen.queryByText('Staff registry')).toBeNull();
  });

  it('allows the reset page only while the backend flag remains true', () => {
    useAuth.mockReturnValue({ currentUser: { id: 7, role: 'FARM_HAND', requires_password_reset: true }, isLoading: false });
    render(
      <MemoryRouter initialEntries={['/reset-required-password']}>
        <RequiredPasswordResetRoute><div>Password form</div></RequiredPasswordResetRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Password form')).toBeTruthy();
  });

  it('sends unauthenticated protected requests to login', () => {
    renderProtectedPath({ currentUser: null, isLoading: false });
    expect(screen.getByText('Login page')).toBeTruthy();
  });
});

describe('/app entry point', () => {
  const renderAppEntry = (authState) => {
    useAuth.mockReturnValue(authState);
    return render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/dashboard" element={<div>Command center</div>} />
          <Route path="/system-admin/dashboard" element={<div>System admin</div>} />
          <Route path="/app" element={<ProtectedRoute><RoleLandingRedirect /></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('sends signed-out visitors from the landing page CTA to login', () => {
    renderAppEntry({ currentUser: null, isLoading: false });
    expect(screen.getByText('Login page')).toBeTruthy();
  });

  it('sends signed-in users to their role landing page', () => {
    renderAppEntry({ currentUser: { id: 1, role: 'SUPER_ADMIN' }, isLoading: false });
    expect(screen.getByText('System admin')).toBeTruthy();
  });
});

describe('phone verification gate (AUTH_API_CONTRACT §2.3)', () => {
  it('keeps a Google user without a verified phone out of the app', () => {
    renderProtectedPath({ currentUser: { id: 7, auth_state: 'PHONE_VERIFICATION_REQUIRED' }, isLoading: false });
    expect(screen.getByText('Verify phone page')).toBeTruthy();
    expect(screen.queryByText('Staff registry')).toBeNull();
  });

  it('lets an active user into the app even with an unverified phone (banner only)', () => {
    renderProtectedPath({ currentUser: { id: 7, auth_state: 'ACTIVE', account_flags: { phone_verified: false } }, isLoading: false });
    expect(screen.getByText('Staff registry')).toBeTruthy();
  });

  it('sends a password reset before phone verification', () => {
    renderProtectedPath({ currentUser: { id: 7, auth_state: 'PHONE_VERIFICATION_REQUIRED', requires_password_reset: true }, isLoading: false });
    expect(screen.getByText('Required reset page')).toBeTruthy();
  });

  it('opens the phone screen for any signed-in user, but not signed-out visitors', () => {
    useAuth.mockReturnValue({ currentUser: { id: 7, auth_state: 'ACTIVE' }, isLoading: false });
    const { unmount } = render(
      <MemoryRouter initialEntries={['/verify-phone']}>
        <PhoneVerificationRoute><div>Phone form</div></PhoneVerificationRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Phone form')).toBeTruthy();
    unmount();

    useAuth.mockReturnValue({ currentUser: null, isLoading: false });
    render(
      <MemoryRouter initialEntries={['/verify-phone']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/verify-phone" element={<PhoneVerificationRoute><div>Phone form</div></PhoneVerificationRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login page')).toBeTruthy();
  });
});
