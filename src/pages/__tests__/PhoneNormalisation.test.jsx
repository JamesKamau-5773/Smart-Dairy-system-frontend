// UX audit phase 6: phone numbers typed in the cooperative forms are checked and sent in the
// one format the API takes (254…), using the shared phone.js helpers.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CooperativeAdminOnboardingPage from '../auth/CooperativeAdminOnboardingPage';
import { onboardingApi } from '../../lib/backendApi';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: 'COOP_ADMIN' } }) }));
vi.mock('../../components/auth/InviteClaimPreview', () => ({ default: () => null }));
vi.mock('../../lib/backendApi', async (importOriginal) => ({
  ...(await importOriginal()),
  onboardingApi: { inviteMember: vi.fn().mockResolvedValue({}), importMembersCsv: vi.fn() },
}));

afterEach(cleanup);

function fillInvite(phone) {
  render(<CooperativeAdminOnboardingPage />);
  fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Amina Wanjiru' } });
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'amina@example.com' } });
  const phoneInput = screen.getByLabelText(/Phone Number/i);
  fireEvent.change(phoneInput, { target: { value: phone } });
  fireEvent.submit(phoneInput.closest('form'));
  return phoneInput;
}

describe('cooperative member invite phone', () => {
  it('formats as typed and sends 254…', async () => {
    const input = fillInvite('0712345678');
    expect(input.value).toBe('0712 345 678');
    await waitFor(() => expect(onboardingApi.inviteMember).toHaveBeenCalledWith(expect.objectContaining({ phone_number: '254712345678' })));
  });

  it('says what’s wrong with a number that isn’t a Kenyan mobile, and sends nothing', () => {
    onboardingApi.inviteMember.mockClear();
    const input = fillInvite('12345');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Enter a Kenyan mobile number, for example 0712 345 678.')).toBeTruthy();
    expect(onboardingApi.inviteMember).not.toHaveBeenCalled();
  });
});
