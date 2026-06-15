/**
 * Local fallback feed calculator.
 * This mirrors the server-side heuristic and acts as a safe estimate
 * when the API is not available.
 */
export function calculateFeedFallback({ target_liters = 0, baseline_herd_meal_kg = 4.0 } = {}) {
  const liters = parseFloat(target_liters) || 0;
  const baseline = parseFloat(baseline_herd_meal_kg) || 4.0;
  const total_meal = Math.max(0, (liters - 10) / 1.5);
  const topup = Math.max(0, total_meal - baseline);
  const sessions = 2;

  return {
    target_liters: liters,
    total_dairy_meal_kg: parseFloat(total_meal.toFixed(2)),
    base_herd_mix_kg: baseline,
    extra_milking_topup_total_kg: parseFloat(topup.toFixed(2)),
    per_milking_session_kg: parseFloat((topup / sessions).toFixed(2)),
    suggested_yard_feedings: total_meal > 8 ? 4 : (total_meal > 5 ? 3 : 2),
    parlor_milking_sessions: sessions,
    farmer_reasoning: 'Fallback estimate: safe default calculation used while offline.'
  };
}
