import { describe, expect, it } from 'vitest';
import { normalizeNutritionRequestPayload } from '../feedUtils';

const recipe = {
  recipe_name: 'Main Feed Mix',
  recipe_type: 'main_meal',
  batch_size_kg: 2000,
  target_protein_percent: 10,
  ingredients: [
    { ingredient_id: 27, inclusion_percentage: 25 },
    { ingredient_id: 18, percentage: 75 },
  ],
};

describe('normalizeNutritionRequestPayload', () => {
  it('uses ingredients for formulation and calculation requests', () => {
    expect(normalizeNutritionRequestPayload(recipe)).toMatchObject({
      ingredients: [
        { ingredient_id: 27, percentage: 25 },
        { ingredient_id: 18, percentage: 75 },
      ],
    });
    expect(normalizeNutritionRequestPayload(recipe)).not.toHaveProperty('adjusted_ingredients');
  });

  it('uses adjusted_ingredients only when requested by auto-save', () => {
    const payload = normalizeNutritionRequestPayload(recipe, 'adjusted_ingredients');

    expect(payload).toHaveProperty('adjusted_ingredients');
    expect(payload).not.toHaveProperty('ingredients');
  });

  it('preserves ingredient IDs with zero shares for automatic formulation', () => {
    const payload = normalizeNutritionRequestPayload(recipe, 'ingredients', {
      forceZeroPercentages: true,
    });

    expect(payload.ingredients).toEqual([
      { ingredient_id: 27, percentage: 0 },
      { ingredient_id: 18, percentage: 0 },
    ]);
  });

  it('preserves dairy-meal recipe type and feeding group', () => {
    const payload = normalizeNutritionRequestPayload({
      ...recipe,
      recipe_type: 'dairy_meal',
      feeding_group: 'lactating',
    }, 'ingredients', { forceZeroPercentages: true });

    expect(payload.recipe_type).toBe('dairy_meal');
    expect(payload.feeding_group).toBe('lactating');
  });
});
