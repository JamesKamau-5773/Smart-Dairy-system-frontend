import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPollDelay, usePolling } from '../usePolling';

void React;

function Poller({ task, enabled = true }) {
  usePolling(task, { enabled });
  return null;
}

const setHidden = (value) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
const advance = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setHidden(false);
  });

  it('stays inside the contract’s 3–5 second window', () => {
    expect(defaultPollDelay(0)).toBe(3000);
    expect(defaultPollDelay(20)).toBe(5000);
  });

  it('polls until the task reports it is done', async () => {
    const task = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<Poller task={task} />);

    await advance(3000);
    await advance(3000);
    await advance(10_000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('keeps going after a failed attempt', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(false);
    render(<Poller task={task} />);

    await advance(3000);
    await advance(3000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('pauses while the page is hidden and checks immediately when it is shown again', async () => {
    const task = vi.fn().mockResolvedValue(false);
    render(<Poller task={task} />);

    setHidden(true);
    await advance(15_000);
    expect(task).not.toHaveBeenCalled();

    setHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const task = vi.fn().mockResolvedValue(false);
    render(<Poller task={task} enabled={false} />);
    await advance(10_000);
    expect(task).not.toHaveBeenCalled();
  });
});
