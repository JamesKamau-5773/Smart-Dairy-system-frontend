/** `aria-invalid` and `aria-describedby` for an input with a FieldError (none when valid). */
export function fieldErrorProps(id, message) {
  return message ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {};
}
