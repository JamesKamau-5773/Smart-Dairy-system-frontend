import { describe, it, expect } from 'vitest';
import { filterMilkRows } from '../productionLog';

const SAMPLE_MILK_ROWS = [
  {
    id: 'milk-1',
    date: '2026-06-09',
    time: '06:45 AM',
    milker: 'MWANGI',
    cowId: 'C-102',
    cowName: 'LUNA',
    amount: '14.5',
    status: 'Verified',
  },
  {
    id: 'milk-2',
    date: '2026-06-09',
    time: '11:30 AM',
    milker: 'A. KIPRUTO',
    cowId: 'C-214',
    cowName: 'NALA',
    amount: '11.2',
    status: 'Pending',
  },
  {
    id: 'milk-3',
    date: '2026-06-08',
    time: '05:50 PM',
    milker: 'MWANGI',
    cowId: 'C-311',
    cowName: 'ZURI',
    amount: '9.8',
    status: 'Flagged',
  },
];

describe('production log filters', () => {
  it('filters by date, cow id, amount and status', () => {
    const rows = filterMilkRows(SAMPLE_MILK_ROWS, {
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
    const rows = filterMilkRows(SAMPLE_MILK_ROWS, {
      date: '2026-06-07',
      cowId: 'C-999',
      status: 'Pending',
      minAmount: '50',
      maxAmount: '60',
    });

    expect(rows).toHaveLength(0);
  });
});
