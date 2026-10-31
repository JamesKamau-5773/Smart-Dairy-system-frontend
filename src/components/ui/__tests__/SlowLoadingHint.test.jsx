import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlowLoadingHint } from '../ListLoadState';

void React;
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SlowLoadingHint', () => {
  it('stays hidden on a normal connection and appears when loading drags on', () => {
    vi.useFakeTimers();
    render(<SlowLoadingHint label="milk records" />);

    act(() => { vi.advanceTimersByTime(3900); });
    expect(screen.queryByText(/connection seems slow/)).toBeNull();

    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText(/Still loading milk records – your connection seems slow/)).toBeTruthy();
  });
});
