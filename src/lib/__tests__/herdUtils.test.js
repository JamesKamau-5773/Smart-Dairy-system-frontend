import { describe, expect, it } from 'vitest';
import { normalizeEarTag, normalizeHerdCow } from '../herdUtils';

describe('normalizeHerdCow', () => {
  it('normalizes casing and whitespace without changing the user identifier', () => {
    expect(normalizeEarTag(' s-009 ')).toBe('S-009');
  });

  it('preserves parent fields for an unrelated edit', () => {
    const cow = normalizeHerdCow({
      id: 53,
      sire: { name: 'o11ho15935' },
      dam: { id: 41, name: 'Princess', tag_number: '001' },
      birth_weight_kg: 32.5,
    });

    expect(cow.sire_name).toBe('o11ho15935');
    expect(cow.dam_id).toBe('41');
    expect(cow.birth_weight_kg).toBe('32.5');
  });
});