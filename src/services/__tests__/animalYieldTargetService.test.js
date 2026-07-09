import { describe, expect, it } from 'vitest';
import {
  buildYieldSchedulePayload,
  normalizeYieldTarget,
  isLactatingStatus,
  summarizeYieldTargets,
} from '../animalYieldTargetService';

describe('animalYieldTargetService helpers', () => {
  it('identifies lactating cows consistently', () => {
    expect(isLactatingStatus('LACTATING')).toBe(true);
    expect(isLactatingStatus('lactating')).toBe(true);
    expect(isLactatingStatus('DRY')).toBe(false);
  });

  it('normalizes a valid yield target record', () => {
    expect(normalizeYieldTarget({ cow_id: 12, target_liters: 18.5, current_status: 'LACTATING' })).toEqual(
      expect.objectContaining({
        cowId: '12',
        targetLiters: 18.5,
        isActive: true,
      })
    );
  });

  it('builds a per-cow schedule payload when active targets exist', () => {
    const cows = [
      { id: 1, current_status: 'LACTATING' },
      { id: 2, current_status: 'LACTATING' },
      { id: 3, current_status: 'DRY' },
    ];
    const targets = [
      { cowId: '1', targetLiters: 14, isActive: true },
      { cowId: '2', targetLiters: 12.5, isActive: true },
      { cowId: '3', targetLiters: 20, isActive: true },
    ];

    const payload = buildYieldSchedulePayload({
      cows,
      targets,
      fallbackTargetLiters: 40,
      baselineHerdMealKg: 4,
    });

    expect(payload.request.target_liters).toBe(26.5);
    expect(payload.request.target_mode).toBe('per_cow');
    expect(payload.request.animal_targets).toHaveLength(2);
    expect(payload.summary).toEqual(expect.objectContaining({
      targetSource: 'per_cow',
      activeCowCount: 2,
      targetedCowCount: 2,
      untargetedCowCount: 0,
    }));
  });

  it('falls back to herd-level target when no active targets exist', () => {
    const payload = buildYieldSchedulePayload({
      cows: [{ id: 1, current_status: 'DRY' }],
      targets: [],
      fallbackTargetLiters: 35.5,
      baselineHerdMealKg: 4,
    });

    expect(payload.request.target_liters).toBe(35.5);
    expect(payload.request.target_mode).toBe('herd_fallback');
    expect(payload.summary).toEqual(expect.objectContaining({
      targetSource: 'herd_fallback',
      activeCowCount: 0,
      targetedCowCount: 0,
      untargetedCowCount: 0,
    }));
  });

  it('summarizes target visibility for milk lab', () => {
    const cows = [
      { id: 1, name: 'Ruby', current_status: 'LACTATING' },
      { id: 2, name: 'Mara', current_status: 'LACTATING' },
      { id: 3, name: 'Nia', current_status: 'DRY' },
    ];
    const targets = [
      { cowId: '1', targetLiters: 13, isActive: true },
      { cowId: '3', targetLiters: 10, isActive: false },
    ];

    const summary = summarizeYieldTargets({ cows, targets });

    expect(summary.lactatingWithTarget).toHaveLength(1);
    expect(summary.lactatingMissingTarget).toHaveLength(1);
    expect(summary.inactiveWithTarget).toHaveLength(1);
    expect(summary.targetedCount).toBe(1);
    expect(summary.lactatingCount).toBe(2);
  });
});