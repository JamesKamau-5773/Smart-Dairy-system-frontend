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

const renderLogin = () => render(
  <MemoryRouter initialEntries={['/login']}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
    expect(screen.getByLabelText('Phone number or username').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password');
  });

  it('shows inline errors and focuses the first empty field instead of submitting', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    const username = screen.getByLabelText('Phone number or username');
    expect(screen.getByText('Enter your phone number or username.')).toBeTruthy();
    expect(username.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(username);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('remembers the phone number after a successful login', async () => {
    auth.login.mockResolvedValue({ success: true, user: { role: 'FARMER' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Phone number or username'), { target: { value: ' 0712345678 ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(screen.getByText('Workspace')).toBeTruthy());
    expect(auth.login).toHaveBeenCalledWith({ username: '0712345678', password: 'secret123' });
    expect(localStorage.getItem('maziwa_last_login')).toBe('0712345678');
  });

  it('greets a returning farmer and only asks for the password', async () => {
    localStorage.setItem('maziwa_last_login', '0712345678');
    auth.login.mockResolvedValue({ success: true, user: { role: 'FARMER' } });
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Karibu tena' })).toBeTruthy();
    expect(screen.getByText('0712 ••• 678')).toBeTruthy();
    expect(screen.queryByLabelText('Phone number or username')).toBeNull();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith({ username: '0712345678', password: 'secret123' }));
  });

  it('lets someone else log in on a shared phone', () => {
    localStorage.setItem('maziwa_last_login', '0712345678');
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Not you?' }));

    expect(screen.getByLabelText('Phone number or username').value).toBe('');
    expect(localStorage.getItem('maziwa_last_login')).toBeNull();
  });

  it('keeps the farmer on the page with the error when login fails', async () => {
    auth.login.mockResolvedValue({ success: false, error: 'Wrong phone number or password.' });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Phone number or username'), { target: { value: 'kamau' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Wrong phone number or password.')).toBeTruthy();
    expect(localStorage.getItem('maziwa_last_login')).toBeNull();
  });

  it('offers WhatsApp help for a forgotten password', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: /Forgot password/ });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
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
