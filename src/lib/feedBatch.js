const toPositiveNumber = (value) => Math.max(0, Number.parseFloat(value) || 0);

export function normalizeBatchIngredient(ingredient = {}, batchSizeKg = 0) {
  const safeBatchSize = Math.max(0, Number(batchSizeKg) || 0);
  const percentage = toPositiveNumber(
    ingredient.percentage ?? ingredient.inclusion_percentage ?? ingredient.share ?? 0
  );
  const costPerKg = toPositiveNumber(
    ingredient.costPerKg ?? ingredient.cost_per_kg ?? ingredient.lockedCostPerKg ?? 0
  );
  const ingredientId = ingredient.ingredientId
    ?? ingredient.ingredient_id
    ?? ingredient.inventory_item_id
    ?? ingredient.id
    ?? null;

  return {
    ...ingredient,
    ingredientId,
    name: ingredient.name ?? ingredient.ingredient_name ?? 'Ingredient',
    percentage,
    costPerKg,
    weight: safeBatchSize > 0 ? (percentage / 100) * safeBatchSize : 0,
  };
}

export function calculateBatchTotals(ingredients, batchSizeKg) {
  const rows = (Array.isArray(ingredients) ? ingredients : [])
    .map((ingredient) => normalizeBatchIngredient(ingredient, batchSizeKg))
    .filter((ingredient) => ingredient.weight > 0);

  const totalWeight = Math.max(0, Number(batchSizeKg) || 0);
  const totalCost = rows.reduce((sum, ingredient) => sum + (ingredient.weight * ingredient.costPerKg), 0);

  return {
    rows,
    totalWeight,
    totalCost,
    costPerKg: totalWeight > 0 ? totalCost / totalWeight : 0,
  };
}

export function buildBatchPayload({
  batchName,
  formulaId = null,
  formulaName,
  isSavedAsTemplate = false,
  totalWeight,
  ingredients,
}) {
  const rows = Array.isArray(ingredients) ? ingredients : [];
  const resolvedTotalWeight = Math.max(
    0,
    Number(totalWeight) || rows.reduce((sum, ingredient) => sum + Number(ingredient.weight || 0), 0)
  );
  const totalCost = rows.reduce((sum, ingredient) => sum + (Number(ingredient.weight || 0) * Number(ingredient.costPerKg || 0)), 0);

  return {
    batchName,
    formulaId,
    formulaName,
    isSavedAsTemplate,
    totalWeight: resolvedTotalWeight,
    totalCost,
    costPerKg: resolvedTotalWeight > 0 ? totalCost / resolvedTotalWeight : 0,
    ingredients: rows.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      percentage: Number(ingredient.percentage) || 0,
      weight: Number(ingredient.weight) || 0,
      lockedCostPerKg: Number(ingredient.costPerKg) || 0,
    })),
  };
}