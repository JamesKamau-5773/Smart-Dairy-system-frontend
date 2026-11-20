import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AlertBanner from '../AlertBanner';

void React;
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('AlertBanner errors', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('is the inverted block on the page: dark brand surface, white text', () => {
    render(<AlertBanner type="danger" title="Not saved" message="Check your connection." />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toMatch(/bg-brand-dark/);
    expect(banner.className).not.toMatch(/danger|warning|red|amber/);
    expect(screen.getByText('Not saved').className).toMatch(/text-white/);
  });

  it('scrolls into view and takes focus so it can’t be missed', () => {
    render(<AlertBanner type="danger" message="The payment was not recorded." />);
    const banner = screen.getByRole('alert');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(banner);
  });

  it('doesn’t take focus from someone typing in a field', () => {
    render(<><input aria-label="Amount" /><span id="slot" /></>);
    const input = screen.getByLabelText('Amount');
    input.focus();
    render(<AlertBanner type="danger" message="Amount is too large." />);
    expect(document.activeElement).toBe(input);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('never auto-dismisses an error', async () => {
    vi.useFakeTimers();
    const onAutoDismiss = vi.fn();
    render(<AlertBanner type="danger" message="Not saved." autoDismiss={3000} onAutoDismiss={onAutoDismiss} />);
    expect(screen.queryByLabelText(/Closes in/)).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(onAutoDismiss).not.toHaveBeenCalled();
  });

  it('keeps other messages light and lets them time out', () => {
    render(<AlertBanner type="info" message="Saved." autoDismiss={3000} onAutoDismiss={vi.fn()} />);
    const banner = screen.getByRole('status');
    expect(banner.className).toMatch(/bg-card/);
    expect(screen.getByLabelText(/Closes in 3 seconds/)).toBeTruthy();
    expect(document.activeElement).not.toBe(banner);
  });
});
