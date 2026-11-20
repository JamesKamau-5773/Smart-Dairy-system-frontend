import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiClientMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), request: vi.fn() }));
vi.mock('../apiClient', () => ({ default: apiClientMock, resolveBackendAssetUrl: vi.fn() }));

import { inventoryApi, nutritionApi } from '../backendApi';
import { hasPageAccess } from '../roles';
import { getFirstAllowedPath, getPageKeyForPath } from '../pageRoutes';
import { getDefaultStaffPageAccess, STAFF_PAGE_ACCESS_OPTIONS } from '../staffOnboarding';
import { getDataWarnings, isArchived, validateInventoryItem } from '../inventoryItemRules';
import { buildRestockMovement, validateRestock } from '../restockForm';
import { defaultMeasurements, toMeasurementPayload, validateMeasurements } from '../recipeMeasurements';
import { getMixActionStates, getShareTotal, sharesAddUp } from '../mixPlannerRules';
import { getFeedingReadiness, isValidFeedAmount } from '../feedingToday';
import { formatCostPerLitre, readFeedCostPerLitre } from '../feedCost';
import { resolveMaxBatchKg, resolveSuggestedBatch } from '../feedBatch';
import { setFarmTimeZone, todayLocalIso } from '../localDate';
import { getFeedErrorMessage } from '../feedErrors';
import { isReplayableMutation } from '../offlinePolicy';
import { buildStockOutMovement, describeCountDifference, isWriteOff, validateStockCount, validateStockOut } from '../stockChangeForm';

const apiError = (status, data = {}) => Object.assign(new Error('Request failed'), { response: { status, data, headers: {} } });

beforeEach(() => vi.clearAllMocks());

describe('page access: `feed` includes `feeding`', () => {
  it('lets planners see daily feeding, but not the other way round', () => {
    expect(hasPageAccess({ page_access: ['feed'] }, 'feeding')).toBe(true);
    expect(hasPageAccess({ page_access: ['feeding'] }, 'feeding')).toBe(true);
    expect(hasPageAccess({ page_access: ['feeding'] }, 'feed')).toBe(false);
  });

  it('guards the new feeding route and keeps the old ones', () => {
    expect(getPageKeyForPath('/feeding')).toBe('feeding');
    expect(getPageKeyForPath('/feed-nutrition/mix')).toBe('feed');
    expect(getPageKeyForPath('/somewhere-else')).toBeUndefined();
    expect(getFirstAllowedPath({ page_access: ['feeding'] })).toBe('/feeding');
  });

  it('offers `feeding` in the staff access editor and gives it to new farm hands', () => {
    expect(STAFF_PAGE_ACCESS_OPTIONS.map(({ key }) => key)).toContain('feeding');
    expect(getDefaultStaffPageAccess('FARM_HAND')).toContain('feeding');
    expect(getDefaultStaffPageAccess('FARM_HAND')).not.toContain('feed');
  });
});

describe('inventory item rules', () => {
  const feed = { name: 'Sunflower Cake', category: 'Bulk Feed', proteinGramsPerKg: 300, energyMjPerKg: 10, fiberGramsPerKg: 200, costPerKg: 40 };

  it('accepts a valid feed item without a SKU', () => {
    expect(validateInventoryItem({ ...feed, sku: '' })).toEqual({});
  });

  it.each([
    ['proteinGramsPerKg', 1000, /Protein must be between/],
    ['energyMjPerKg', 31, /Energy must be between 0 and 30/],
    ['fiberGramsPerKg', -1, /Fiber must be between/],
  ])('rejects an impossible %s', (field, value, message) => {
    expect(validateInventoryItem({ ...feed, [field]: value })[field]).toMatch(message);
  });

  it('still requires at least one nutrition or cost value for feed', () => {
    expect(validateInventoryItem({ name: 'Hay', category: 'Bulk Feed' }).nutrition).toMatch(/at least one/);
    expect(validateInventoryItem({ name: 'Syringe', category: 'Equipment' })).toEqual({});
  });

  it('reads warnings and the archived flag from the backend', () => {
    expect(getDataWarnings({ data_warnings: [{ code: 'PROTEIN_LIKELY_PERCENT' }, {}] })).toHaveLength(1);
    expect(getDataWarnings({})).toEqual([]);
    expect(isArchived({ is_active: false })).toBe(true);
    expect(isArchived({})).toBe(false);
  });
});

