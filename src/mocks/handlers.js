import { http, HttpResponse, delay } from 'msw';
import { getBuyerBillingList, getBuyerBillingProfile } from '../lib/billingData';

const BASE = '/api';
const loggedMilkEntries = new Map();
const milkEntriesById = new Map();
const idempotencyResponses = new Map();

const normalizeMilkDate = (body) => body?.date || body?.milkingDate || new Date().toISOString().slice(0, 10);

const buildMilkNaturalKey = (body) => {
  const cowId = body?.cowId || '';
  const session = body?.session || 'morning';
  const milkDate = normalizeMilkDate(body);
  return `${cowId}:${milkDate}:${session}`;
};

const milkHistoryByCow = {
  'C-101': {
    name: 'Bessie',
    breed: 'Friesian',
    average: '11.9 L/day',
    peak: '16.2 L/day',
    lastYield: '12.4 L',
    sessions: [
      { date: '2026-06-09', session: 'Morning', liters: 12.4, milker: 'Peter', status: 'Verified' },
      { date: '2026-06-08', session: 'Evening', liters: 11.8, milker: 'Asha', status: 'Verified' },
      { date: '2026-06-08', session: 'Morning', liters: 12.2, milker: 'Peter', status: 'Verified' },
    ],
  },
  'C-102': {
    name: 'Luna',
    breed: '75% Friesian (Graded Up)',
    average: '13.8 L/day',
    peak: '18.4 L/day',
    lastYield: '14.5 L',
    sessions: [
      { date: '2026-06-09', session: 'Morning', liters: 14.5, milker: 'Mwangi', status: 'Verified' },
      { date: '2026-06-08', session: 'Evening', liters: 13.2, milker: 'Asha', status: 'Verified' },
      { date: '2026-06-08', session: 'Morning', liters: 15.1, milker: 'Mwangi', status: 'Verified' },
      { date: '2026-06-07', session: 'Evening', liters: 12.8, milker: 'Peter', status: 'Verified' },
      { date: '2026-06-07', session: 'Morning', liters: 14.9, milker: 'Mwangi', status: 'Verified' },
    ],
  },
  'C-103': {
    name: 'Nia',
    breed: 'Ayrshire Cross',
    average: '9.6 L/day',
    peak: '14.1 L/day',
    lastYield: '9.9 L',
    sessions: [
      { date: '2026-06-09', session: 'Morning', liters: 9.9, milker: 'Asha', status: 'Verified' },
      { date: '2026-06-08', session: 'Evening', liters: 9.3, milker: 'Peter', status: 'Verified' },
      { date: '2026-06-08', session: 'Morning', liters: 9.8, milker: 'Asha', status: 'Verified' },
    ],
  },
};

const handleMilkSave = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const idempotencyKey = request.headers.get('Idempotency-Key');
  await delay(200);

  const naturalKey = buildMilkNaturalKey(body);

  // Replay-safe idempotency behavior: same key returns original success.
  if (idempotencyKey && idempotencyResponses.has(idempotencyKey)) {
    return HttpResponse.json(idempotencyResponses.get(idempotencyKey), { status: 200 });
  }

  // Payload-level idempotency: same cow + date + session should behave like a duplicate submission.
  if (loggedMilkEntries.has(naturalKey)) {
    const existing = loggedMilkEntries.get(naturalKey);
    const replayPayload = {
      success: true,
      received: existing,
      replayed: true,
      naturalKey,
    };

    if (idempotencyKey) {
      idempotencyResponses.set(idempotencyKey, replayPayload);
    }

    return HttpResponse.json(replayPayload, { status: 200 });
  }

  const cowId = body?.cowId;
  const session = body?.session || 'morning';
  const milkingDate = normalizeMilkDate(body);

  const saved = {
    id: `milk_${Date.now()}`,
    cowId,
    session,
    milkingDate,
    date: milkingDate,
    volume: body?.volume,
    createdAt: new Date().toISOString(),
    naturalKey,
  };

  loggedMilkEntries.set(naturalKey, saved);
  milkEntriesById.set(saved.id, saved);

  const responsePayload = { success: true, received: saved };
  if (idempotencyKey) {
    idempotencyResponses.set(idempotencyKey, responsePayload);
  }

  return HttpResponse.json(responsePayload, { status: 200 });
};

const handleMilkUpdate = async ({ params, request }) => {
  const body = await request.json().catch(() => ({}));
  const existing = milkEntriesById.get(params.entryId);
  await delay(180);

  if (!existing) {
    return HttpResponse.json({ error: 'Milk record not found' }, { status: 404 });
  }

  const updated = {
    ...existing,
    cowId: body?.cowId ?? existing.cowId,
    session: body?.session ?? existing.session,
    milkingDate: body?.milkingDate ?? existing.milkingDate,
    date: body?.milkingDate ?? existing.date,
    volume: body?.volume ?? existing.volume,
    updatedAt: new Date().toISOString(),
  };

  if (existing.naturalKey) {
    loggedMilkEntries.delete(existing.naturalKey);
  }

  updated.naturalKey = buildMilkNaturalKey(updated);
  loggedMilkEntries.set(updated.naturalKey, updated);
  milkEntriesById.set(updated.id, updated);

  return HttpResponse.json({ success: true, received: updated, updated }, { status: 200 });
};

