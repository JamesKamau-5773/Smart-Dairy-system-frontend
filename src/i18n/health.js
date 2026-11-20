import { localizedCopy } from './locale';
import { healthCopy as en } from './health.en';
import { healthCopy as sw } from './health.sw';
import { enumLabel } from '../lib/enumLabel';

/** Medical records and milk drop text in the current language (see health.en.js for the keys). */
export const healthCopy = localizedCopy({ en, sw });

/** A saved severity ("High") or treatment status ("Closed") in the current language; others humanised. */
export const severityLabel = (value) => (value == null || value === '' ? '—' : enumLabel(healthCopy.severities, value));
export const treatmentStatusLabel = (value) => (value == null || value === '' ? '—' : enumLabel(healthCopy.statuses, value));
