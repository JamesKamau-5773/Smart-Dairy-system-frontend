import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AnimalAge from '../AnimalAge';
import { formatAge, normalizeHerdCow, readAgeMonths } from '../../../lib/herdUtils';
import { normalizeAnimal } from '../../../lib/animalUtils';

afterEach(cleanup);

describe('animal age', () => {
  it('reads the age the backend sent under any of its names, and null when it sent none', () => {
    expect(readAgeMonths({ age_in_months: 46 })).toBe(46);
    expect(readAgeMonths({ ageMonths: 0 })).toBe(0);
    expect(readAgeMonths({ age_months: null })).toBeNull();
    expect(readAgeMonths({})).toBeNull();
  });

  it('keeps an unknown age unknown in the herd list and the cow record (never 0)', () => {
    expect(normalizeHerdCow({ tag_number: 'KE-1', age_in_months: null }).ageMonths).toBeNull();
    expect(normalizeHerdCow({ tag_number: 'KE-1', age_in_months: 46 }).ageMonths).toBe(46);
    expect(normalizeAnimal({ id: 1, ageMonths: null }).ageMonths).toBeNull();
  });

  it('shows a known age, and a dash with "Age not recorded" for screen readers when unknown', () => {
    expect(formatAge(46)).toBe('3y 10m');
    expect(render(<AnimalAge months={46} />).container.textContent).toBe('3y 10m');
    cleanup();
    const { container, getByText } = render(<AnimalAge months={null} />);
    expect(container.querySelector('[aria-hidden="true"]').textContent).toBe('—');
    expect(getByText('Age not recorded').className).toContain('sr-only');
    expect(container.textContent).not.toContain('0y');
  });
});
