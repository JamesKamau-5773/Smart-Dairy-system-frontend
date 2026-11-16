// The app has two themes, light and dark. The retired Soft/Dense typography switch saved its
// choice under `typographyTone` and wrote it over the theme; any such value is cleared and the
// default theme (the device's light or dark setting) is used instead.
export const THEMES = ['light', 'dark'];
export const THEME_KEY = 'color-theme';
const RETIRED_KEYS = ['typographyTone'];

export function systemTheme() {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** The saved theme when it is light or dark; anything else is cleared and the default used. */
export function readStoredTheme() {
  try {
    for (const key of RETIRED_KEYS) localStorage.removeItem(key);
    const stored = localStorage.getItem(THEME_KEY);
    if (THEMES.includes(stored)) return stored;
    if (stored !== null) localStorage.removeItem(THEME_KEY);
  } catch {
    // Blocked storage: nothing saved to read or clear.
  }
  return systemTheme();
}
