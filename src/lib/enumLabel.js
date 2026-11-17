// Display text for a backend enum value (a status, a type) in the chosen language.
// The strings live in the en/sw copy files, keyed by the value the backend sends; a value
// with no string yet reads as a sentence ("ON_HOLD" → "On hold") rather than raw, so the
// screen never needs CSS `capitalize`.

/** "ON_HOLD", "on-hold" or "on hold" → "On hold". Empty for a missing value. */
export function humanizeEnum(value) {
  const words = String(value ?? '').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

/** The string for `value` in `labels`, else the humanised value. */
export function enumLabel(labels, value) {
  if (value == null || value === '') return '';
  return labels?.[value] ?? humanizeEnum(value);
}
