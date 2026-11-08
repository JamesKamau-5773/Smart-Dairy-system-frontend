import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../apiClient';
import { productionApi } from '../backendApi';

describe('productionApi.updateYield', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('PATCHes only amount, session and milking date, passing the request config through', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { id: 9, amount: 15 } });

    const result = await productionApi.updateYield(9, {
      cow_id: '57', amount: '15', session: 'evening', milking_date: '2026-11-07',
    }, { headers: { 'Idempotency-Key': 'web:k1' } });

    expect(patch).toHaveBeenCalledWith(
      '/production/yield/9',
      { amount: 15, session: 'evening', milking_date: '2026-11-07' },
      { headers: { 'Idempotency-Key': 'web:k1' } },
    );
    expect(result).toEqual({ id: 9, amount: 15 });
  });

  it('leaves the date out when none is given, so the backend keeps the existing one', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} });

    await productionApi.updateYield(9, { volume: 4, session: 'morning' });

    expect(patch).toHaveBeenCalledWith('/production/yield/9', { amount: 4, session: 'morning' }, {});
  });
});
