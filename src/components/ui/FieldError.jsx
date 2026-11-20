/**
 * A field's error under its input, in the same style as the sign-in forms. Renders nothing
 * without a message. Pair it with `fieldErrorProps(id, message)` on the input so screen readers
 * read the error with the field.
 *
 * @param {object} props
 * @param {string} props.id The input's id; the message gets `${id}-error`.
 * @param {string} [props.message]
 *
 * @example
 * <input id="amount" {...fieldErrorProps('amount', errorFor('amount'))} />
 * <FieldError id="amount" message={errorFor('amount')} />
 */
export default function FieldError({ id, message }) {
  if (!message) return null;
  // A span, so it can sit inside a <label> as well as after an input.
  return <span id={`${id}-error`} className="mt-1.5 block text-body text-danger">{message}</span>;
}
