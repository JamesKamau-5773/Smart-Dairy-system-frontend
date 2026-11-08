// The batch being fed now for each mix type, as the backend reports it.
// The backend is the source of truth: which batches are in store, their type,
// weights and days left all come from `GET /nutrition/feeding/today`
// (`active_batches`). The feed-cost-efficiency rows only add what they alone
// carry (kg fed so far, pace basis, ingredient shares). Nothing is inferred here.

export const MIX_TYPES = Object.freeze(['dairy_meal', 'main_meal']);

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const ingredientsOf = (row) => {
  if (Array.isArray(row?.ingredients)) return row.ingredients;
  return Array.isArray(row?.ingredient_breakdown) ? row.ingredient_breakdown : [];
};

/** The card's view of one backend batch, with its efficiency row when there is one. */
export function toMixSummary(batch, row) {
  return {
    batchId: batch.batch_id,
    name: batch.batch_name,
    mixedOn: batch.mixed_on ?? null,
    totalWeight: numberOrNull(batch.total_weight_kg),
    remainingWeight: numberOrNull(batch.remaining_kg),
    consumedWeight: numberOrNull(row?.totalConsumedWeight ?? row?.consumedWeight),
    dailyFeedingRate: numberOrNull(batch.daily_feeding_rate_kg),
    daysUntilEmpty: numberOrNull(batch.days_until_empty),
    rateBasis: row?.rateBasis ?? null,
    row: row ?? null,
  };
}

/**
 * `{ dairy_meal, main_meal }`: for each type, the batch a feeding group of that
 * type is fed from (the backend's `groups[].active_batch_id`), otherwise the
 * first batch of that type the backend lists as in store; null when there is none.
 */
export function selectActiveMixByType(today, efficiencyRows) {
  const batches = Array.isArray(today?.active_batches) ? today.active_batches : [];
  const groups = Array.isArray(today?.groups) ? today.groups : [];
  const rows = Array.isArray(efficiencyRows) ? efficiencyRows : [];
  const rowFor = (batchId) => rows.find((row) => row.batchId === batchId);

  return Object.fromEntries(MIX_TYPES.map((type) => {
    const ofType = batches.filter((batch) => batch.recipe_type === type);
    const fedFrom = groups.find((group) => group.recipe_type === type && ofType.some((batch) => batch.batch_id === group.active_batch_id));
    const batch = (fedFrom && ofType.find((candidate) => candidate.batch_id === fedFrom.active_batch_id)) ?? ofType[0];
    return [type, batch ? toMixSummary(batch, rowFor(batch.batch_id)) : null];
  }));
}

/** Router state that opens the mixing planner with this batch's shares as a draft. */
export function buildDraftFromBatch(row, recipeType, name) {
  return {
    isImportedDraft: true,
    draftType: recipeType,
    draftName: name ?? row?.batchName ?? 'Current Mix',
    draftFormula: ingredientsOf(row).map((ingredient) => {
      const id = ingredient.ingredientId ?? ingredient.ingredient_id ?? null;
      return {
        id: String(id ?? ingredient.ingredientName ?? ingredient.name),
        ingredientId: id,
        ingredient_id: id,
        inventory_item_id: id,
        name: ingredient.ingredientName ?? ingredient.ingredient_name ?? ingredient.name ?? 'Ingredient',
        percentage: numberOrNull(ingredient.percentage ?? ingredient.inclusion_percentage) ?? 0,
        proteinContent: (numberOrNull(ingredient.proteinGramsPerKg ?? ingredient.protein_grams_per_kg) ?? 0) / 10,
        pricePerKg: numberOrNull(ingredient.lockedCostPerKg ?? ingredient.locked_cost_per_kg) ?? 0,
      };
    }),
  };
}
