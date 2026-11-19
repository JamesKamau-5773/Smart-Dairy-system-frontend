import { describe, expect, it } from 'vitest';
import { NO_AI_DATE_GROUP, groupHistoryByMonth, historyMonthLabel } from '../breedingHistory';

describe('breedingHistory', () => {
  it('groups by AI service month in the order given, undated records together', () => {
    const groups = groupHistoryByMonth([
      { id: 1, aiDate: '2026-01-22' },
      { id: 2, aiDate: '2026-01-03' },
      { id: 3, aiDate: '2025-12-05' },
      { id: 4, aiDate: '' },
    ]);

    expect([...groups.keys()]).toEqual(['2026-01', '2025-12', NO_AI_DATE_GROUP]);
    expect(groups.get('2026-01').map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('labels months in the app date format, and records without an AI date as an unknown month', () => {
    expect(historyMonthLabel('2026-01')).toBe('January 2026');
    expect(historyMonthLabel(NO_AI_DATE_GROUP)).toBe('Unknown month');
  });
});
