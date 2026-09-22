import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../apiClient';
import {
  getAssignableFarmMemberRoles,
  resolveInviteClaimUrl,
} from '../staffOnboarding';
import { hrApi, normalizeSessionUser, normalizeStaffRecord } from '../backendApi';

afterEach(() => vi.restoreAllMocks());

describe('farm member role policy', () => {
  it('lets cooperative admins assign all supported farm roles', () => {
    const roles = getAssignableFarmMemberRoles({ role: 'ADMIN', tenant_type: 'cooperative' });

    expect(roles.map((option) => option.value)).toEqual([
      'FARM_ADMIN',
      'FARM_MANAGER',
      'FARM_SUPERVISOR',
      'FARM_HAND',
      'VETERINARY_DOCTOR',
      'FARMER',
    ]);
  });

  it('prevents farm admins from granting farm administrator access', () => {
    const roles = getAssignableFarmMemberRoles({ role: 'FARM_ADMIN', tenant_type: 'cooperative' });

    expect(roles.map((option) => option.value)).not.toContain('FARM_ADMIN');
    expect(roles.map((option) => option.value)).toContain('FARM_MANAGER');
  });

  it('does not give a farm manager account-administration rights', () => {
    expect(getAssignableFarmMemberRoles({ role: 'FARM_MANAGER', tenant_type: 'cooperative' })).toEqual([]);
  });
});

describe('staff account normalization', () => {
  it('preserves backend-owned account linkage fields', () => {
    expect(normalizeStaffRecord({
      id: 'staff_7',
      phone_number: '254712345678',
      user_id: 42,
      account_status: 'INVITED',
    })).toMatchObject({
      id: 'staff_7',
      phoneNumber: '254712345678',
      userId: 42,
      accountStatus: 'INVITED',
    });
  });

  it('normalizes invite status and preserves the forced-reset session flag', () => {
    expect(normalizeStaffRecord({ account_status: 'INVITE PENDING' }).accountStatus).toBe('INVITE_PENDING');
    expect(normalizeSessionUser({ id: 42, requires_password_reset: true }).requires_password_reset).toBe(true);
    expect(normalizeSessionUser({ id: 42, requiresPasswordReset: true }).requires_password_reset).toBe(true);
  });

  it('maps edited phone numbers to the backend staff update contract', async () => {
    const request = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      data: { id: 7, phone_number: '254712345678' },
    });

    await hrApi.updateStaff(7, { name: 'Dominic Kamau', phoneNumber: '254712345678' });

    expect(request).toHaveBeenCalledWith('/hr/staff/7', {
      name: 'Dominic Kamau',
      phone_number: '254712345678',
    });
  });
});

describe('invite claim URL', () => {
  it('uses a backend-issued relative invite URL', () => {
    expect(resolveInviteClaimUrl(
      { invite_url: '/claim-account?token=server-token' },
      'https://farm.example'
    )).toBe('https://farm.example/claim-account?token=server-token');
  });

  it('falls back to a backend-issued token and rejects unsafe schemes', () => {
    expect(resolveInviteClaimUrl(
      { invite_token: 'server token' },
      'https://farm.example'
    )).toBe('https://farm.example/claim-account?token=server%20token');
    expect(resolveInviteClaimUrl(
      { invite_url: 'javascript:alert(1)' },
      'https://farm.example'
    )).toBe('');
  });

  it('does not manufacture a link without a server-issued credential', () => {
    expect(resolveInviteClaimUrl({}, 'https://farm.example')).toBe('');
  });
});
