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

export const STAFF_PAGE_ACCESS_OPTIONS = Object.freeze([
  { key: 'dashboard', label: 'Command Center' },
  { key: 'production', label: 'Production and milk usage' },
  { key: 'tasks', label: 'Daily routine and task view' },
  { key: 'herd', label: 'Cow register and animal records' },
  { key: 'breeding', label: 'Breeding and genetics' },
  { key: 'medical', label: 'Medical records and veterinary care' },
  { key: 'feed', label: 'Feed planning and milk lab' },
  { key: 'customers', label: 'Customer and buyer management' },
  { key: 'finance', label: 'Ledger and financial reports' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'reports', label: 'Farm and milk reports' },
  { key: 'safety', label: 'Safety dashboard' },
  { key: 'staff', label: 'Staff registry' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'member_admin', label: 'Member onboarding' },
]);

const allPageKeys = STAFF_PAGE_ACCESS_OPTIONS.map(({ key }) => key);
export const DEFAULT_STAFF_PAGE_ACCESS = Object.freeze({
  FARM_HAND: ['production', 'tasks', 'herd', 'feed'],
  VETERINARY_DOCTOR: ['herd', 'breeding', 'medical'],
  FARM_SUPERVISOR: ['production', 'tasks', 'herd', 'breeding', 'medical', 'feed', 'reports', 'safety'],
  FARM_MANAGER: ['dashboard', 'production', 'tasks', 'herd', 'breeding', 'medical', 'feed', 'customers', 'reports', 'safety'],
  FARM_ADMIN: allPageKeys,
});

export function getDefaultStaffPageAccess(role) {
  const token = String(role || '').trim().replace(/[-\s]+/g, '_').toUpperCase();
  const normalized = token === 'SUPERVISOR' ? 'FARM_SUPERVISOR'
    : ['VET', 'VET_ASSISTANT'].includes(token) ? 'VETERINARY_DOCTOR'
      : token === 'FARMHAND' ? 'FARM_HAND' : token;
  return [...(DEFAULT_STAFF_PAGE_ACCESS[normalized] ?? [])];
}

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
