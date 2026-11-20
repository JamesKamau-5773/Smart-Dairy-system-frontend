import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '../ProfilePage';

afterEach(cleanup);

const api = vi.hoisted(() => ({ me: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(), sendEmailVerification: vi.fn() }));
const auth = vi.hoisted(() => ({ currentUser: { id: 7, role: 'FARMER' }, refreshUser: vi.fn(), updateSession: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), authApi: api }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const profile = {
  id: 7,
  name: 'Wanjiru Kamau',
  username: 'wanjiru',
  role: 'FARMER',
  role_label: 'Farm owner',
  member_since: '2025-03-14',
  phone_number: '+254712345678',
  email: 'wanjiru@example.com',
  farm_location: 'Nakuru County',
  farm_name: 'Silato Farm',
  account_flags: { phone_verified: true, email_verified: false, has_password: true, linked_providers: [] },
  staff_profile: null,
};

const apiError = (status, data) => Object.assign(new Error('failed'), { response: { status, data, headers: {} } });

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reset-required-password" element={<p>Forced reset page</p>} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('ProfilePage', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    auth.refreshUser.mockReset();
    auth.updateSession.mockReset();
    toast.mockReset(); toast.success.mockReset(); toast.error.mockReset();
    auth.currentUser = { id: 7, role: 'FARMER' };
    api.me.mockResolvedValue(profile);
    auth.refreshUser.mockResolvedValue(profile);
  });

  it('shows who the person is and each detail with its verification', async () => {
    renderPage();
    expect(await screen.findByText('Farmer · Silato Farm')).toBeTruthy();
    expect(screen.getByText('Member since 14 Mar 2025')).toBeTruthy();
    expect(screen.getByText('+254712345678')).toBeTruthy();
    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.getByText('Not verified')).toBeTruthy();
    // Unverified email: a link can be sent.
    fireEvent.click(screen.getByRole('button', { name: 'Send verification link' }));
    await waitFor(() => expect(api.sendEmailVerification).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Staff record' })).toBeNull();
  });

  it('shows the staff record when the login is linked to one', async () => {
    api.me.mockResolvedValue({ ...profile, staff_profile: { employee_id: 3, full_name: 'Wanjiru K.', job_title: 'Herdsman', hire_date: '2024-02-01', status: 'ACTIVE' } });
    renderPage();
    const staff = (await screen.findByRole('heading', { name: 'Staff record' })).closest('section');
    expect(within(staff).getByText('Herdsman')).toBeTruthy();
    expect(within(staff).getByText('01 Feb 2024')).toBeTruthy();
  });

  it('sends only what changed, then reads the account again', async () => {
    api.updateProfile.mockResolvedValue({ message: 'Profile updated' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Farm location'), { target: { value: 'Nyandarua County' } });
    // The same phone typed the local way is not a change.
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0712 345 678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith({ farm_location: 'Nyandarua County' }));
    await waitFor(() => expect(auth.refreshUser).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Your details are saved.');
  });

  it('puts the backend’s errors under their fields', async () => {
    api.updateProfile.mockRejectedValue(apiError(409, { code: 'EMAIL_IN_USE', error: 'email is already in use' }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Another account already uses this email.')).toBeTruthy();
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });

  it('says when a name is too long', async () => {
    api.updateProfile.mockRejectedValue(apiError(400, { code: 'VALIDATION_ERROR', fields: { name: 'too_long' } }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'W' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Use 120 characters or fewer.')).toBeTruthy();
  });

  it('changes the password and keeps this session with its new token', async () => {
    const session = { id: 7, access_token: 'new-token' };
    api.changePassword.mockResolvedValue(session);
    renderPage();
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'old-pass-1' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith({
      current_password: 'old-pass-1', new_password: 'Mkulima2026x', confirm_password: 'Mkulima2026x',
    }));
    await waitFor(() => expect(auth.updateSession).toHaveBeenCalledWith(session));
    expect(toast.success).toHaveBeenCalledWith('Password changed. You’ve been signed out on other devices.');
  });

  it('shows a wrong current password under that field', async () => {
    api.changePassword.mockRejectedValue(apiError(400, { code: 'INVALID_CURRENT_PASSWORD', fields: { current_password: 'invalid' } }));
    renderPage();
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'nope' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('That isn’t your current password.')).toBeTruthy();
  });

  it('sends an account that must reset its password to the forced-reset page', async () => {
    api.changePassword.mockRejectedValue(apiError(409, { code: 'PASSWORD_RESET_REQUIRED' }));
    renderPage();
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'temp-pass' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Forced reset page')).toBeTruthy();
  });

  it('asks a Google-only account to set a password, without a current one', async () => {
    api.me.mockResolvedValue({ ...profile, account_flags: { ...profile.account_flags, has_password: false } });
    api.changePassword.mockResolvedValue({ id: 7, access_token: 't' });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Set a password' })).toBeTruthy();
    expect(screen.queryByLabelText('Current password')).toBeNull();
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Mkulima2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith({
      current_password: '', new_password: 'Mkulima2026x', confirm_password: 'Mkulima2026x',
    }));
  });

  it('lets the demo look but not change anything', async () => {
    auth.currentUser = { id: 7, role: 'FARMER', is_demo: true, read_only: true };
    renderPage();
    expect(await screen.findByText(/This is the demo/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send verification link' })).toBeNull();
    expect(screen.getByLabelText('New password').matches(':disabled')).toBe(true);
  });
});
