import { useState } from 'react';

const read = (key) => {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const write = (key) => {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage blocked (private window): the notice stays hidden until the page reloads.
  }
};

/**
 * Whether a notice under `key` was dismissed in this browser session (sessionStorage: it comes
 * back in a new tab or after the browser closes). A new key (another farm, another day) starts
 * undismissed.
 *
 * @returns {[boolean, () => void]} [dismissed, dismiss]
 */
export function useSessionDismissal(key) {
  const [state, setState] = useState(() => ({ key, dismissed: read(key) }));
  // The key changed (farm or day): read its own flag. Adjusted during render, no effect pass.
  if (state.key !== key) setState({ key, dismissed: read(key) });

  const dismiss = () => {
    write(key);
    setState({ key, dismissed: true });
  };
  return [state.key === key ? state.dismissed : read(key), dismiss];
}
