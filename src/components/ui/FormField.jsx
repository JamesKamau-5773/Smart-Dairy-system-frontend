import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL, fieldDescriptionProps } from './formFieldStyles';

/*
 * The one look for form fields across the app: a label above the control, the control in the
 * standard field style (`input-machined`, src/index.css), then an error or hint below it.
 * Raw <input>/<select>/<textarea> elements use FIELD_CONTROL (formFieldStyles.js) for the same look.
 */

/**
 * Label, control, error and hint, stacked. Pass the control as children, with
 * `fieldDescriptionProps(id, { hint, error })` on it.
 *
 * @param {object} props
 * @param {string} props.id The control's id.
 * @param {import('react').ReactNode} [props.label]
 * @param {import('react').ReactNode} [props.hint]
 * @param {string} [props.error]
 * @param {import('react').ReactNode} [props.footer] Anything under the field (e.g. a strength meter).
 * @param {string} [props.className] Placement only.
 */
export function FormField({ id, label, hint, error, footer, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label htmlFor={id} className={FIELD_LABEL}>{label}</label>}
      {children}
      {error && <p id={`${id}-error`} className="text-body text-danger">{error}</p>}
      {hint && <p id={`${id}-hint`} className={FIELD_HINT}>{hint}</p>}
      {footer}
    </div>
  );
}

const controlClass = (error, className) => cn(FIELD_CONTROL, error && 'border-danger', className);

/** A labelled text input (any input type except checkbox and radio). */
export const TextField = forwardRef(function TextField(
  { id, label, hint, error, footer, className, fieldClassName, ...inputProps },
  ref,
) {
  return (
    <FormField id={id} label={label} hint={hint} error={error} footer={footer} className={fieldClassName}>
      <input ref={ref} id={id} {...fieldDescriptionProps(id, { hint, error })} className={controlClass(error, className)} {...inputProps} />
    </FormField>
  );
});

/** A labelled select; pass the <option>s as children. */
export const SelectField = forwardRef(function SelectField(
  { id, label, hint, error, footer, className, fieldClassName, children, ...selectProps },
  ref,
) {
  return (
    <FormField id={id} label={label} hint={hint} error={error} footer={footer} className={fieldClassName}>
      <select ref={ref} id={id} {...fieldDescriptionProps(id, { hint, error })} className={controlClass(error, className)} {...selectProps}>
        {children}
      </select>
    </FormField>
  );
});

/** A labelled multi-line text box. */
export const TextAreaField = forwardRef(function TextAreaField(
  { id, label, hint, error, footer, className, fieldClassName, rows = 3, ...textareaProps },
  ref,
) {
  return (
    <FormField id={id} label={label} hint={hint} error={error} footer={footer} className={fieldClassName}>
      <textarea ref={ref} id={id} rows={rows} {...fieldDescriptionProps(id, { hint, error })} className={controlClass(error, className)} {...textareaProps} />
    </FormField>
  );
});
