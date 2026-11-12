import { localizedCopy } from './locale';
import { healthCopy as en } from './health.en';
import { healthCopy as sw } from './health.sw';

/** Medical records and milk drop text in the current language (see health.en.js for the keys). */
export const healthCopy = localizedCopy({ en, sw });

/** A saved severity ("High") or treatment status ("Closed") in the current language; others as saved. */
export const severityLabel = (value) => healthCopy.severities[value] ?? value ?? '—';
export const treatmentStatusLabel = (value) => healthCopy.statuses[value] ?? value ?? '—';
