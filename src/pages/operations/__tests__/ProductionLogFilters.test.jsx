import { describe, it, expect } from 'vitest';
import { DEFAULT_MILK_ROWS, filterMilkRows } from '../productionLog';

describe('production log filters', () => {
  it('filters by date, cow id, amount and status', () => {
    const rows = filterMilkRows(DEFAULT_MILK_ROWS, {
      date: '2026-06-09',
      cowId: 'C-102',
      status: 'Verified',
      minAmount: '14',
      maxAmount: '15',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].cowId).toBe('C-102');
  });

  it('returns no rows when filters do not match', () => {
    const rows = filterMilkRows(DEFAULT_MILK_ROWS, {
      date: '2026-06-07',
      cowId: 'C-999',
      status: 'Pending',
      minAmount: '50',
      maxAmount: '60',
    });

    expect(rows).toHaveLength(0);
  });
});
