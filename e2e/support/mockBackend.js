// An in-memory stand-in for the backend, for the `phone-mocked` Playwright project.
// Response shapes follow docs/AUTH_API_CONTRACT.md and the backend's
// FEED_INVENTORY_API_CHANGES.md. It only covers what the smoke journeys use;
// anything else is recorded in `unhandled` so a missing mock fails loudly.
import { MOCK_API_ORIGIN } from '../../playwright.config.js';

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

function createState() {
  return {
    user: null,
    items: [],
    recipes: {}, // recipe_type -> { shares: { [ingredient_id]: percent }, feeding_group, concentrate_kg_per_head_day }
    batches: [],
    nextId: 100,
    unhandled: [],
  };
}

// Mirrors the backend's PROTEIN_LIKELY_PERCENT check closely enough for the UI to show it.
function dataWarnings(item) {
  const protein = Number(item.protein_grams_per_kg);
  return protein > 0 && protein < 50
    ? [{ code: 'PROTEIN_LIKELY_PERCENT', field: 'protein_grams_per_kg', value: protein, suggested_value: protein * 10, message: `${item.name} has ${protein} g/kg crude protein, which is unusually low.` }]
    : [];
}

const serializeItem = (item) => ({ ...item, data_warnings: dataWarnings(item) });

function feedingToday(state) {
  const dairy = state.recipes.dairy_meal;
  const batch = state.batches.find((candidate) => candidate.recipe_type === 'dairy_meal' && candidate.remaining_kg > 0);
  const assigned = dairy?.feeding_group === 'lactating';
  // Backend order: no mix, no animals, no concentrate rate, no batch; ready only when none applies.
  const headcount = 2;
  const reason = !assigned ? 'NO_MIX'
    : !headcount ? 'NO_ANIMALS'
      : !dairy.concentrate_kg_per_head_day ? 'NO_CONCENTRATE_RATE'
        : !batch ? 'NO_ACTIVE_BATCH' : null;
  const daily = assigned ? Number(dairy.concentrate_kg_per_head_day || 0) * 2 : 0;
  return {
    date: '2026-11-03',
    groups: [{
      feeding_group: 'lactating', recipe_type: assigned ? 'dairy_meal' : null, headcount, mix_name: assigned ? 'Dairy Meal Mix' : null,
      quantity_label: assigned ? 'Concentrate' : 'Total daily feed need (dry matter, all feeds)', feeding_times_per_day: 2,
      daily_kg_per_head: daily / 2, kg_per_head_per_feeding: daily / 4, daily_group_batch_kg: daily, group_batch_per_feeding_kg: daily / 2,
      requires_concentrate_rate: assigned && !dairy.concentrate_kg_per_head_day, active_batch_id: batch?.batch_id ?? null,
      ready: reason === null, not_ready_reason: reason, not_ready_message: reason ? `Not ready: ${reason}` : null,
    }],
    active_batches: state.batches.filter((candidate) => candidate.remaining_kg > 0),
    totals: { total_active_animals: 2, total_daily_feed_kg: daily },
  };
}

