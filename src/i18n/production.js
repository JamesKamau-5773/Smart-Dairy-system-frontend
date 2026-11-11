import { localizedCopy } from './locale';
import { productionCopy as en } from './production.en';
import { productionCopy as sw } from './production.sw';

/** Production Log text in the current language (see production.en.js for the keys). */
export const productionCopy = localizedCopy({ en, sw });

/** "morning" / "midday" / "Afternoon"… → the session's name in the current language. */
export function sessionLabel(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return productionCopy.sessions.unknown;
  if (normalized === 'midday') return productionCopy.sessions.afternoon;
  return productionCopy.sessions[normalized] ?? String(value);
}