describe('restock form', () => {
  it('accepts any positive quantity, including decimals', () => {
    expect(validateRestock({ quantity: '23.5' })).toEqual({});
    expect(validateRestock({ quantity: '0' }).quantity).toBeTruthy();
  });

  it('needs a price before it can post a ledger expense', () => {
    expect(validateRestock({ quantity: '50', recordExpense: true }).unitCost).toMatch(/price per kg/);
    expect(validateRestock({ quantity: '50', unitCost: '42', recordExpense: true })).toEqual({});
  });

  it('only sends the optional fields that were filled in', () => {
    const item = { id: 7, name: 'Maize germ' };
    expect(buildRestockMovement(item, { quantity: '23.5', unitCost: '', supplierName: ' ', recordExpense: false })).toEqual({
      item_id: 7, quantity: 23.5, transaction_type: 'IN', movement_type: 'restock', reference_note: 'Restock for Maize germ',
    });
    expect(buildRestockMovement(item, { quantity: '50', unitCost: '42', supplierName: ' Unga Feeds ', recordExpense: true })).toMatchObject({
      unit_cost: 42, supplier_name: 'Unga Feeds', record_expense: true,
    });
  });
});

describe('mix measurements', () => {
  it('defaults dairy meal to the concentrate basis', () => {
    expect(defaultMeasurements('dairy_meal').quantity_basis).toBe('concentrate');
    expect(defaultMeasurements('main_meal').quantity_basis).toBe('total_ration');
  });

  it('needs both bucket fields or neither', () => {
    const base = defaultMeasurements('dairy_meal');
    expect(validateMeasurements({ ...base, bulk_density_kg_per_litre: '0.6' }).bucket_volume_litres).toMatch(/both/);
    expect(validateMeasurements({ ...base, bulk_density_kg_per_litre: '0.6', bucket_volume_litres: '10' })).toEqual({});
  });

  it('sends only filled numbers, and the concentrate rate only for the concentrate basis', () => {
    expect(toMeasurementPayload({ ...defaultMeasurements('dairy_meal'), concentrate_kg_per_head_day: '4' }))
      .toEqual({ quantity_basis: 'concentrate', concentrate_kg_per_head_day: 4 });
    expect(toMeasurementPayload({ ...defaultMeasurements('main_meal'), concentrate_kg_per_head_day: '4' }))
      .toEqual({ quantity_basis: 'total_ration' });
  });
});

describe('mixing planner buttons', () => {
  const ready = { hasIngredients: true, hasSharedIngredients: true, hasLinkedIngredients: true, shareTotal: 100 };

  it('allows everything for a complete mix', () => {
    const states = getMixActionStates(ready);
    expect(Object.values(states).every((state) => !state.disabled)).toBe(true);
  });

  it('blocks saving and mixing when shares don’t add up to 100%, and says so', () => {
    const states = getMixActionStates({ ...ready, shareTotal: 92.5 });
    expect(states.save).toEqual({ disabled: true, reason: expect.stringContaining('92.5%') });
    expect(states.batch.disabled).toBe(true);
    expect(states.check.disabled).toBe(false);
  });

  it('explains an empty mix on every button', () => {
    const states = getMixActionStates({ ...ready, hasIngredients: false, hasSharedIngredients: false });
    expect(Object.values(states).every((state) => state.disabled && state.reason)).toBe(true);
  });

  it('adds shares without floating-point noise', () => {
    expect(getShareTotal([{ percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 }])).toBe(100);
    expect(sharesAddUp(99.995)).toBe(true);
    expect(sharesAddUp(99.9)).toBe(false);
  });
});

