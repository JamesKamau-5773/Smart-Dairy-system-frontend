export const calculateRecipeMetrics = (ingredients, batchSizeKg) => {
  const safeBatchSize = Math.max(0, Number(batchSizeKg) || 0);

  // Always return the full schema, even if data is missing
  if (!ingredients || ingredients.length === 0) {
    return { averageProtein: 0, totalCost: 0, totalWeight: safeBatchSize, ingredients: [] };
  }

  const ingredientDetails = ingredients.map((ing) => {
    const percentage = Math.max(0, Number.parseFloat(ing.percentage) || 0);
    const proteinContent = Math.max(0, Number.parseFloat(ing.proteinContent) || 0);
    const pricePerKg = Math.max(0, Number.parseFloat(ing.pricePerKg) || 0);
    const weightKg = (percentage / 100) * safeBatchSize;
    const cost = weightKg * pricePerKg;

    return {
      ...ing,
      percentage,
      weightKg,
      cost,
      pricePerKg,
      proteinKg: weightKg * (proteinContent / 100),
    };
  });

  const totals = ingredientDetails.reduce((acc, ing) => {
    acc.protein += ing.proteinKg;
    acc.cost += ing.cost;
    return acc;
  }, { protein: 0, cost: 0 });

  return {
    averageProtein: safeBatchSize > 0 ? (totals.protein / safeBatchSize) * 100 : 0,
    totalCost: totals.cost,
    totalWeight: safeBatchSize,
    ingredients: ingredientDetails,
  };
};

export const validateRecipe = (metrics, batchSizeKg, targetProtein = 16, maxCostPerKg = 35) => {
  if (!metrics) return [];
  
  const alerts = [];
  const costPerKg = metrics.totalCost / (batchSizeKg || 1);

  if (metrics.averageProtein < targetProtein) {
    alerts.push({
      type: 'warning',
      message: `Low Protein (${metrics.averageProtein.toFixed(1)}%). Target is ${targetProtein}%.`
    });
  }

  if (costPerKg > maxCostPerKg) {
    alerts.push({
      type: 'danger',
      message: `High Cost (KES ${costPerKg.toFixed(2)}/kg). Max budget is KES ${maxCostPerKg}/kg.`
    });
  }

  return alerts;
};
