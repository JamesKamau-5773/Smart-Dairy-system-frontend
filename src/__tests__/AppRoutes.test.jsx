import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RequiredPasswordResetRoute } from '../App';
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