describe('today’s feeding', () => {
  const today = { active_batches: [{ batch_id: 41, remaining_kg: 20.5 }] };
  const group = { feeding_group: 'lactating', ready: true, not_ready_reason: null, mix_name: 'Dairy Meal', headcount: 2, active_batch_id: 41, group_batch_per_feeding_kg: 2.666 };

  it('prefills one feeding’s worth for a ready group', () => {
    expect(getFeedingReadiness(today, group)).toMatchObject({ canFeed: true, perFeedingKg: 2.67 });
  });

  it.each([
    ['NO_MIX', /No mix is assigned/],
    ['NO_ANIMALS', /no animals/],
    ['NO_CONCENTRATE_RATE', /concentrate amount/],
    ['NO_ACTIVE_BATCH', /no mixed batch/],
  ])('words the backend’s reason %s', (code, reason) => {
    expect(getFeedingReadiness(today, { ...group, ready: false, not_ready_reason: code }).reason).toMatch(reason);
  });

  it('only reads the backend’s reason, never works one out from other fields', () => {
    // A group with no mix name but no reason code from the backend is still ready if the backend says so.
    expect(getFeedingReadiness(today, { ...group, mix_name: null }).canFeed).toBe(true);
  });

  it('blocks a ready group whose batch the backend didn’t list', () => {
    expect(getFeedingReadiness(today, { ...group, active_batch_id: 99 })).toMatchObject({ canFeed: false, reason: expect.stringMatching(/no mixed batch/) });
  });

  it('won’t record more than is left in the batch', () => {
    expect(isValidFeedAmount('20.5', { remaining_kg: 20.5 })).toBe(true);
    expect(isValidFeedAmount('21', { remaining_kg: 20.5 })).toBe(false);
    expect(isValidFeedAmount('0', { remaining_kg: 20.5 })).toBe(false);
  });
});

describe('feed cost per litre', () => {
  it('reads only per-litre fields and keeps missing values missing', () => {
    expect(readFeedCostPerLitre({ feedCostPerLiter: 12.345 })).toBe(12.345);
    expect(readFeedCostPerLitre({ cost_per_liter: '9' })).toBe(9);
    expect(readFeedCostPerLitre({ cost: 5000 })).toBeNull();
    expect(readFeedCostPerLitre({})).toBeNull();
  });

  it('formats the same way everywhere', () => {
    expect(formatCostPerLitre(12.345)).toBe('KES 12.35 / L');
    expect(formatCostPerLitre(null)).toBe('—');
  });
});

describe('suggested batch size', () => {
  it('caps the suggestion with the backend’s max_batch_kg only', () => {
    expect(resolveSuggestedBatch({ suggested_batch_kg: 40, max_batch_kg: 100 })).toEqual({ kg: 40, capped: false, reason: null, limitingIngredient: null });
    expect(resolveSuggestedBatch({ suggested_batch_kg: 40, max_batch_kg: 32 })).toEqual({ kg: 32, capped: true, reason: null, limitingIngredient: null });
    // No field from the backend means no cap: the device doesn't work one out.
    expect(resolveSuggestedBatch({ suggested_batch_kg: 40 })).toMatchObject({ kg: 40, capped: false });
  });

  it('passes the backend’s reason through when there is nothing to suggest', () => {
    expect(resolveSuggestedBatch({ suggested_batch_kg: 0, reason: 'Enough in store.' })).toEqual({ kg: null, capped: false, reason: 'Enough in store.', limitingIngredient: null });
  });
});

describe('local dates', () => {
  it('uses the device’s calendar day, not UTC', () => {
    // 01:30 in Nairobi on 3 Nov is still 2 Nov in UTC.
    const nairobiEarlyMorning = { getTime: () => Date.UTC(2026, 10, 2, 22, 30), getTimezoneOffset: () => -180 };
    expect(todayLocalIso(nairobiEarlyMorning)).toBe('2026-11-03');
  });
});

