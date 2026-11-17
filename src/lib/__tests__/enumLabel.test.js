import { describe, expect, it } from 'vitest';
import { enumLabel, humanizeEnum } from '../enumLabel';

describe('humanizeEnum', () => {
  it('turns backend values into sentence case', () => {
    expect(humanizeEnum('ON_HOLD')).toBe('On hold');
    expect(humanizeEnum('follow-up due')).toBe('Follow up due');
    expect(humanizeEnum('pending')).toBe('Pending');
    expect(humanizeEnum(null)).toBe('');
  });
});

describe('enumLabel', () => {
  it('prefers the copy string and falls back to the humanised value', () => {
    const labels = { pending: 'Inasubiri' };
    expect(enumLabel(labels, 'pending')).toBe('Inasubiri');
    expect(enumLabel(labels, 'PART_PAID')).toBe('Part paid');
    expect(enumLabel(labels, '')).toBe('');
  });
});
