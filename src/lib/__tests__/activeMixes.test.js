import { describe, expect, it } from 'vitest';
import { buildDraftFromBatch, selectActiveMixByType } from '../activeMixes';

const today = (overrides = {}) => ({
  groups: [{ feeding_group: 'lactating', recipe_type: 'dairy_meal', active_batch_id: 42 }],
  active_batches: [
    { batch_id: 41, batch_name: 'Older dairy', recipe_type: 'dairy_meal', mixed_on: '2026-08-20', total_weight_kg: 25, remaining_kg: 5, daily_feeding_rate_kg: 4.5, days_until_empty: 1.1 },
    { batch_id: 42, batch_name: 'Weekly dairy', recipe_type: 'dairy_meal', mixed_on: '2026-08-28', total_weight_kg: 50, remaining_kg: 1, daily_feeding_rate_kg: 2.882, days_until_empty: 0.3 },
    { batch_id: 43, batch_name: 'Boma mix', recipe_type: 'main_meal', mixed_on: '2026-08-27', total_weight_kg: 800, remaining_kg: 540, daily_feeding_rate_kg: 87.6, days_until_empty: 6.2 },
  ],
  ...overrides,
});
const rows = [{ batchId: 42, totalConsumedWeight: 49, rateBasis: 'recorded_events', ingredients: [{ ingredientId: 7, ingredientName: 'Maize germ', percentage: 100, protein_grams_per_kg: 100 }] }];

describe('selectActiveMixByType', () => {
  it('uses the batch the backend feeds each group from, with the backend’s numbers', () => {
    const mixes = selectActiveMixByType(today(), rows);
    expect(mixes.dairy_meal).toMatchObject({
      batchId: 42, name: 'Weekly dairy', totalWeight: 50, remainingWeight: 1, consumedWeight: 49, daysUntilEmpty: 0.3, dailyFeedingRate: 2.882,
    });
    expect(mixes.main_meal).toMatchObject({ batchId: 43, totalWeight: 800, remainingWeight: 540 });
  });

  it('falls back to the first batch of a type the backend lists when no group names one', () => {
    expect(selectActiveMixByType(today({ groups: [] }), rows).dairy_meal.batchId).toBe(41);
  });

  it('never guesses a type: a batch the backend doesn’t type is not shown', () => {
    const untyped = { active_batches: [{ batch_id: 9, batch_name: 'Dairy Feed Mix - 1/9/2026', total_weight_kg: 10, remaining_kg: 5 }] };
    expect(selectActiveMixByType(untyped, [])).toEqual({ dairy_meal: null, main_meal: null });
  });

  it('leaves values the backend didn’t send as unknown instead of working them out', () => {
    const mix = selectActiveMixByType(today(), []).main_meal;
    expect(mix.consumedWeight).toBeNull();
    expect(selectActiveMixByType({ active_batches: [{ batch_id: 1, batch_name: 'X', recipe_type: 'main_meal' }] }, []).main_meal)
      .toMatchObject({ totalWeight: null, remainingWeight: null, daysUntilEmpty: null });
  });
});

describe('buildDraftFromBatch', () => {
  it('opens the planner on the batch’s mix type with its shares', () => {
    const draft = buildDraftFromBatch(rows[0], 'dairy_meal', 'Weekly dairy');
    expect(draft).toMatchObject({ isImportedDraft: true, draftType: 'dairy_meal', draftName: 'Weekly dairy' });
    expect(draft.draftFormula[0]).toMatchObject({ ingredientId: 7, name: 'Maize germ', percentage: 100, proteinContent: 10 });
  });
});
