import { hasRole, isCooperativeAdmin, isSuperAdmin } from './roles';

export const FARM_MEMBER_ROLE_OPTIONS = Object.freeze([
  {
    value: 'FARM_ADMIN',
    label: 'Farm administrator',
    description: 'Owns farm setup, people access, and administrative controls.',
  },
  {
    value: 'FARM_MANAGER',
    label: 'Farm manager',
    description: 'Coordinates daily operations and supervises the farm team.',
  },
  {
    value: 'FARM_SUPERVISOR',
    label: 'Farm supervisor',
    description: 'Leads assigned workers and verifies daily work.',
  },
  {
    value: 'FARM_HAND',
    label: 'Farmhand',
    description: 'Carries out assigned farm tasks and operational entries.',
  },
  {
    value: 'VETERINARY_DOCTOR',
    label: 'Veterinary doctor',
    description: 'Records and reviews animal health work.',
  },
  {
    value: 'FARMER',
    label: 'Farmer / member',
    description: 'Uses standard member workflows without staff administration.',
  },
]);

export const FARM_STAFF_ROLE_OPTIONS = Object.freeze(
  FARM_MEMBER_ROLE_OPTIONS.filter((option) => option.value !== 'FARMER')
);

export function getAssignableFarmMemberRoles(actor) {
  if (isSuperAdmin(actor) || isCooperativeAdmin(actor)) {
    return FARM_MEMBER_ROLE_OPTIONS;
  }

  if (hasRole(actor, ['FARM_ADMIN'])) {
    return FARM_MEMBER_ROLE_OPTIONS.filter((option) => option.value !== 'FARM_ADMIN');
  }

  return [];
}

export function resolveInviteClaimUrl(invite, origin = '') {
  const rawUrl = invite?.invite_url ?? invite?.inviteUrl ?? invite?.invite_path ?? invite?.invitePath;
  const token = invite?.invite_token ?? invite?.inviteToken;
  const candidate = rawUrl || (token ? `/claim-account?token=${encodeURIComponent(token)}` : '');

  if (!candidate) return '';

  try {
    const resolved = new URL(candidate, origin || 'http://localhost');
    if (!['http:', 'https:'].includes(resolved.protocol)) return '';
    return origin ? resolved.toString() : candidate;
  } catch {
    return '';
  }
}
