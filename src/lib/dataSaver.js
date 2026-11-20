const STORAGE_KEY = 'maziwa_data_saver';
export const DATA_SAVER_EVENT = 'datasaver:change';

// Normal: data counts as fresh for 5 minutes. Data saver: 30 minutes, so pages refetch less often.
export const NORMAL_STALE_TIME_MS = 5 * 60 * 1000;
export const DATA_SAVER_STALE_TIME_MS = 30 * 60 * 1000;

/** The farmer's choice if they made one; otherwise follow the phone's own data saver setting. */
export function isDataSaverEnabled() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'on') return true;
    if (stored === 'off') return false;
  } catch {
    // Storage blocked: fall through to the phone's setting.
  }
  return Boolean(globalThis.navigator?.connection?.saveData);
}

export function setDataSaverEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Storage blocked: the setting still applies until the app is reloaded.
  }
  window.dispatchEvent(new CustomEvent(DATA_SAVER_EVENT, { detail: enabled }));
}
