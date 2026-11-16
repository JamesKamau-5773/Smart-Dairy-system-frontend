import { feedCopy } from '../i18n/feed';

// The backend's feeding groups, in the order farmers think about them.
export const FEEDING_GROUPS = Object.freeze(
  ['lactating', 'dry', 'calf_0_3m', 'calf_3_6m', 'heifer']
    .map((value) => Object.freeze({ value, get label() { return feedCopy.groups[value]; } })),
);

/** "calf_0_3m" -> "Calves 0-3 months"; unknown groups fall back to readable text. */
export function feedingGroupLabel(value) {
  return feedCopy.groups[value] ?? String(value ?? '').replaceAll('_', ' ');
}
