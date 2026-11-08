import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSubmissionKey } from '../useSubmissionKey';

const entry = { cow_id: '57', amount: 12.5, session: 'morning', milking_date: '2026-11-08' };

describe('useSubmissionKey', () => {
  it('returns the same key for the same submission (retries, double taps)', () => {
    const { result } = renderHook(() => useSubmissionKey());
    const first = result.current.keyFor(entry);
    expect(result.current.keyFor({ ...entry })).toBe(first);
    expect(first).toMatch(/^web:/);
  });

  it('returns a new key when the content changes', () => {
    const { result } = renderHook(() => useSubmissionKey());
    const first = result.current.keyFor(entry);
    expect(result.current.keyFor({ ...entry, amount: 13 })).not.toBe(first);
  });

  it('returns a new key after reset, even for identical content (a new entry)', () => {
    const { result } = renderHook(() => useSubmissionKey());
    const first = result.current.keyFor(entry);
    result.current.reset();
    expect(result.current.keyFor(entry)).not.toBe(first);
  });

  it('keeps the same functions across renders', () => {
    const { result, rerender } = renderHook(() => useSubmissionKey());
    const { keyFor, reset } = result.current;
    rerender();
    expect(result.current.keyFor).toBe(keyFor);
    expect(result.current.reset).toBe(reset);
  });
});
