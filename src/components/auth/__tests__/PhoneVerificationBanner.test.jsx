import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneVerificationBanner from '../PhoneVerificationBanner';

void React;

const auth = vi.hoisted(() => ({ currentUser: null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));

const renderBanner = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes>
      <Route path="/dashboard" element={<PhoneVerificationBanner />} />
      <Route path="/verify-phone" element={<div>Verify phone page</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('PhoneVerificationBanner', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('asks a user without a phone to add one', () => {
    auth.currentUser = { id: 1, phone_number: null, account_flags: { needs_phone: true } };
    renderBanner();
    expect(screen.getByText(/Add your phone number/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add phone/ }));
    expect(screen.getByText('Verify phone page')).toBeTruthy();
  });

  it('asks a user with an unverified phone to verify it', () => {
    auth.currentUser = { id: 1, phone_number: '+254712345678', account_flags: { phone_verified: false } };
    renderBanner();
    expect(screen.getByRole('button', { name: /Verify now/ })).toBeTruthy();
  });

  it('stays hidden for verified users and for sessions from an older backend', () => {
    auth.currentUser = { id: 1, phone_number: '+254712345678', account_flags: { phone_verified: true } };
    const { unmount } = renderBanner();
    expect(screen.queryByRole('button', { name: /Verify now/ })).toBeNull();
    unmount();

    auth.currentUser = { id: 1, phone_number: null };
    renderBanner();
    expect(screen.queryByRole('button', { name: /Add phone/ })).toBeNull();
  });

  it('stays dismissed for the rest of the session', async () => {
    vi.useFakeTimers();
    auth.currentUser = { id: 1, phone_number: null, account_flags: { needs_phone: true } };
    const { unmount } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(screen.queryByRole('button', { name: /Add phone/ })).toBeNull();
    unmount();

    renderBanner();
    expect(screen.queryByRole('button', { name: /Add phone/ })).toBeNull();
  });
});
