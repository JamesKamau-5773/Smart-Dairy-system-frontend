/**
 * @file Feed and Nutrition related utility functions.
 * This file centralizes helpers for feed planning, formulation, and API payload normalization.
 */

/**
 * Normalizes the recipe from the FeedFormulation component state into a
 * payload suitable for the backend API.
 * @param {object} recipeData - The recipe data from the form.
 * @param {'ingredients'|'adjusted_ingredients'} ingredientKey - The ingredient
 * key required by the target endpoint.
 * @param {object} options - Endpoint-specific normalization options.
 * @param {boolean} options.forceZeroPercentages - Send all selected ingredients
 * with a zero share to request backend automatic seeding.
 * @returns {object|null} The normalized payload for the API.
 */
export function normalizeNutritionRequestPayload(
  recipeData,
  ingredientKey = 'ingredients',
  { forceZeroPercentages = false } = {}
) {
  if (!recipeData) {
    return null;
  }

  // Preserve zero-share ingredients when the endpoint will formulate the mix.
  const sourceIngredients = recipeData.ingredients || recipeData.adjusted_ingredients || [];
  const activeIngredients = sourceIngredients.filter((ing) =>
    forceZeroPercentages || Number(ing.percentage ?? ing.share ?? ing.inclusion_percentage ?? 0) > 0
  );

  // 2. Normalize percentages to ensure they sum to 100, preventing validation errors.
  const totalPercentage = activeIngredients.reduce(
    (sum, ing) => sum + Number(ing.percentage ?? ing.share ?? ing.inclusion_percentage ?? 0),
    0
  );
  const needsNormalization = Math.abs(totalPercentage - 100) > 0.01 && totalPercentage > 0;

  // Map the endpoint-specific ingredient key after applying a common shape.
  const ingredients = activeIngredients.map(ing => {
    let shareValue = forceZeroPercentages
      ? 0
      : Number(ing.percentage ?? ing.share ?? ing.inclusion_percentage ?? 0);
    if (needsNormalization) {
      shareValue = (shareValue / totalPercentage) * 100;
    }

    const finalPercentage = Math.round(shareValue * 100) / 100;
    const itemId = ing.ingredient_id ?? ing.inventory_item_id ?? ing.id;

    return {
      ingredient_id: itemId,
      percentage: finalPercentage,
    };
  });

  return {
    recipe_name: recipeData.recipe_name || recipeData.name || `${recipeData.recipe_type === 'main_meal' ? 'Main' : 'Dairy'} Feed Mix`,
    batch_size_kg: Number(recipeData.batch_size_kg || recipeData.totalWeight || 0),
    target_protein_percent: Number(recipeData.target_protein_percent || recipeData.targetProtein || 0),
    [ingredientKey]: ingredients,
    // Optional: Include if your form has it, otherwise default to null
    yield_target_id: recipeData.yield_target_id || null,
  };
}
