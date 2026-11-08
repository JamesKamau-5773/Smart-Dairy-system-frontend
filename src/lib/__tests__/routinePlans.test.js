import { describe, expect, it, vi } from 'vitest';
import apiClient from '../apiClient';
import { buildRoutinePlansPayload, normalizeRoutinePlan, routineApi } from '../backendApi';
import { isReplayableMutation } from '../offlinePolicy';

const backendPlan = {
  id: 4,
  tenant_id: 1,
  start_time: '05:00:00',
  end_time: '07:00:00',
  task_title: 'Morning milking',
  task_description: 'Milk the herd',
  notes: 'Wash udders\nStrip test',
  checklist_items: ['Wash udders', 'Strip test'],
  display_order: 0,
  is_active: true,
};

describe('normalizeRoutinePlan', () => {
  it('maps the backend fields the pages use', () => {
    expect(normalizeRoutinePlan(backendPlan)).toEqual({
      id: 4,
      title: 'Morning milking',
      description: 'Milk the herd',
      time: '05:00–07:00',
      startTime: '05:00:00',
      endTime: '07:00:00',
      checklist: 'Wash udders\nStrip test',
      displayOrder: 0,
      isActive: true,
    });
  });

  it('uses checklist_items when there are no notes, and leaves a missing time blank', () => {
    const plan = normalizeRoutinePlan({ id: 5, task_title: 'Feeding', notes: null, checklist_items: ['Fill troughs'] });
    expect(plan.checklist).toBe('Fill troughs');
    expect(plan.time).toBe('');
  });
});

describe('buildRoutinePlansPayload', () => {
  it('sends back what POST /routine/plans validates, with the edited checklist', () => {
    const edited = { ...normalizeRoutinePlan(backendPlan), checklist: 'Wash udders\n\n Record litres ' };
    expect(buildRoutinePlansPayload([edited])).toEqual([{
      task_title: 'Morning milking',
      task_description: 'Milk the herd',
      start_time: '05:00:00',
      end_time: '07:00:00',
      notes: 'Wash udders\n\n Record litres ',
      checklist_items: ['Wash udders', 'Record litres'],
      display_order: 0,
      is_active: true,
    }]);
  });
});

describe('routineApi', () => {
  it('normalizes the list and posts the backend shape', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [backendPlan] });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'ok' } });

    const plans = await routineApi.listPlans();
    expect(plans[0].title).toBe('Morning milking');

    await routineApi.savePlans(plans);
    expect(post).toHaveBeenCalledWith('/routine/plans', [expect.objectContaining({ task_title: 'Morning milking', start_time: '05:00:00' })]);
    vi.restoreAllMocks();
  });
});

describe('offline policy for the routine', () => {
  it('needs a connection to save, because a queued save replaces the whole plan later', () => {
    expect(isReplayableMutation({ method: 'post', url: '/routine/plans', headers: {} })).toBe(false);
  });
});
