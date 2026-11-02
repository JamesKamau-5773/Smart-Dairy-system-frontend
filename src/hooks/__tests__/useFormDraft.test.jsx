import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readDraft, useFormDraft } from '../useFormDraft';

const isEmpty = (values) => !values.volume;
const signIn = (id, farm = 'f1') => sessionStorage.setItem('jivu_user', JSON.stringify({ id, farm_id: farm, token: 't' }));

function useMilkForm(options = {}) {
  const [values, setValues] = useState({ cowId: '', volume: '' });
  const draft = useFormDraft('milk-log', values, setValues, { isEmpty, ...options });
  return { values, setValues, ...draft };
}

describe('useFormDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    signIn(7);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('keeps typed values and restores them after the form is reopened', () => {
    const first = renderHook(() => useMilkForm());
    act(() => first.result.current.setValues({ cowId: '57', volume: '12.5' }));
    act(() => { vi.advanceTimersByTime(400); });
    first.unmount();

    const reopened = renderHook(() => useMilkForm());
    expect(reopened.result.current.values).toEqual({ cowId: '57', volume: '12.5' });
    expect(reopened.result.current.restored).toBe(true);
  });

  it('forgets the draft once the form is saved and reset, or cleared on purpose', () => {
    const form = renderHook(() => useMilkForm());
    act(() => form.result.current.setValues({ cowId: '57', volume: '12.5' }));
    act(() => { vi.advanceTimersByTime(400); });
    act(() => form.result.current.setValues({ cowId: '', volume: '' }));
    expect(readDraft('milk-log')).toBeNull();

    act(() => form.result.current.setValues({ cowId: '57', volume: '9' }));
    act(() => { vi.advanceTimersByTime(400); });
    act(() => form.result.current.clearDraft());
    expect(readDraft('milk-log')).toBeNull();
  });

  it('keeps drafts private to the signed-in user', () => {
    const form = renderHook(() => useMilkForm());
    act(() => form.result.current.setValues({ cowId: '57', volume: '12.5' }));
    act(() => { vi.advanceTimersByTime(400); });
    form.unmount();

    signIn(8);
    expect(renderHook(() => useMilkForm()).result.current.restored).toBe(false);
  });

  it('drops drafts older than a week', () => {
    vi.setSystemTime(new Date('2026-10-01T06:00:00Z'));
    const form = renderHook(() => useMilkForm());
    act(() => form.result.current.setValues({ cowId: '57', volume: '12.5' }));
    act(() => { vi.advanceTimersByTime(400); });
    form.unmount();

    vi.setSystemTime(new Date('2026-10-09T06:00:00Z'));
    expect(readDraft('milk-log')).toBeNull();
  });

  it('does nothing while disabled (editing an existing record)', () => {
    const form = renderHook(() => useMilkForm({ enabled: false }));
    act(() => form.result.current.setValues({ cowId: '57', volume: '12.5' }));
    act(() => { vi.advanceTimersByTime(400); });
    expect(readDraft('milk-log')).toBeNull();
  });
});
