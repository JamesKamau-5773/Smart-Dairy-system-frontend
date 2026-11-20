import { hasRole, isCooperativeAdmin, isSuperAdmin } from './roles';
import { staffCopy } from '../i18n/staff';

// Labels and descriptions are read from staffCopy when shown, so they follow the chosen language.
const roleOption = (value) => Object.freeze({
  value,
  get label() { return staffCopy.roles[value].label; },
  get description() { return staffCopy.roles[value].description; },
});

export const FARM_MEMBER_ROLE_OPTIONS = Object.freeze(
  ['FARM_ADMIN', 'FARM_MANAGER', 'FARM_SUPERVISOR', 'FARM_HAND', 'VETERINARY_DOCTOR', 'FARMER'].map(roleOption),
);

export const FARM_STAFF_ROLE_OPTIONS = Object.freeze(
  FARM_MEMBER_ROLE_OPTIONS.filter((option) => option.value !== 'FARMER')
);

export const STAFF_PAGE_ACCESS_OPTIONS = Object.freeze([
  'dashboard', 'production', 'tasks', 'herd', 'breeding', 'medical', 'feeding', 'feed',
  'customers', 'finance', 'inventory', 'reports', 'safety', 'staff', 'payroll', 'member_admin',
].map((key) => Object.freeze({ key, get label() { return staffCopy.pages[key]; } })));

const allPageKeys = STAFF_PAGE_ACCESS_OPTIONS.map(({ key }) => key);
export const DEFAULT_STAFF_PAGE_ACCESS = Object.freeze({
  // Farm hands feed the cows but don't see prices or recipe shares.
  FARM_HAND: ['production', 'tasks', 'herd', 'feeding'],
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
