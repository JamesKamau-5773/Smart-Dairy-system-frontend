export const calculateRecipeMetrics = (ingredients, batchSizeKg) => {
  // Always return the full schema, even if data is missing
  if (!ingredients || ingredients.length === 0) {
    return { averageProtein: 0, totalCost: 0, totalWeight: batchSizeKg || 0 };
  }

  const totals = ingredients.reduce((acc, ing) => {
    const amount = (parseFloat(ing.percentage) / 100) * batchSizeKg;
    acc.protein += amount * (parseFloat(ing.proteinContent) / 100);
    acc.cost += amount * parseFloat(ing.pricePerKg);
    return acc;
  }, { protein: 0, cost: 0 });

  return {
    averageProtein: (totals.protein / batchSizeKg) * 100,
    totalCost: totals.cost,
    totalWeight: batchSizeKg 
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