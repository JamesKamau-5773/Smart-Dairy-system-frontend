import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VerifyPhonePage from '../VerifyPhonePage';

void React;

const auth = vi.hoisted(() => ({ currentUser: null, refreshUser: vi.fn(), logout: vi.fn() }));
const api = vi.hoisted(() => ({ startPhoneVerification: vi.fn(), phoneVerificationStatus: vi.fn() }));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../lib/backendApi', () => ({ authApi: api }));

const challenge = (overrides = {}) => ({
  verification_id: 'pv_1',
  status: 'pending',
  phone_number: '+254712345678',
  message_text: 'VERIFY-482913',
  whatsapp_number: '+254700000000',
  wa_link: 'https://wa.me/254700000000?text=VERIFY-482913',
  expires_at: new Date(Date.now() + 600_000).toISOString(),
  expires_in_seconds: 600,
  ...overrides,
});

const apiError = (status, code) => Object.assign(new Error('Request failed'), { response: { status, data: { code }, headers: {} } });

const renderPage = () => render(
  <MemoryRouter initialEntries={['/verify-phone']}>
    <Routes>
      <Route path="/verify-phone" element={<VerifyPhonePage />} />
      <Route path="*" element={<div>Workspace</div>} />
    </Routes>
  </MemoryRouter>,
);

// Let the polling timer fire and its request settle.
const advancePoll = () => act(() => vi.advanceTimersByTimeAsync(3000));

describe('VerifyPhonePage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    auth.currentUser = {
      id: 7,
      role: 'FARMER',
      tenant_type: 'single',
      phone_number: '+254712345678',
      auth_state: 'PHONE_VERIFICATION_REQUIRED',
      account_flags: { phone_verified: false },
    };
    api.startPhoneVerification.mockResolvedValue(challenge());
    api.phoneVerificationStatus.mockResolvedValue({ status: 'pending' });
    auth.refreshUser.mockResolvedValue({ ...auth.currentUser, auth_state: 'ACTIVE' });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('asks for a code once and opens WhatsApp in a new tab with it pre-filled', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: /Verify via WhatsApp/ });
    expect(api.startPhoneVerification).toHaveBeenCalledTimes(1);
    expect(link.getAttribute('href')).toBe('https://wa.me/254700000000?text=VERIFY-482913');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(screen.getByText('VERIFY-482913')).toBeTruthy();
    expect(screen.getByText('Waiting for your WhatsApp message…')).toBeTruthy();
    expect(await screen.findByText(/Code expires in \d+:\d{2}/)).toBeTruthy();
  });

  it('polls until the backend confirms, then reloads the account and continues', async () => {
    api.phoneVerificationStatus
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'verified' });
    renderPage();
    await screen.findByRole('link', { name: /Verify via WhatsApp/ });

    await advancePoll();
    await advancePoll();

    expect(await screen.findByText(/Phone verified/)).toBeTruthy();
    expect(api.phoneVerificationStatus).toHaveBeenCalledWith('pv_1');
    await waitFor(() => expect(auth.refreshUser).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: /Continue/ }));
    expect(await screen.findByText('Workspace')).toBeTruthy();
  });

  it('checks straight away when the farmer comes back from WhatsApp', async () => {
    renderPage();
    await screen.findByRole('link', { name: /Verify via WhatsApp/ });
    // Let the polling effect attach its listeners before the farmer "returns".
    await act(async () => {});

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(api.phoneVerificationStatus).toHaveBeenCalledTimes(1));
  });

  it('offers a new code when the old one expires', async () => {
    api.phoneVerificationStatus.mockResolvedValue({ status: 'expired' });
    renderPage();
    await screen.findByRole('link', { name: /Verify via WhatsApp/ });
    await advancePoll();

    expect(await screen.findByText(/Code expired/)).toBeTruthy();
    api.startPhoneVerification.mockResolvedValue(challenge({ verification_id: 'pv_2' }));
    // The resend cooldown is still running from the first code.
    const getNew = screen.getByRole('button', { name: /Try again in|Get a new code/ });
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    fireEvent.click(getNew);
    await waitFor(() => expect(api.startPhoneVerification).toHaveBeenCalledTimes(2));
  });

  it('explains a locked code', async () => {
    api.phoneVerificationStatus.mockResolvedValue({ status: 'locked' });
    renderPage();
    await screen.findByRole('link', { name: /Verify via WhatsApp/ });
    await advancePoll();
    expect(await screen.findByText(/Too many wrong codes/)).toBeTruthy();
  });

  it('holds the resend button until the cooldown passes', async () => {
    renderPage();
    const resend = await screen.findByRole('button', { name: /Get a new code in \d+s/ });
    expect(resend.disabled).toBe(true);
  });

  it('resumes a code already sent instead of asking for a new one after a reload', async () => {
    sessionStorage.setItem('maziwa_phone_verification', JSON.stringify(challenge()));
    renderPage();

    expect(await screen.findByRole('link', { name: /Verify via WhatsApp/ })).toBeTruthy();
    expect(api.startPhoneVerification).not.toHaveBeenCalled();
  });

  it('treats an already-verified number as done', async () => {
    api.startPhoneVerification.mockRejectedValue(apiError(409, 'PHONE_ALREADY_VERIFIED'));
    renderPage();
    expect(await screen.findByText(/Phone verified/)).toBeTruthy();
  });

  describe('when the account has no phone yet', () => {
    beforeEach(() => {
      auth.currentUser = { ...auth.currentUser, phone_number: null, auth_state: 'ACTIVE', account_flags: { needs_phone: true } };
    });

    it('asks for the number first and accepts 07… or +254…', async () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Add your phone number' })).toBeTruthy();
      expect(api.startPhoneVerification).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+254712345678' } });
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(api.startPhoneVerification).toHaveBeenCalledWith('254712345678'));
      expect(await screen.findByRole('link', { name: /Verify via WhatsApp/ })).toBeTruthy();
    });

    it('shows a number already in use next to the field', async () => {
      api.startPhoneVerification.mockRejectedValue(apiError(409, 'PHONE_IN_USE'));
      renderPage();

      fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0712345678' } });
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByText(/already uses this phone number/)).toBeTruthy();
      expect(screen.getByLabelText('Phone number').getAttribute('aria-invalid')).toBe('true');
    });

    it('lets an active user skip for now', () => {
      renderPage();
      expect(screen.getByRole('link', { name: 'Do this later' })).toBeTruthy();
    });
  });

  it('only offers log out to a user who must verify before entering', async () => {
    renderPage();
    await screen.findByRole('link', { name: /Verify via WhatsApp/ });
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Do this later' })).toBeNull();
  });
});
