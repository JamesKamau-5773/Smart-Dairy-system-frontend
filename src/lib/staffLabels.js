import { FARM_MEMBER_ROLE_OPTIONS } from './staffOnboarding';

// Words for the backend's staff codes, so screens never show FARM_HAND or ON_LEAVE.

const ROLE_LABELS = Object.fromEntries(FARM_MEMBER_ROLE_OPTIONS.map(({ value, label }) => [value, label]));

export function roleLabel(role) {
  const code = String(role ?? '').trim().replace(/[-\s]+/g, '_').toUpperCase();
  if (ROLE_LABELS[code]) return ROLE_LABELS[code];
  return code ? code.charAt(0) + code.slice(1).toLowerCase().replaceAll('_', ' ') : '';
}

export const STAFF_STATUS = Object.freeze({
  // `tone` names a TONES entry (components/ui/tones), drawn by the status chip.
  ACTIVE: { label: 'Active', tone: 'info' },
  ON_LEAVE: { label: 'On leave', tone: 'neutral' },
  OVERDUE: { label: 'Overdue from leave', tone: 'attention' },
  INACTIVE: { label: 'Former staff', tone: 'neutral' },
});

export const staffStatus = (status) => STAFF_STATUS[status] ?? STAFF_STATUS.INACTIVE;

const ACCOUNT_LABELS = {
  ACTIVE: 'Can sign in',
  INVITED: 'Invite sent',
  INVITE_PENDING: 'Invite sent',
};

export const accountLabel = (accountStatus) => ACCOUNT_LABELS[accountStatus] ?? 'No app access';
export const hasAppAccount = (accountStatus) => accountStatus === 'ACTIVE';

// The backend's offboarding reasons (OffboardingReason), with words for each.
export const OFFBOARDING_REASONS = Object.freeze([
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'CONTRACT_ENDED', label: 'Contract ended' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'REDUNDANCY', label: 'Made redundant' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'DECEASED', label: 'Passed away' },
  { value: 'OTHER', label: 'Other' },
]);