describe('feed error messages', () => {
  it('branches on the code, not the text', () => {
    expect(getFeedErrorMessage(apiError(400, { code: 'STOCK_CHANGE_REQUIRES_MOVEMENT', error: 'x' }), 'fallback')).toMatch(/Restock/);
    expect(getFeedErrorMessage(apiError(400, { code: 'VALIDATION_ERROR', error: 'Energy must be 0–30 MJ/kg.' }), 'fallback')).toBe('Energy must be 0–30 MJ/kg.');
    expect(getFeedErrorMessage(apiError(500, { code: 'INTERNAL_ERROR' }), 'Could not save.')).toBe('Could not save.');
  });
});

describe('inventory API', () => {
  it('never sends stock in an update, so a stale form can’t trip STOCK_CHANGE_REQUIRES_MOVEMENT', async () => {
    apiClientMock.patch.mockResolvedValue({ data: { id: 3, name: 'Hay' } });
    await inventoryApi.updateItem(3, { name: 'Hay', currentStock: 120, current_qty: 120, sku: '' });
    const body = apiClientMock.patch.mock.calls[0][1];
    expect(body).not.toHaveProperty('currentStock');
    expect(body).not.toHaveProperty('current_qty');
    expect(body).not.toHaveProperty('sku');
  });

  it('still sends the opening stock when an item is created', async () => {
    apiClientMock.post.mockResolvedValue({ data: { id: 4 } });
    await inventoryApi.createItem({ name: 'Hay', currentStock: 12.5, sku: 'HY-1' });
    expect(apiClientMock.post.mock.calls[0][1]).toMatchObject({ currentStock: 12.5, sku: 'HY-1' });
  });

  it('asks for archived items only when told to', async () => {
    apiClientMock.get.mockResolvedValue({ data: [{ id: 1, name: 'Old', is_active: false }] });
    await inventoryApi.listItems();
    await inventoryApi.listItems({ includeArchived: true });
    expect(apiClientMock.get.mock.calls[0][1]).toEqual({ params: undefined });
    expect(apiClientMock.get.mock.calls[1][1]).toEqual({ params: { include_archived: true } });
  });

  it('calls archive, restore and data-fix endpoints', async () => {
    apiClientMock.post.mockResolvedValue({ data: { id: 9, is_active: false } });
    expect((await inventoryApi.archiveItem(9)).is_active).toBe(false);
    await inventoryApi.restoreItem(9);
    await inventoryApi.applyDataFix(9, 'PROTEIN_LIKELY_PERCENT');
    expect(apiClientMock.post.mock.calls.map(([url, body]) => [url, body])).toEqual([
      ['/inventory/items/9/archive', undefined],
      ['/inventory/items/9/restore', undefined],
      ['/inventory/items/9/data-fixes', { code: 'PROTEIN_LIKELY_PERCENT' }],
    ]);
  });

  it('asks for today’s feeding and a suggested batch size', async () => {
    apiClientMock.get.mockResolvedValue({ data: {} });
    await nutritionApi.feedingToday();
    await nutritionApi.suggestedBatchSize('dairy_meal', 7);
    expect(apiClientMock.get.mock.calls[0][0]).toBe('/v1/nutrition/feeding/today');
    expect(apiClientMock.get.mock.calls[1]).toEqual(['/v1/nutrition/batches/suggested-size', { params: { recipe_type: 'dairy_meal', days: 7 } }]);
  });
});

describe('offline policy for owner item actions', () => {
  it('never queues archive, restore or data fixes, so a failure can’t look like success', () => {
    ['archive', 'restore', 'data-fixes'].forEach((action) => {
      expect(isReplayableMutation({ method: 'post', url: `/inventory/items/9/${action}` })).toBe(false);
    });
    // Ordinary stock work still saves offline.
    expect(isReplayableMutation({ method: 'post', url: '/inventory/movements' })).toBe(true);
  });
});

