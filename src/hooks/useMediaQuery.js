import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query matches, kept up to date as the window resizes. False where
 * matchMedia isn't available (tests, very old browsers).
 *
 * @param {string} query e.g. '(min-width: 768px)'
 * @returns {boolean}
 *
 * @example
 * const isDesktop = useMediaQuery(DESKTOP_QUERY);
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = globalThis.matchMedia?.(query);
      list?.addEventListener?.('change', onChange);
      return () => list?.removeEventListener?.('change', onChange);
    },
    () => Boolean(globalThis.matchMedia?.(query).matches),
    () => false,
  );
}

/** Tailwind's `md` breakpoint: the sidebar is always shown from here up. */
export const DESKTOP_QUERY = '(min-width: 768px)';

/** Phones: inputs are 16px here (src/index.css), so long placeholders get a short form. */
export const PHONE_QUERY = '(max-width: 640px)';
