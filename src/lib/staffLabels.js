import { staffCopy } from '../i18n/staff';

// Words for the backend's staff codes, so screens never show FARM_HAND or ON_LEAVE.

export function roleLabel(role) {
  const code = String(role ?? '').trim().replace(/[-\s]+/g, '_').toUpperCase();
  const known = staffCopy.roles[code];
  if (known) return known.label;
  return code ? code.charAt(0) + code.slice(1).toLowerCase().replaceAll('_', ' ') : '';
}

export const STAFF_STATUS = Object.freeze({
  // `tone` names a TONES entry (components/ui/tones), drawn by the status chip.
  ACTIVE: { get label() { return staffCopy.statuses.ACTIVE; }, tone: 'info' },
  ON_LEAVE: { get label() { return staffCopy.statuses.ON_LEAVE; }, tone: 'neutral' },
  OVERDUE: { get label() { return staffCopy.statuses.OVERDUE; }, tone: 'attention' },
  INACTIVE: { get label() { return staffCopy.statuses.INACTIVE; }, tone: 'neutral' },
});

export const staffStatus = (status) => STAFF_STATUS[status] ?? STAFF_STATUS.INACTIVE;

export const accountLabel = (accountStatus) => (accountStatus && accountStatus !== 'none' && staffCopy.account[accountStatus]) || staffCopy.account.none;
export const hasAppAccount = (accountStatus) => accountStatus === 'ACTIVE';

// The backend's offboarding reasons (OffboardingReason), with words for each.
export const OFFBOARDING_REASONS = Object.freeze(
  ['RESIGNED', 'CONTRACT_ENDED', 'DISMISSED', 'REDUNDANCY', 'RETIRED', 'DECEASED', 'OTHER']
    .map((value) => Object.freeze({ value, get label() { return staffCopy.offboardingReasons[value]; } })),
);
