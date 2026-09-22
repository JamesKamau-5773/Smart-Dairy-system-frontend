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

  it('preserves the canonical photo URL for editing', () => {
    const cow = normalizeHerdCow({ photoUrl: 'http://localhost:5000/uploads/animal_photos/cow.jpg' });

    expect(cow.photoUrl).toBe('http://localhost:5000/uploads/animal_photos/cow.jpg');
  });

  it('preserves an explicit photo removal instead of restoring the fallback URL', () => {
    const cow = normalizeHerdCow({ photoUrl: null }, { photoUrl: 'http://localhost:5000/uploads/old.jpg' });

    expect(cow.photoUrl).toBeNull();
  });
});