function handle(state, method, path, body, params) {
  let match;
  const session = () => ({ ...state.user, access_token: 'e2e-token' });

  if (method === 'POST' && path === '/auth/register') {
    state.user = {
      id: 1, name: body.farm_name, username: body.phone_number, role: 'FARMER', tenant_type: 'single', tenant_id: 'tenant_1',
      farm_id: 'farm_1', farm_name: body.farm_name, available_farms: [], phone_number: `+${body.phone_number}`,
      email: body.email ?? null, auth_state: 'ACTIVE',
      account_flags: { needs_phone: false, phone_verified: false, email_verified: false, has_password: true, linked_providers: [] },
    };
    return [201, session()];
  }
  if (method === 'POST' && path === '/auth/login') return state.user ? [200, session()] : [401, { code: 'INVALID_CREDENTIALS', error: 'Invalid credentials' }];
  if (method === 'GET' && path === '/auth/me') return state.user ? [200, state.user] : [401, { msg: 'Missing JWT' }];
  if (method === 'POST' && path === '/auth/logout') return [200, {}];

  if (method === 'GET' && path === '/inventory/items') {
    const includeArchived = params.get('include_archived') === 'true';
    return [200, state.items.filter((item) => includeArchived || item.is_active).map(serializeItem)];
  }
  if (method === 'POST' && path === '/inventory/items') {
    const item = {
      id: state.nextId++, name: body.name, sku: body.sku ?? null, category: body.category, unit: body.unit,
      current_qty: Number(body.currentStock ?? 0), minimum_threshold: Number(body.reorderLevel ?? 0),
      protein_grams_per_kg: Number(body.protein_grams_per_kg ?? 0), energy_mj_per_kg: Number(body.energy_mj_per_kg ?? 0),
      fiber_grams_per_kg: Number(body.fiber_grams_per_kg ?? 0), cost_per_kg: Number(body.cost_per_kg ?? 0),
      allowed_mixers: 'dairy_meal,main_meal', is_active: true,
    };
    state.items.push(item);
    return [201, serializeItem(item)];
  }
  if ((match = path.match(/^\/inventory\/items\/(\d+)$/)) && method === 'PATCH') {
    const item = state.items.find((candidate) => candidate.id === Number(match[1]));
    if ('currentStock' in body && Number(body.currentStock) !== item.current_qty) {
      return [400, { code: 'STOCK_CHANGE_REQUIRES_MOVEMENT', error: 'Use a stock movement.' }];
    }
    Object.assign(item, { name: body.name ?? item.name, category: body.category ?? item.category });
    return [200, serializeItem(item)];
  }
  if (method === 'POST' && path === '/inventory/movements') {
    const item = state.items.find((candidate) => candidate.id === Number(body.item_id));
    const quantity = Number(body.quantity);
    const isIn = ['IN', 'RESTOCK'].includes(String(body.transaction_type).toUpperCase());
    if (!isIn && quantity > item.current_qty) return [400, { code: 'VALIDATION_ERROR', error: 'Not enough stock.' }];
    if (isIn && body.unit_cost !== undefined) {
      item.cost_per_kg = Number(((item.cost_per_kg * item.current_qty + body.unit_cost * quantity) / (item.current_qty + quantity)).toFixed(2));
    }
    item.current_qty = Number((item.current_qty + (isIn ? quantity : -quantity)).toFixed(3));
    const writeOff = ['SPOILAGE', 'SPILL', 'EXPIRED', 'DAMAGE', 'SHRINKAGE'].includes(body.transaction_type);
    return [201, { movement: { id: state.nextId++ }, updatedItem: serializeItem(item), ledgerEntryId: body.record_expense || writeOff ? state.nextId++ : null }];
  }
  if ((match = path.match(/^\/inventory\/items\/(\d+)\/audit$/)) && method === 'POST') {
    const item = state.items.find((candidate) => candidate.id === Number(match[1]));
    const adjustment = Number(body.physical_count) - item.current_qty;
    item.current_qty = Number(body.physical_count);
    return [200, Math.abs(adjustment) < 0.01 ? { status: 'matched', adjustment: 0 } : { status: 'reconciled', adjustment, new_balance: item.current_qty }];
  }

  if ((match = path.match(/^\/v1\/nutrition\/mixers\/(dairy_meal|main_meal)\/ingredients$/)) && method === 'GET') {
    const shares = state.recipes[match[1]]?.shares ?? {};
    return [200, state.items.filter((item) => item.is_active).map((item) => ({ ...serializeItem(item), ingredient_id: item.id, percentage: shares[item.id] ?? 0 }))];
  }
  if (method === 'POST' && path === '/v1/nutrition/recipes/auto-save') {
    state.recipes[body.recipe_type] = {
      shares: Object.fromEntries((body.adjusted_ingredients ?? []).map((ingredient) => [ingredient.ingredient_id, ingredient.percentage])),
      feeding_group: body.feeding_group ?? null,
      concentrate_kg_per_head_day: body.concentrate_kg_per_head_day ?? null,
    };
    return [201, { recipe_id: state.nextId++, recipe_name: body.recipe_name, status: 'ADOPTED' }];
  }
  if (method === 'POST' && path === '/v1/nutrition/recipes/calculate-nutrition') return [200, { average_protein_percent: 16, total_protein_grams: 1000, ingredients: [] }];
  if (method === 'GET' && path === '/v1/nutrition/feeding/today') return [200, feedingToday(state)];
  if (method === 'GET' && path === '/v1/nutrition/batches/suggested-size') {
    const assigned = Boolean(state.recipes[params.get('recipe_type')]);
    return [200, {
      recipe_type: params.get('recipe_type'), days: Number(params.get('days')), suggested_batch_kg: 20, reason: null,
      // null when no mix of this type is assigned (backend contract).
      recipe_id: assigned ? 1 : null, max_batch_kg: assigned ? 50 : null, limiting_ingredient: null,
    }];
  }
  if (method === 'GET' && path === '/v1/nutrition/analytics/feed-cost-efficiency') {
    return [200, { rows: state.batches.map((batch) => ({ batchId: batch.batch_id, batchName: batch.batch_name, mixedOn: batch.mixed_on, totalConsumedWeight: batch.total_weight_kg - batch.remaining_kg, rateBasis: 'recorded_events', ingredients: [] })) }];
  }
  if (method === 'GET' && path === '/v1/nutrition/analytics/active-batch-roi-trend-weekly') return [200, { rows: [] }];
  if (method === 'GET' && path === '/v1/nutrition/feeding-groups/profiles') return [200, { profiles: [] }];
  if (method === 'GET' && path === '/v1/nutrition/herd/feeding-plan/by-group') return [200, { groups: [], totals: {} }];
  if (method === 'GET' && path === '/feed/recipes') return [200, []];

  return null;
}

/**
 * Answers every request to the mock API origin for this page. Returns the state,
 * whose `unhandled` list names any request the journey made that isn't mocked.
 */
export async function installMockBackend(page) {
  const state = createState();
  await page.route(`${MOCK_API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    let body = {};
    try { body = request.postDataJSON() ?? {}; } catch { /* not JSON */ }
    const result = handle(state, request.method(), path, body, url.searchParams);
    if (result) return json(route, result[1], result[0]);
    state.unhandled.push(`${request.method()} ${path}`);
    // Harmless defaults keep secondary widgets quiet; the journey asserts on what it uses.
    return json(route, request.method() === 'GET' ? [] : {});
  });
  return state;
}