const handleMilkDelete = async ({ params }) => {
  const existing = milkEntriesById.get(params.entryId);
  await delay(120);

  if (!existing) {
    return HttpResponse.json({ error: 'Milk record not found' }, { status: 404 });
  }

  milkEntriesById.delete(params.entryId);
  if (existing.naturalKey) {
    loggedMilkEntries.delete(existing.naturalKey);
  }

  return HttpResponse.json({ success: true, deleted: existing }, { status: 200 });
};

export const handlers = [
  // ─────────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION & MULTI-TENANCY
  // ─────────────────────────────────────────────────────────────────
  
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const identifier = body.identifier || '0712345678';
    
    await delay(600);

    let userPayload;

    if (identifier === '0787654321') {
      userPayload = {
        id: 'usr_992',
        name: 'Sarah Cooperative',
        role: 'FARMER',
        tenant_id: 'tnt_coop_01',
        tenant_type: 'cooperative',
        farm_id: 'frm_coop_north',
        farm_name: 'Coop North Farm',
        available_farms: [
          { id: 'frm_coop_north', name: 'Coop North Farm' },
          { id: 'frm_coop_south', name: 'Coop South Farm' },
          { id: 'frm_coop_east', name: 'Coop East Farm' }
        ],
        token: 'mock_jwt_coop_777'
      };
    } else {
      userPayload = {
        id: 'usr_991',
        name: 'James Mwangi',
        role: 'FARMER',
        tenant_id: 'tnt_riftvalley_01',
        tenant_type: 'single',
        farm_id: 'frm_rvd_main',
        farm_name: 'Rift Valley Dairies',
        available_farms: [
          { id: 'frm_rvd_main', name: 'Rift Valley Dairies' }
        ],
        token: 'mock_jwt_single_123'
      };
    }

    return HttpResponse.json({
      message: 'Login successful',
      user: userPayload
    }, { status: 200 });
  }),

  http.post(`${BASE}/auth/logout`, async () => {
    await delay(300);
    return HttpResponse.json({ message: 'Logged out' }, { status: 200 });
  }),

  http.post(`${BASE}/auth/switch-farm`, async ({ request }) => {
    const { farm_id } = await request.json();
    await delay(800);

    const farmNames = {
      'frm_coop_north': 'Coop North Farm',
      'frm_coop_south': 'Coop South Farm',
      'frm_coop_east': 'Coop East Farm'
    };

    return HttpResponse.json({
      message: 'Farm switched successfully',
      token: `mock_jwt_switched_${farm_id}_${Date.now()}`,
      user: {
        farm_id: farm_id,
        farm_name: farmNames[farm_id] || 'Unknown Farm'
      }
    }, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────
  // 2. PRODUCTION & YIELD LOGIC
  // ─────────────────────────────────────────────────────────────────

  http.get(`${BASE}/production/summary`, async () => {
    return HttpResponse.json({
      total_liters_today: 452.5,
      cows_milked: 38,
      average_yield_per_cow: 11.9,
      variance_from_yesterday: '+2.4%'
    }, { status: 200 });
  }),

  http.post(`${BASE}/production/yield`, handleMilkSave),
  http.post('http://localhost:5173/api/production/yield', handleMilkSave),
  http.patch(`${BASE}/production/yield/:entryId`, handleMilkUpdate),
  http.delete(`${BASE}/production/yield/:entryId`, handleMilkDelete),
  http.patch('http://localhost:5173/api/production/yield/:entryId', handleMilkUpdate),
  http.delete('http://localhost:5173/api/production/yield/:entryId', handleMilkDelete),

  http.post(`${BASE}/v1/feed/calculate-schedule`, async ({ request }) => {
    const { target_liters, baseline_herd_meal_kg } = await request.json();
    
    const liters = parseFloat(target_liters) || 0;
    const baseline = parseFloat(baseline_herd_meal_kg) || 4.0;
    const total_meal = Math.max(0, (liters - 10) / 1.5);
    const topup = Math.max(0, total_meal - baseline);
    const sessions = 2;

    return HttpResponse.json({
      target_liters: liters,
      total_dairy_meal_kg: parseFloat(total_meal.toFixed(2)),
      base_herd_mix_kg: baseline,
      extra_milking_topup_total_kg: parseFloat(topup.toFixed(2)),
      per_milking_session_kg: parseFloat((topup / sessions).toFixed(2)),
      suggested_yard_feedings: total_meal > 8 ? 4 : (total_meal > 5 ? 3 : 2),
      parlor_milking_sessions: sessions,
      farmer_reasoning: "Mocked: Food During Milking and Main Feeding Times are set for the requested yield."
    }, { status: 200 });
  }),

  http.get(`${BASE}/production/yield/rolling-average`, async () => {
    return HttpResponse.json([
      { day: 'Mon', yield: 410 },
      { day: 'Tue', yield: 425 },
      { day: 'Wed', yield: 415 },
      { day: 'Thu', yield: 430 },
      { day: 'Fri', yield: 450 },
      { day: 'Sat', yield: 445 },
      { day: 'Sun', yield: 452.5 }
    ], { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────
  // 3. FINANCIAL ENGINE
  // ─────────────────────────────────────────────────────────────────

  http.get(`${BASE}/finance/unit-cost`, async () => {
    return HttpResponse.json({
      cost_per_liter: 38.50,
      market_price: 50.00,
      margin: 11.50,
      currency: 'KES'
    }, { status: 200 });
  }),

  http.get(`${BASE}/finance/buyers`, async () => {
    const buyers = getBuyerBillingList().map((buyer) => ({
      ...buyer,
      last_delivery: buyer.id === 'c_002' ? '2026-05-28' : buyer.id === 'c_003' ? '2026-05-27' : '2026-05-28',
    }));

    return HttpResponse.json(buyers, { status: 200 });
  }),

  http.get(`${BASE}/finance/buyers/:buyerId`, async ({ params }) => {
    const profile = getBuyerBillingProfile(params.buyerId);
    if (!profile) {
      return HttpResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    return HttpResponse.json(profile, { status: 200 });
  }),

  // Inventory status used by InventoryRegistry and FeedFormulation
  http.get(`${BASE}/inventory/status`, async () => {
    return HttpResponse.json([
      { id: 'uuid-dairymeal-0001', name: 'Dairy Meal (Premium)', unit: 'KG', qty: 850, threshold: 200 },
      { id: 'uuid-dairymeal-0002', name: 'Dairy Meal (Standard)', unit: 'KG', qty: 420, threshold: 150 },
      { id: 'uuid-silage-0001', name: 'Silage Reserve', unit: 'KG', qty: 120, threshold: 500 },
    ], { status: 200 });
  }),

  // Deduct inventory when a feed task is logged from the Herdsman view
  http.post(`${BASE}/v1/inventory/deduct`, async ({ request }) => {
    const { item_id, quantity } = await request.json().catch(() => ({}));
    // Simple mocked behavior: respond with a new balance and optional reorder alert
    // For demonstration, if quantity is > 400 trigger a reorder alert
    const numeric = parseFloat(quantity) || 0;
    const exampleBalances = {
      'uuid-dairymeal-0001': 850,
      'uuid-dairymeal-0002': 420,
      'uuid-silage-0001': 120,
    };

    const starting = exampleBalances[item_id] || 500;
    const new_balance = Math.max(0, starting - numeric);
    const reorder_alert = new_balance <= 150;

    return HttpResponse.json({
      success: true,
      new_balance,
      unit: 'KG',
      reorder_alert,
    }, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────
  // Feed Calculator (Milk Lab)
  // ─────────────────────────────────────────────────────────────────
  

  // ─────────────────────────────────────────────────────────────────
  // 4. VETERINARY & COMPLIANCE
  // ─────────────────────────────────────────────────────────────────

  http.get(`${BASE}/veterinary/hardlocks/active`, async () => {
    return HttpResponse.json([
      {
        id: 'hl_001',
        cow_id: 'C-84',
        cow_name: 'Bessie',
        reason: 'Antibiotic Withdrawal (Penicillin)',
        lock_expires: '2026-05-16T00:00:00Z',
        severity: 'CRITICAL'
      },
      {
        id: 'hl_002',
        cow_id: 'C-12',
        cow_name: 'Daisy',
        reason: 'Mastitis Observation',
        lock_expires: '2026-05-15T00:00:00Z',
        severity: 'WARNING'
      }
    ], { status: 200 });
  })
,
  // COWS LIST (for FastMilkLog)
  http.get(`${BASE}/cows`, async () => {
    return HttpResponse.json([
      { id: 'C-101', name: 'Luna' },
      { id: 'C-102', name: 'Asha' },
      { id: 'C-103', name: 'Nia' },
      { id: 'C-104', name: 'Daisy' },
      { id: 'C-105', name: 'Bella' }
    ], { status: 200 });
  }),

  http.get(`${BASE}/production/history/:cowId`, async ({ params }) => {
    const cowId = params.cowId;
    await delay(150);

    const fallback = {
      name: 'Unknown Cow',
      breed: 'Not available',
      average: '0.0 L/day',
      peak: '0.0 L/day',
      lastYield: '0.0 L',
      sessions: [],
    };

    return HttpResponse.json({
      cowId,
      ...fallback,
      ...(milkHistoryByCow[cowId] || {}),
    }, { status: 200 });
  }),

];

export function adminLoginHandler() {
  return http.post(`${BASE}/auth/login`, async () => {
    await delay(200);
    const userPayload = {
      id: 'usr_admin_dev',
      name: 'Dev Admin',
      role: 'PRIMARY_ADMIN',
      tenant_id: 'tnt_dev',
      tenant_type: 'single',
      farm_id: 'frm_dev_main',
      farm_name: 'Dev Farm',
      available_farms: [{ id: 'frm_dev_main', name: 'Dev Farm' }],
      token: 'mock_admin_token'
    };

    return HttpResponse.json({ message: 'Login successful (admin override)', user: userPayload }, { status: 200 });
  });
}