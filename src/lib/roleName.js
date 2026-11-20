import { shellCopy } from '../i18n/shell';
import { roleLabel } from './staffLabels';

/** A role in words ("Farm administrator") in the current language, never the backend's code. */
export function roleName(role) {
  const code = String(role ?? '').trim().toUpperCase();
  return shellCopy.header.roles[code] ?? roleLabel(code);
}
