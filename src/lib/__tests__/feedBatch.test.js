import { describe, expect, it } from 'vitest';
import { buildBatchPayload, calculateBatchTotals } from '../feedBatch';

describe('feed batch costing', () => {
  it('uses inventory pricePerKg for the preview and preserves the inventory ID', () => {
    const totals = calculateBatchTotals([
      {
        ingredientId: 34,
        inventory_item_id: 34,
        name: 'Sunflower Cake',
        percentage: 100,
        pricePerKg: 55,
      },
    ], 20);

    expect(totals.totalCost).toBe(1100);
    expect(totals.costPerKg).toBe(55);

    const payload = buildBatchPayload({
      batchName: 'Dairy Feed Mix',
      totalWeight: totals.totalWeight,
      ingredients: totals.rows,
    });

    expect(payload.ingredients[0]).toMatchObject({
      ingredientId: 34,
      inventoryItemId: 34,
      lockedCostPerKg: 55,
    });
  });

  it('calculates the maximum batch size supported by current stock', () => {
    const totals = calculateBatchTotals([
      { ingredientId: 35, percentage: 2, currentStock: 1, pricePerKg: 350 },
      { ingredientId: 34, percentage: 23.79, currentStock: 25, pricePerKg: 55 },
    ], 500);

    expect(totals.maximumFeasibleBatchWeight).toBe(50);
  });
});