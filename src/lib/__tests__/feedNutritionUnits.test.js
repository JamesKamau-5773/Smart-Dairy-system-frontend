import { describe, expect, it } from 'vitest';
import { proteinGramsPerKgToInput, proteinInputToGramsPerKg } from '../feedNutritionUnits';

describe('feed protein units', () => {
  it('stores an entered crude protein percentage as grams per kilogram', () => {
    expect(proteinInputToGramsPerKg(18, 'percent')).toBe(180);
    expect(proteinInputToGramsPerKg(30, 'percent')).toBe(300);
  });

  it('converts stored grams per kilogram back to percentage for editing', () => {
    expect(proteinGramsPerKgToInput(180, 'percent')).toBe(18);
    expect(proteinGramsPerKgToInput(300, 'percent')).toBe(30);
  });

  it('preserves values entered directly in grams per kilogram', () => {
    expect(proteinInputToGramsPerKg(180, 'g_per_kg')).toBe(180);
    expect(proteinGramsPerKgToInput(180, 'g_per_kg')).toBe(180);
  });
});
