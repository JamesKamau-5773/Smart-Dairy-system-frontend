import { describe, expect, it } from 'vitest';
import { compactSearchText, editDistance, getSearchSuggestions, matchesSearch } from '../fuzzySearch';

describe('fuzzy search helpers', () => {
  it('compares text without spaces, dashes or case', () => {
    expect(compactSearchText('KE-012 ')).toBe('ke012');
    expect(matchesSearch(['0712 345 678'], '0712345678')).toBe(true);
    expect(matchesSearch(['Mama Njeri Hotel'], 'njeri')).toBe(true);
    expect(matchesSearch(['Mama Njeri Hotel'], 'kiosk')).toBe(false);
  });

  it('counts typos', () => {
    expect(editDistance('neema', 'nema')).toBe(1);
    expect(editDistance('baraka', 'barka')).toBe(1);
    expect(editDistance('abc', 'abc')).toBe(0);
  });

  it('suggests close matches by name or word, closest first', () => {
    const buyers = [{ id: 1, name: 'Mama Njeri Hotel' }, { id: 2, name: 'Kisii Dairy' }, { id: 3, name: 'Njoro Cooperative' }];
    const pick = (term) => getSearchSuggestions(buyers, term, (buyer) => [buyer.name]).map((buyer) => buyer.id);

    expect(pick('Njeru')).toEqual([1]);
    expect(pick('Kisi')).toEqual([2]);
    expect(pick('Eldoret')).toEqual([]);
  });
});
