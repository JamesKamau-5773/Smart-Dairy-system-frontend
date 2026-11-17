import { localizedCopy } from './locale';
import { herdCopy as en } from './herd.en';
import { herdCopy as sw } from './herd.sw';
import { enumLabel } from '../lib/enumLabel';

/** Herd text in the current language (see herd.en.js for the keys). */
export const herdCopy = localizedCopy({ en, sw });

/** A status the backend sent ("Lactating", "Dry"…) in the current language; unknown ones humanised. */
export function herdStatusLabel(status) {
  if (status == null || status === '') return '—';
  return enumLabel(herdCopy.statuses, status);
}

/** A pregnancy status the backend sent ("Pregnant", "Open"…) in the current language. */
export function pregnancyLabel(status) {
  if (status == null || status === '') return herdCopy.record.pregnancy.Unknown;
  return enumLabel(herdCopy.record.pregnancy, status);
}
