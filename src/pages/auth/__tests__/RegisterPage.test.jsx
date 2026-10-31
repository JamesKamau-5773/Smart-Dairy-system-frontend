import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../RegisterPage';

void React;
afterEach(cleanup);

const auth = vi.hoisted(() => ({ register: vi.fn() }));
const bootstrapStatus = vi.hoisted(() => vi.fn());

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

vi.mock('../../../lib/backendApi', () => ({
  authApi: { bootstrapStatus },
}));

const renderRegister = (path = '/register') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<div>Workspace</div>} />
    </Routes>
  </MemoryRouter>,
);

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Create farm account/ }));

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    auth.register.mockReset();
    bootstrapStatus.mockReset().mockResolvedValue({ bootstrap_available: true });
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });

  it('asks farmers for only farm name, phone and password', () => {
    renderRegister();
    expect(screen.getByLabelText('Farm name')).toBeTruthy();
    expect(screen.getByLabelText('Phone number').getAttribute('inputmode')).toBe('tel');
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('new-password');
    expect(screen.queryByLabelText('Owner setup code')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('does not offer owner setup on the public page, even when the backend allows it', () => {
    renderRegister();
    expect(bootstrapStatus).not.toHaveBeenCalled();
    expect(screen.queryByText(/platform owner/i)).toBeNull();
  });

  it('shows every problem next to its field and focuses the first one', () => {
    renderRegister();
    fill('Phone number', '12345');
    fill('Password', 'short');
    submit();

    expect(screen.getByText('Enter your farm’s name.')).toBeTruthy();
    expect(screen.getByText(/Enter a Kenyan mobile number/)).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Farm name'));
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('clears a field’s error as soon as the farmer edits it', () => {
    renderRegister();
    submit();
    fill('Farm name', 'Bahati Dairies');
    expect(screen.queryByText('Enter your farm’s name.')).toBeNull();
  });

  it('formats the phone number as it is typed', () => {
    renderRegister();
    fill('Phone number', '0712345678');
    expect(screen.getByLabelText('Phone number').value).toBe('0712 345 678');
  });

  it('sends a normalised phone number, welcomes the farm and opens the workspace', async () => {
    auth.register.mockResolvedValue({ success: true });
    renderRegister();

    fill('Farm name', '  Bahati Dairies ');
    fill('Phone number', '0712345678');
    fill('Password', 'secret123');
    submit();

    await waitFor(() => expect(auth.register).toHaveBeenCalledWith({
      farm_name: 'Bahati Dairies',
      phone_number: '254712345678',
      password: 'secret123',
    }));
    expect(await screen.findByText('Karibu, Bahati Dairies!')).toBeTruthy();
    expect(localStorage.getItem('maziwa_last_login')).toBe('0712 345 678');
    await waitFor(() => expect(screen.getByText('Workspace')).toBeTruthy());
  });

  it('shows a server error beside the button and lets the farmer try again', async () => {
    auth.register.mockResolvedValue({ success: false, error: 'This phone number is already registered.' });
    renderRegister();

    fill('Farm name', 'Bahati Dairies');
    fill('Phone number', '0712345678');
    fill('Password', 'secret123');
    submit();

    expect(await screen.findByText('This phone number is already registered.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create farm account/ }).disabled).toBe(false);
  });

  describe('platform owner setup (?setup=owner)', () => {
    it('shows the owner form when the backend allows it', async () => {
      renderRegister('/register?setup=owner');
      expect(await screen.findByLabelText('Owner setup code')).toBeTruthy();
      expect(screen.getByLabelText('Full name')).toBeTruthy();
    });

    it('falls back to the farm form when owner setup is closed', async () => {
      bootstrapStatus.mockResolvedValue({ bootstrap_available: false });
      renderRegister('/register?setup=owner');
      await waitFor(() => expect(bootstrapStatus).toHaveBeenCalled());
      expect(screen.getByLabelText('Farm name')).toBeTruthy();
      expect(screen.queryByLabelText('Owner setup code')).toBeNull();
    });

    it('sends the super admin payload', async () => {
      auth.register.mockResolvedValue({ success: true });
      renderRegister('/register?setup=owner');

      await screen.findByLabelText('Full name');
      fill('Full name', 'Jane Owner');
      fill('Phone number', '+254 712 345 678');
      fill('Password', 'secret123');
      fill('Owner setup code', 'setup-key');
      fireEvent.click(screen.getByRole('button', { name: /Create owner account/ }));

      await waitFor(() => expect(auth.register).toHaveBeenCalledWith(expect.objectContaining({
        full_name: 'Jane Owner',
        phone_number: '254712345678',
        role: 'SUPER_ADMIN',
        bootstrap_key: 'setup-key',
      })));
    });
  });
});