describe('backend-provided fields win', () => {
  const today = { active_batches: [{ batch_id: 41, remaining_kg: 20 }] };

  it('words the backend’s not-ready reason code', () => {
    expect(getFeedingReadiness(today, { ready: false, not_ready_reason: 'NO_ACTIVE_BATCH', mix_name: 'X' }).reason).toMatch(/no mixed batch/);
    expect(getFeedingReadiness(today, { ready: false, not_ready_reason: 'SOMETHING_NEW', not_ready_message: 'Vet hold on this group.' }).reason).toBe('Vet hold on this group.');
  });

  it('never lets a group the backend marks not ready be fed', () => {
    expect(getFeedingReadiness(today, { ready: false, not_ready_reason: null, active_batch_id: 41 }).canFeed).toBe(false);
  });

  it('caps the suggestion with the backend’s max_batch_kg when it sends one', () => {
    expect(resolveSuggestedBatch({ suggested_batch_kg: 60, max_batch_kg: 25, limiting_ingredient: { name: 'Maize Germ' } }))
      .toEqual({ kg: 25, capped: true, reason: null, limitingIngredient: 'Maize Germ' });
  });
});

describe('stock out and stock count', () => {
  it('needs a quantity no larger than the stock, and a known reason', () => {
    expect(validateStockOut({ quantity: '5', reason: 'USAGE' }, 10)).toEqual({});
    expect(validateStockOut({ quantity: '11', reason: 'USAGE' }, 10).quantity).toMatch(/Only 10 in stock/);
    expect(validateStockOut({ quantity: '0', reason: 'USAGE' }, 10).quantity).toBeTruthy();
    expect(validateStockOut({ quantity: '1', reason: 'LOST_IN_MAIL' }, 10).reason).toBeTruthy();
  });

  it('sends the reason as the backend movement type', () => {
    expect(buildStockOutMovement({ id: 3 }, { quantity: '2.5', reason: 'SPOILAGE', notes: ' rats ' })).toEqual({
      item_id: 3, quantity: 2.5, transaction_type: 'SPOILAGE', movement_type: 'SPOILAGE', notes: 'rats',
    });
    expect(isWriteOff('SPOILAGE')).toBe(true);
    expect(isWriteOff('USAGE')).toBe(false);
  });

  it('previews what a count will change', () => {
    expect(validateStockCount('')).toHaveProperty('counted');
    expect(validateStockCount('0')).toEqual({});
    expect(describeCountDifference('95', 100)).toEqual({ kind: 'loss', difference: 5 });
    expect(describeCountDifference('104.5', 100)).toEqual({ kind: 'gain', difference: 4.5 });
    expect(describeCountDifference('100.004', 100)).toEqual({ kind: 'match', difference: 0 });
  });

  it('never queues a stock count, which must meet the latest balance', () => {
    expect(isReplayableMutation({ method: 'post', url: '/inventory/items/9/audit' })).toBe(false);
  });
});

describe('backend contract updates (max batch, farm timezone)', () => {
  it('treats the backend’s null max_batch_kg (no mix assigned) as no cap', () => {
    expect(resolveMaxBatchKg({ max_batch_kg: null })).toBeNull();
    expect(resolveMaxBatchKg(undefined)).toBeNull();
    expect(resolveMaxBatchKg({ max_batch_kg: 41.7 })).toBe(41.7);
    expect(resolveSuggestedBatch({ suggested_batch_kg: 60, max_batch_kg: null })).toMatchObject({ kg: 60, capped: false });
  });

  it('follows the farm’s timezone once the backend reports it', () => {
    const lateEveningUtc = new Date(Date.UTC(2026, 10, 2, 22, 30)); // 01:30 on 3 Nov in Nairobi
    setFarmTimeZone('Africa/Nairobi');
    expect(todayLocalIso(lateEveningUtc)).toBe('2026-11-03');
    setFarmTimeZone('Not/AZone');
    expect(todayLocalIso(lateEveningUtc)).toBe('2026-11-03');
  });
});
