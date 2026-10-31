import { describe, expect, it } from 'vitest';
import { toQueuedMilkRows } from '../queuedMilkRows';

const entry = (overrides = {}) => ({
  id: 'q1',
  status: 'PENDING',
  createdAt: '2026-10-31T05:00:00.000Z',
  lastError: null,
  request: { method: 'POST', url: '/production/yield', data: { cow_id: 57, amount: 12.5, session: 'evening', milking_date: '2026-10-30' } },
  ...overrides,
});

describe('toQueuedMilkRows', () => {
  it('maps queued milk entries to rows with the cow resolved from the herd', () => {
    const [row] = toQueuedMilkRows([entry()], [{ id: 57, tag_number: 'KE-012', name: 'Neema' }]);

    expect(row).toMatchObject({
      id: 'q1',
      cow: { cowName: 'Neema', cowTag: 'KE-012' },
      date: '2026-10-30',
      session: 'evening',
      amount: '12.5',
      needsAttention: false,
    });
  });

  it('ignores queued writes that are not milk entries', () => {
    expect(toQueuedMilkRows([entry({ request: { method: 'POST', url: '/finance/ledger', data: {} } })])).toEqual([]);
    expect(toQueuedMilkRows([entry({ request: { method: 'DELETE', url: '/production/yield', data: null } })])).toEqual([]);
  });

  it('flags entries the server rejected, with the reason', () => {
    const [row] = toQueuedMilkRows([entry({ status: 'NEEDS_ATTENTION', lastError: { message: 'Cow not found.' } })]);
    expect(row).toMatchObject({ needsAttention: true, error: 'Cow not found.' });
  });
});
