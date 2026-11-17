import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStoredTheme } from '../themePreference';

const prefersDark = (dark) => vi.stubGlobal('matchMedia', (query) => ({ matches: dark && query.includes('dark') }));

describe('readStoredTheme', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('keeps a saved light or dark theme', () => {
    prefersDark(true);
    localStorage.setItem('color-theme', 'light');
    expect(readStoredTheme()).toBe('light');
    localStorage.setItem('color-theme', 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('uses the device setting when nothing is saved', () => {
    prefersDark(true);
    expect(readStoredTheme()).toBe('dark');
    prefersDark(false);
    expect(readStoredTheme()).toBe('light');
  });

  it('clears the retired Soft/Dense choice and falls back to the default', () => {
    prefersDark(false);
    localStorage.setItem('typographyTone', 'dense');
    localStorage.setItem('color-theme', 'soft');
    expect(readStoredTheme()).toBe('light');
    expect(localStorage.getItem('typographyTone')).toBeNull();
    expect(localStorage.getItem('color-theme')).toBeNull();
  });
});
