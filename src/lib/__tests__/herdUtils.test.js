import { describe, expect, it } from 'vitest';
import { getFilteredHerd, getHerdSearchSuggestions, normalizeEarTag, normalizeHerdCow } from '../herdUtils';

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
describe('typo-tolerant herd search', () => {
  const herd = [
    { id: 'KE-012', recordId: '1', name: 'Neema Wanjiru', breed: 'Friesian', status: 'Milking' },
    { id: 'KE-045', recordId: '2', name: 'Baraka', breed: 'Ayrshire', status: 'Dry' },
    { id: 'KE-101', recordId: '3', name: 'Zawadi', breed: 'Jersey', status: 'Milking' },
  ];

  it('matches ear tags regardless of dashes, spaces and case', () => {
    expect(getFilteredHerd(herd, 'All', 'ke012').map((cow) => cow.id)).toEqual(['KE-012']);
    expect(getFilteredHerd(herd, 'All', 'KE 045').map((cow) => cow.id)).toEqual(['KE-045']);
  });

  it('suggests the closest cows for a misspelt name or tag', () => {
    expect(getHerdSearchSuggestions(herd, 'Nema').map((cow) => cow.name)).toEqual(['Neema Wanjiru']);
    expect(getHerdSearchSuggestions(herd, 'Barka').map((cow) => cow.name)).toEqual(['Baraka']);
    expect(getHerdSearchSuggestions(herd, 'KE-102').map((cow) => cow.id)).toContain('KE-101');
  });

  it('does not suggest unrelated cows', () => {
    expect(getHerdSearchSuggestions(herd, 'Princess')).toEqual([]);
    expect(getHerdSearchSuggestions(herd, 'a')).toEqual([]);
  });
});
