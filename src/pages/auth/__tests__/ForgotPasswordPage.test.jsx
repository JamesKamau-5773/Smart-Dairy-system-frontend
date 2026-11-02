import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from '../ForgotPasswordPage';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({ forgotPasswordOptions: vi.fn(), requestPasswordReset: vi.fn() }));
vi.mock('../../../lib/backendApi', () => ({ authApi: api }));

const options = (emailEnabled) => ({
  channels: [
    { id: 'whatsapp', enabled: true, input: 'phone_number', label: 'WhatsApp' },
    { id: 'email', enabled: emailEnabled, input: 'email', label: 'Email' },
  ],
  admin_reset_hint: 'Staff members can also ask their farm owner or administrator to reset their password.',
});

const renderPage = () => render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    api.forgotPasswordOptions.mockResolvedValue(options(true));
    api.requestPasswordReset.mockResolvedValue({
      message: 'If an account exists, we’ve sent instructions.',
      channel: 'whatsapp',
      message_text: 'RESET-731904',
      whatsapp_number: '+254700000000',
      wa_link: 'https://wa.me/254700000000?text=RESET-731904',
      expires_in_seconds: 600,
    });
  });

  it('offers WhatsApp straight away, before the options load', () => {
    api.forgotPasswordOptions.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByLabelText('Phone number')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /Email/ })).toBeNull();
  });

  it('only offers email when the platform has it enabled', async () => {
    api.forgotPasswordOptions.mockResolvedValue(options(false));
    renderPage();
    await waitFor(() => expect(api.forgotPasswordOptions).toHaveBeenCalled());
    expect(screen.queryByRole('radio', { name: /Email/ })).toBeNull();
  });

  it('switches to an email field when email is chosen', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('radio', { name: /Email/ }));
    expect(screen.getByRole('textbox', { name: 'Email' }).getAttribute('type')).toBe('email');
  });

  it('prefills the phone the farmer last logged in with', () => {
    localStorage.setItem('maziwa_last_login', '0712345678');
    renderPage();
    expect(screen.getByLabelText('Phone number').value).toBe('0712 345 678');
  });

  it('checks the number before sending', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/Enter a Kenyan mobile number/)).toBeTruthy();
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('hands off to WhatsApp with the reset code and the same message for everyone', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0712345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const link = await screen.findByRole('link', { name: /Send code on WhatsApp/ });
    expect(api.requestPasswordReset).toHaveBeenCalledWith(expect.objectContaining({ channel: 'whatsapp', phone_number: '254712345678' }));
    expect(link.getAttribute('href')).toBe('https://wa.me/254700000000?text=RESET-731904');
    expect(screen.getByText('RESET-731904')).toBeTruthy();
    expect(screen.getByText(/If an account exists/)).toBeTruthy();
    expect(screen.getByText(/Open the link we reply with/)).toBeTruthy();
  });

  it('confirms an email request without revealing whether the account exists', async () => {
    api.requestPasswordReset.mockResolvedValue({ message: 'If an account exists, we’ve sent instructions.', channel: 'email', expires_in_seconds: 600 });
    renderPage();
    fireEvent.click(await screen.findByRole('radio', { name: /Email/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'Jane@Example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/If an account with a verified email exists/)).toBeTruthy();
    expect(api.requestPasswordReset).toHaveBeenCalledWith(expect.objectContaining({ channel: 'email', email: 'jane@example.com' }));
  });

  it('shows rate limiting with a countdown on the button', async () => {
    api.requestPasswordReset.mockRejectedValue(Object.assign(new Error('429'), {
      response: { status: 429, data: { code: 'RATE_LIMITED' }, headers: { 'retry-after': '120' } },
    }));
    renderPage();
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0712345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Too many attempts. Try again in 120 seconds.')).toBeTruthy();
    expect((await screen.findByRole('button', { name: /Try again in \d+s/ })).disabled).toBe(true);
  });

  it('tells staff they can ask an administrator', async () => {
    renderPage();
    expect(await screen.findByText(/ask their farm owner or administrator/)).toBeTruthy();
  });
});
