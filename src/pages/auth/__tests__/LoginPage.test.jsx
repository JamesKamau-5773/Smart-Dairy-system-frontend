import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../LoginPage';

void React;
afterEach(cleanup);

const auth = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

vi.mock('../../../lib/backendApi', () => ({
  authApi: { googleStartUrl: ({ next }) => `https://api.example/api/auth/google/start?intent=signin&next=${encodeURIComponent(next)}` },
}));

const renderLogin = (entry = '/login') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<div>Forgot password page</div>} />
      <Route path="/verify-phone" element={<div>Verify phone page</div>} />
      <Route path="*" element={<div>Workspace</div>} />
    </Routes>
  </MemoryRouter>,
);

const setOnline = (value) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.login.mockReset();
    setOnline(true);
  });

  it('labels its fields so tapping a label focuses the input', () => {
    renderLogin();
    expect(screen.getByLabelText('Phone or email').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password');
  });

  it('shows inline errors and focuses the first empty field instead of submitting', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    const username = screen.getByLabelText('Phone or email');
    expect(screen.getByText('Enter your phone number or email.')).toBeTruthy();
    expect(username.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(username);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('remembers the phone number after a successful login', async () => {
    auth.login.mockResolvedValue({ success: true, user: { role: 'FARMER' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Phone or email'), { target: { value: ' 0712345678 ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(screen.getByText('Workspace')).toBeTruthy());
    expect(auth.login).toHaveBeenCalledWith({ login: '0712345678', password: 'secret123' });
    expect(localStorage.getItem('maziwa_last_login')).toBe('0712345678');
  });

  it('greets a returning farmer and only asks for the password', async () => {
    localStorage.setItem('maziwa_last_login', '0712345678');
    auth.login.mockResolvedValue({ success: true, user: { role: 'FARMER' } });
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Karibu tena' })).toBeTruthy();
    expect(screen.getByText('0712 ••• 678')).toBeTruthy();
    expect(screen.queryByLabelText('Phone or email')).toBeNull();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith({ login: '0712345678', password: 'secret123' }));
  });

  it('lets someone else log in on a shared phone', () => {
    localStorage.setItem('maziwa_last_login', '0712345678');
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Not you?' }));

    expect(screen.getByLabelText('Phone or email').value).toBe('');
    expect(localStorage.getItem('maziwa_last_login')).toBeNull();
  });

  it('keeps the farmer on the page with the error when login fails', async () => {
    auth.login.mockResolvedValue({ success: false, error: 'Wrong phone number or password.' });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Phone or email'), { target: { value: 'kamau' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Wrong phone number or password.')).toBeTruthy();
    expect(localStorage.getItem('maziwa_last_login')).toBeNull();
  });

  it('links a forgotten password to the reset flow', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('link', { name: 'Forgot password?' }));
    expect(screen.getByText('Forgot password page')).toBeTruthy();
  });

  it('accepts an email in the same field', async () => {
    auth.login.mockResolvedValue({ success: true, user: { role: 'FARMER' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Phone or email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith({ login: 'jane@example.com', password: 'secret123' }));
  });

  it('sends a user the backend has gated to the phone screen', async () => {
    auth.login.mockResolvedValue({ success: true, user: { role: 'FARMER', auth_state: 'PHONE_VERIFICATION_REQUIRED' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Phone or email'), { target: { value: '0712345678' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Verify phone page')).toBeTruthy();
  });

  it('waits out a rate limit before allowing another attempt', async () => {
    auth.login.mockResolvedValue({ success: false, error: 'Too many attempts. Try again in 30 seconds.', details: { retryAfter: 30 } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Phone or email'), { target: { value: '0712345678' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    const button = await screen.findByRole('button', { name: /Try again in \d+s/ });
    expect(button.disabled).toBe(true);
  });

  it('offers Google sign-in without loading any Google script', () => {
    renderLogin();
    const google = screen.getByRole('link', { name: /Continue with Google/ });
    expect(google.getAttribute('href')).toContain('/auth/google/start?intent=signin&next=%2Fapp');
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });

  it('confirms a password reset when sent back from the reset screen', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { notice: 'passwordUpdated' } }]}>
        <Routes><Route path="/login" element={<LoginPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Password updated. Log in with your new password.')).toBeTruthy();
  });

  it('explains and blocks login while offline', () => {
    setOnline(false);
    renderLogin();
    expect(screen.getByText(/You’re offline/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log in' }).disabled).toBe(true);
  });

  it('toggles password visibility with an accessible button', () => {
    renderLogin();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe('true');
  });
});
