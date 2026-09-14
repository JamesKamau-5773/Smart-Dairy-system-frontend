import { z } from 'zod';
import { logContractViolation } from './telemetry';

/**
 * API response contracts.
 *
 * Every "shows empty/wrong data" bug fixed recently (feed-cost-efficiency,
 * feed/recipes, roi-trend) had the same root cause: the frontend guessed at the
 * response shape and silently rendered undefined-derived UI. These schemas make
 * the expected shape explicit and validated at the boundary.
 *
 * Design: schemas are intentionally PERMISSIVE (`.passthrough()` / optional
 * fields, `.catch()` for collections) — the goal is to DETECT and LOG drift, not
 * to hard-fail a screen because the backend added/renamed one field. A violation
 * is reported to telemetry and the raw value is passed through so the UI still
 * renders best-effort instead of crashing.
 *
 * IMPORTANT — these are NOT authoritative. The repo's `docs/backend-endpoint-map.md`
 * and `backend-integration-contract.md` are known to be STALE / not updated to match
 * the live backend. These schemas were reverse-engineered from OBSERVED network
 * responses (captured live in-browser), so they describe "what the backend happened
 * to return at the time," not a guaranteed contract. Treat a `contract_violation`
 * telemetry event as a SIGNAL TO RECONCILE with the backend team, never as proof of
 * a bug in either side. Do not tighten these schemas to reject on mismatch — the
 * backend may legitimately change without notice while the docs remain out of date.
 */

const ingredientSchema = z.object({
  ingredientId: z.number().nullish(),
  ingredient_id: z.number().nullish(),
  ingredientName: z.string().nullish(),
  ingredient_name: z.string().nullish(),
  name: z.string().nullish(),
  percentage: z.number().nullish(),
  inclusion_percentage: z.number().nullish(),
  inclusionPercentage: z.number().nullish(),
  weight: z.number().nullish(),
  lockedCostPerKg: z.number().nullish(),
  proteinGramsPerKg: z.number().nullish(),
}).passthrough();

const feedCostEfficiencySchema = z.object({
  rows: z.array(z.object({
    batchId: z.number().nullish(),
    batchName: z.string().nullish(),
    mixedOn: z.string().nullish(),
    depletedOn: z.string().nullish(),
    costPerLiter: z.number().nullish(),
    proteinPercentage: z.number().nullish(),
    totalBatchCost: z.number().nullish(),
    totalMilkLiters: z.number().nullish(),
    consumedWeight: z.number().nullish(),
    remainingWeight: z.number().nullish(),
    dailyFeedingRateKg: z.number().nullish(),
    daysUntilEmpty: z.number().nullish(),
    rateBasis: z.string().nullish(),
    ingredients: z.array(ingredientSchema).nullish(),
    ingredient_breakdown: z.array(ingredientSchema).nullish(),
  }).passthrough()),
}).passthrough();

const recipeSchema = z.object({
  id: z.number().nullish(),
  name: z.string().nullish(),
  recipe_type: z.string().nullish(),
  target_protein_percentage: z.number().nullish(),
  ingredients: z.array(ingredientSchema).nullish(),
}).passthrough();

const roiTrendSchema = z.union([
  z.array(z.object({
    weekStart: z.string().nullish(),
    week_start: z.string().nullish(),
    feedCostPerLiter: z.number().nullish(),
    costPerLiter: z.number().nullish(),
    totalMilkLiters: z.number().nullish(),
  }).passthrough()),
  z.object({
    rows: z.array(z.object({
      weekStart: z.string().nullish(),
      feedCostPerLiter: z.number().nullish(),
      totalMilkLiters: z.number().nullish(),
    }).passthrough()),
  }).passthrough(),
]);

const herdCowSchema = z.object({
  id: z.union([z.number(), z.string()]).nullish(),
  tag_number: z.union([z.number(), z.string()]).nullish(),
  name: z.string().nullish(),
  current_status: z.string().nullish(),
}).passthrough();

/**
 * Registry of named contracts, keyed by a stable contract name.
 */
export const API_CONTRACTS = {
  FEED_COST_EFFICIENCY: feedCostEfficiencySchema,
  RECIPES: z.array(recipeSchema),
  ROI_TREND_WEEKLY: roiTrendSchema,
  HERD_LIST: z.array(herdCowSchema),
};

/**
 * Validate an API response against a named contract.
 *
 * On success: returns the parsed (structurally confirmed) data.
 * On violation: logs the drift to telemetry + console with the contract name and
 * the issues, and returns the RAW data so the UI degrades gracefully rather than
 * throwing. This is the early-warning system for backend/frontend drift.
 *
 * @param {z.ZodTypeAny} schema
 * @param {unknown} data
 * @param {string} contractName  e.g. 'FEED_COST_EFFICIENCY' — shows up in logs
 * @returns {unknown}
 */
export function validateResponse(schema, data, contractName = 'UNKNOWN') {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);

  // Console for local dev; telemetry for production visibility.
  console.warn(`[apiContract] "${contractName}" response drift detected`, {
    issues,
    sample: data === null ? 'null' : Array.isArray(data) ? `array(${data.length})` : typeof data,
  });
  logContractViolation({ contract: contractName, issues });

  return data;
}
