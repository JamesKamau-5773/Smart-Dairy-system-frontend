import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListLoadNotices } from '../ListLoadState';
import PageSkeleton from '../PageSkeleton';
import { hasRowsToShow } from '../../../lib/listLoadState';

afterEach(cleanup);

describe('ListLoadNotices', () => {
  it('renders nothing when the list is ready', () => {
    const { container } = render(<ListLoadNotices state="ready" label="cows" onRetry={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('shows a full message with Try again when loading failed', () => {
    const onRetry = vi.fn();
    render(<ListLoadNotices state="error" label="cows" error={new Error('x')} onRetry={onRetry} />);
    expect(screen.getByText('Couldn’t load cows.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('says the phone is offline (no retry button) when the first load is paused', () => {
    render(<ListLoadNotices state="offline" label="cows" onRetry={vi.fn()} />);
    expect(screen.getByText(/You’re offline, and cows haven’t been saved on this phone yet/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps saved rows visible with a refresh notice when a refresh failed', () => {
    render(<ListLoadNotices state="stale" label="cows" error={new Error('x')} onRetry={vi.fn()} />);
    expect(screen.getByText(/Showing cows saved on this phone/)).toBeTruthy();
  });
});

describe('hasRowsToShow', () => {
  it.each([['ready', true], ['stale', true], ['loading', false], ['offline', false], ['error', false]])('%s → %s', (state, expected) => {
    expect(hasRowsToShow(state)).toBe(expected);
  });
});

describe('PageSkeleton', () => {
  it('announces what is loading to screen readers without showing text', () => {
    render(<PageSkeleton label="Loading payroll…" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading payroll…').className).toContain('sr-only');
  });

  it('has a full-screen form-card variant for screens outside the app', () => {
    render(<PageSkeleton variant="card" label="Loading login…" />);
    expect(screen.getByRole('status').className).toContain('min-h-screen');
    expect(screen.getByText('Loading login…')).toBeTruthy();
  });
});
