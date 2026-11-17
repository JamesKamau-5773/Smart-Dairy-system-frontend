import { afterEach, describe, expect, it } from 'vitest';
import { plural, pluralCategory, setLocale } from '../locale';
import { breedingCopy as breedingEn } from '../breeding.en';
import { breedingCopy as breedingSw } from '../breeding.sw';
import { herdCopy as herdEn } from '../herd.en';

afterEach(() => setLocale('en'));

describe('plural', () => {
  it('picks the CLDR form for the count, in English and Kiswahili', () => {
    expect(pluralCategory(1, 'en')).toBe('one');
    expect(pluralCategory(2, 'en')).toBe('other');
    expect(pluralCategory(0, 'en')).toBe('other');
    expect(pluralCategory(1, 'sw')).toBe('one');
    expect(pluralCategory(5, 'sw')).toBe('other');
  });

  it('keeps a formatted count as given and reads an unknown one as "other"', () => {
    const forms = { one: '{n} cow', other: '{n} cows' };
    expect(plural('1,234', forms)).toBe('1,234 cows');
    expect(plural('—', forms)).toBe('— cows');
    expect(plural(1, forms)).toBe('1 cow');
  });

  it('writes the pending checks chip with the right forms', () => {
    expect(breedingEn.hub.pendingChecks(1, 0)).toBe('1 check pending · 0 due');
    expect(breedingEn.hub.pendingChecks(3, 1)).toBe('3 checks pending · 1 due');
    expect(breedingSw.hub.pendingChecks(1, 1)).toBe('Kipimo 1 kinasubiri · 1 kimefika');
    expect(breedingSw.hub.pendingChecks(3, 2)).toBe('Vipimo 3 vinasubiri · 2 vimefika');
    expect(herdEn.registry.cowCount(1)).toBe('1 cow');
    expect(herdEn.registry.showing(1, 1)).toBe('Showing 1 of 1 animal.');
  });
});
