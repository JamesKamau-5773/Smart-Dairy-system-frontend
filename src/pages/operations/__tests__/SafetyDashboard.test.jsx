import { describe, expect, it } from 'vitest';
import { formatLockExpiry, normalizeHardlock } from '../SafetyDashboard';

describe('Safety Dashboard data handling', () => {
  it('normalizes backend field aliases and severity', () => {
    expect(normalizeHardlock({
      hardlock_id: 7,
      cowName: 'Joyce',
      animalId: '002',
      status: 'critical',
      expiresAt: '2026-08-30T00:00:00Z',
    })).toMatchObject({
      id: 7,
      cowName: 'Joyce',
      cowId: '002',
      severity: 'CRITICAL',
      lockExpires: '2026-08-30T00:00:00Z',
    });
  });

  it('returns a safe label for missing or invalid expiry dates', () => {
    expect(formatLockExpiry(null)).toBe('Not available');
    expect(formatLockExpiry('not-a-date')).toBe('Not available');
  });
});
