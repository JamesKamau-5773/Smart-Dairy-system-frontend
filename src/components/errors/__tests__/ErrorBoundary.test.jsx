import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

void React;
afterEach(cleanup);

let shouldThrow = true;
function Flaky() {
  if (shouldThrow) throw new Error('boom');
  return <p>Page content</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('replaces a crashed page with a plain-language recovery screen', () => {
    render(<ErrorBoundary variant="page" resetKey="/a"><Flaky /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('This page stopped working')).toBeTruthy();
    expect(screen.getByText(/not something you did/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload the app' })).toBeTruthy();
  });

  it('recovers with Try again once the problem is gone', () => {
    render(<ErrorBoundary variant="page" resetKey="/a"><Flaky /></ErrorBoundary>);
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Page content')).toBeTruthy();
  });

  it('clears the error when the farmer moves to another page', () => {
    const { rerender } = render(<ErrorBoundary variant="page" resetKey="/a"><Flaky /></ErrorBoundary>);
    shouldThrow = false;
    rerender(<ErrorBoundary variant="page" resetKey="/b"><Flaky /></ErrorBoundary>);
    expect(screen.getByText('Page content')).toBeTruthy();
  });

  it('uses whole-app wording at the root', () => {
    render(<ErrorBoundary><Flaky /></ErrorBoundary>);
    expect(screen.getByText('Maziwa Smart stopped working')).toBeTruthy();
  });
});
