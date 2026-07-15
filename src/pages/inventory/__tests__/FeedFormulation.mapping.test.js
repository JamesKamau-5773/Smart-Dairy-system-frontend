import { describe, expect, it } from 'vitest';
import { mapInventoryItemToRecipeIngredient } from '../FeedFormulation';

describe('mapInventoryItemToRecipeIngredient', () => {
  it('uses backend provided percentage when available', () => {
    const mapped = mapInventoryItemToRecipeIngredient({
      id: 11,
      name: 'silage',
      inclusion_percentage: 37.5,
      currentStock: 500,
      unit: 'kg',
    });

    expect(mapped.percentage).toBe(37.5);
    expect(mapped.availableStock).toBe(500);
  });

  it('does not derive percentage from stock when backend percentage is missing', () => {
    const mapped = mapInventoryItemToRecipeIngredient({
      id: 12,
      name: 'hay',
      currentStock: 100,
      unit: 'kg',
    });

    expect(mapped.percentage).toBe(0);
    expect(mapped.availableStock).toBe(100);
  });

  it('clamps invalid backend percentages to zero', () => {
    const mapped = mapInventoryItemToRecipeIngredient({
      id: 13,
      name: 'napier grass',
      percentage: -25,
      currentStock: 70,
      unit: 'kg',
    });

    expect(mapped.percentage).toBe(0);
  });
});
