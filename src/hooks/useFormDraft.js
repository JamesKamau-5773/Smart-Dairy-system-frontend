import { useCallback, useEffect, useRef, useState } from 'react';
import { readActiveSession } from '../lib/sessionStore';

const DRAFT_PREFIX = 'maziwa_draft';
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function draftStorageKey(formKey) {
  const session = readActiveSession();
  const userId = session?.id ?? session?.user_id ?? null;
  if (!userId) return null;
  return `${DRAFT_PREFIX}:${userId}:${session?.farm_id ?? ''}:${formKey}`;
}

export function readDraft(formKey) {
  const key = draftStorageKey(formKey);
  if (!key) return null;
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!stored?.values || Date.now() - stored.savedAt > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return stored.values;
  } catch {
    return null;
  }
}

export function writeDraft(formKey, values) {
  const key = draftStorageKey(formKey);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    // Storage full or blocked: drafts are a convenience, the form still works.
  }
}

export function removeDraft(formKey) {
  const key = draftStorageKey(formKey);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore blocked storage.
  }
}

/**
 * Keeps what a farmer is typing on this phone, so a reload, crash or forced sign-out doesn't
 * lose it. Restores the draft once when the form opens, saves while typing, and forgets it
 * once the form is empty again (after a save resets it) or `clearDraft` is called.
 *
 * Declare it after any effect that resets the form on open, so the restore runs last.
 */
export function useFormDraft(formKey, values, setValues, { enabled = true, isEmpty, onRestore } = {}) {
  // Read once, on the first render, so the "restored" notice doesn't need an extra state update.
  const [draftAtOpen] = useState(() => (enabled ? readDraft(formKey) : null));
  const [dismissed, setDismissed] = useState(false);
  const hasDraft = Boolean(draftAtOpen && !isEmpty(draftAtOpen));
  const hasRestored = useRef(false);

  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;
    if (hasDraft) {
      setValues((current) => ({ ...current, ...draftAtOpen }));
      onRestore?.();
    }
    // Runs once, after the form's own open/reset effects, so the draft is applied last.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled || !hasRestored.current) return;
    if (isEmpty(values)) {
      removeDraft(formKey);
      return;
    }
    const timer = setTimeout(() => writeDraft(formKey, values), 300);
    return () => clearTimeout(timer);
  }, [enabled, formKey, isEmpty, values]);

  const clearDraft = useCallback(() => {
    removeDraft(formKey);
    setDismissed(true);
  }, [formKey]);

  // Once the form is empty again (saved and reset, or started over) the notice no longer applies.
  return { restored: hasDraft && !dismissed && !isEmpty(values), clearDraft, dismissRestored: () => setDismissed(true) };
}
