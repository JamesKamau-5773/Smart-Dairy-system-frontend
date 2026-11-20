import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../apiClient';
import { buildProductionYieldPayload, productionApi } from '../backendApi';

afterEach(() => vi.restoreAllMocks());

describe('milker_id on milk records', () => {
  it('goes with a new record (and its offline replay) only when someone else milked', () => {
    expect(buildProductionYieldPayload({ cow_id: 57, amount: 12, session: 'morning', milking_date: '2026-11-20', milker_id: 5 }))
      .toMatchObject({ milker_id: 5 });
    expect(buildProductionYieldPayload({ cow_id: 57, amount: 12, session: 'morning', milking_date: '2026-11-20' }))
      .not.toHaveProperty('milker_id');
  });

  it('is sent on edit when given; null or empty clears it', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { id: 9, status: 'Flagged', significant_drop: true } });
    await productionApi.updateYield(9, { amount: 8, session: 'Evening', milker_id: '' });
    expect(patch.mock.calls[0][1]).toMatchObject({ amount: 8, milker_id: null });

    const saved = await productionApi.updateYield(9, { amount: 8, session: 'Evening' });
    expect(patch.mock.calls[1][1]).not.toHaveProperty('milker_id');
    // The re-checked status and drop come back with the edit.
    expect(saved).toMatchObject({ status: 'Flagged', significant_drop: true });
  });
});

describe('productionApi.listMilkers', () => {
  it('reads the backend’s milker list as it sends it', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { items: [{ id: 4, name: 'Wairimu', job_title: 'Milker', status: 'ACTIVE', is_me: true }], count: 1 } });
    expect(await productionApi.listMilkers()).toEqual([{ id: 4, name: 'Wairimu', jobTitle: 'Milker', status: 'ACTIVE', isMe: true }]);
    expect(apiClient.get).toHaveBeenCalledWith('/production/milkers');
  });
});
