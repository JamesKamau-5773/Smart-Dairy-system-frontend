// The backend's feeding groups, in the order farmers think about them.
export const FEEDING_GROUPS = Object.freeze([
  { value: 'lactating', label: 'Lactating cows' },
  { value: 'dry', label: 'Dry cows' },
  { value: 'calf_0_3m', label: 'Calves 0-3 months' },
  { value: 'calf_3_6m', label: 'Calves 3-6 months' },
  { value: 'heifer', label: 'Heifers' },
]);

const LABELS = Object.fromEntries(FEEDING_GROUPS.map(({ value, label }) => [value, label]));

/** "calf_0_3m" -> "Calves 0-3 months"; unknown groups fall back to readable text. */
export function feedingGroupLabel(value) {
  return LABELS[value] ?? String(value ?? '').replaceAll('_', ' ');
}
