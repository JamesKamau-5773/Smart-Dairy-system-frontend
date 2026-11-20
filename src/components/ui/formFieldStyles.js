/*
 * The one look for form fields across the app (classes and aria helpers; the components are in
 * FormField.jsx). Raw <input>/<select>/<textarea> elements use FIELD_CONTROL for the same look.
 */

/** The standard class for a text input, select or textarea. Add layout classes only (margins, width). */
export const FIELD_CONTROL = 'input-machined w-full text-control';
/** The same style, small: a unit picker beside a number, or a value inside a table row. */
export const FIELD_CONTROL_COMPACT = 'input-machined w-auto px-2 py-1.5 text-control';
/** A field's name above its control. */
export const FIELD_LABEL = 'block text-field-label text-ink-muted';
/** Helper text under a control. */
export const FIELD_HINT = 'block text-meta text-ink-muted';

/** `aria-invalid` and `aria-describedby` for a control with a hint and/or an error. */
export function fieldDescriptionProps(id, { hint, error } = {}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ');
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  };
}
