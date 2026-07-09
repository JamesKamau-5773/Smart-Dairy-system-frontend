import { describe, it, expect } from 'vitest';
import { deriveMilkSessionFromLoggedAt, filterMilkHistorySessions } from '../MilkHistory';

describe('milk history filters', () => {
  const sessions = [
    { date: '2026-06-09', session: 'Morning', milker: 'MWANGI', liters: 14.5, status: 'Verified' },
    { date: '2026-06-09', session: 'Evening', milker: 'A. KIPRUTO', liters: 11.2, status: 'Pending' },
    { date: '2026-06-08', session: 'Afternoon', milker: 'MWANGI', liters: 9.8, status: 'Flagged' },
  ];

  it('filters by search and dropdown values', () => {
    const result = filterMilkHistorySessions(sessions, {
      search: 'kipruto',
      date: '2026-06-09',
      status: 'pending',
      session: 'evening',
    });

    expect(result).toHaveLength(1);
    expect(result[0].milker).toBe('A. KIPRUTO');
  });

  it('returns all sessions when filters are empty', () => {
    const result = filterMilkHistorySessions(sessions, {
      search: '',
      date: '',
      status: 'all',
      session: 'all',
    });

    expect(result).toHaveLength(3);
  });

  it('derives morning for records logged before noon', () => {
    expect(deriveMilkSessionFromLoggedAt({ created_at: '2026-07-06T11:59:00Z' })).toBe('Morning');
  });

  it('derives afternoon for records logged between noon and 4:00 PM', () => {
    expect(deriveMilkSessionFromLoggedAt({ created_at: '2026-07-06T12:01:00Z' })).toBe('Afternoon');
    expect(deriveMilkSessionFromLoggedAt({ created_at: '2026-07-06T16:00:00Z' })).toBe('Afternoon');
  });

  it('derives evening for records logged after 4:00 PM', () => {
    expect(deriveMilkSessionFromLoggedAt({ created_at: '2026-07-06T16:01:00Z' })).toBe('Evening');
  });
});
