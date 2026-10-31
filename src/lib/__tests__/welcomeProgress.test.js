import { describe, expect, it } from 'vitest';
import { checklistView, milestoneStatus, swahiliGreeting } from '../welcomeProgress';

describe('checklistView', () => {
  it('shows the checklist while steps remain', () => {
    expect(checklistView(null, false)).toBe('checklist');
    expect(checklistView('active', false)).toBe('checklist');
  });

  it('celebrates only a farm that worked through the list', () => {
    expect(checklistView('active', true)).toBe('celebrate');
  });

  it('quietly marks an already set-up farm as done', () => {
    expect(checklistView(null, true)).toBe('mark-done');
  });

  it('stays hidden once done or dismissed', () => {
    ['done', 'dismissed'].forEach((stored) => {
      expect(checklistView(stored, false)).toBe('hidden');
      expect(checklistView(stored, true)).toBe('hidden');
    });
  });
});

describe('milestoneStatus', () => {
  it('acknowledges the current milestone silently the first time a farm is seen', () => {
    expect(milestoneStatus(null, 3113.6)).toEqual({ reached: 1000, celebrate: false, acknowledgeSilently: true });
    expect(milestoneStatus(null, 0)).toEqual({ reached: 0, celebrate: false, acknowledgeSilently: true });
  });

  it('celebrates a newly crossed milestone once', () => {
    expect(milestoneStatus('0', 120).celebrate).toBe(true);
    expect(milestoneStatus('100', 120).celebrate).toBe(false);
    expect(milestoneStatus('100', 1000)).toMatchObject({ reached: 1000, celebrate: true });
  });
});

describe('swahiliGreeting', () => {
  const at = (hour) => new Date(2026, 9, 31, hour, 0);

  it('greets by time of day', () => {
    expect(swahiliGreeting(at(6))).toBe('Habari ya asubuhi');
    expect(swahiliGreeting(at(13))).toBe('Habari ya mchana');
    expect(swahiliGreeting(at(19))).toBe('Habari ya jioni');
  });
});
