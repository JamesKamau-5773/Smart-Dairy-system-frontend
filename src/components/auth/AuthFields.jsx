import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authCopy } from '../../i18n/auth';
import { formatKenyanPhoneInput } from '../../lib/phone';

const describedBy = (id, hint, error) => [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;

function FieldShell({ id, label, hint, error, footer, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-field-label text-ink-900">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="text-body text-danger">{error}</p>}
      {hint && <p id={`${id}-hint`} className="text-meta text-ink-muted">{hint}</p>}
      {footer}
    </div>
  );
}

/** Labelled input with an inline error that screen readers announce with the field. */
export const TextField = forwardRef(function TextField({ id, label, hint, error, className = '', ...inputProps }, ref) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`input-machined text-control ${error ? 'border-danger' : ''} ${className}`}
        {...inputProps}
      />
    </FieldShell>
  );
});

/** Kenyan mobile number input: phone keypad, formats as typed, accepts 07… and +254…. */
export const PhoneField = forwardRef(function PhoneField({
  label = authCopy.fields.phone,
  hint = authCopy.fields.phoneHint,
  placeholder = authCopy.fields.phonePlaceholder,
  className = '',
  onValueChange,
  ...inputProps
}, ref) {
  const handleChange = (event) => onValueChange(formatKenyanPhoneInput(event.target.value));

  return (
    <TextField
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      label={label}
      hint={hint}
      placeholder={placeholder}
      className={`tabular-nums ${className}`}
      onChange={handleChange}
      {...inputProps}
    />
  );
});

export const PasswordField = forwardRef(function PasswordField({ id, label = authCopy.fields.password, hint, error, children, ...inputProps }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} footer={children}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`input-machined pr-14 text-control ${error ? 'border-danger' : ''}`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="btn-ghost absolute right-1 top-1/2 h-11 w-11 !min-h-0 -translate-y-1/2 border-transparent !p-0"
          aria-label={visible ? authCopy.fields.hidePassword : authCopy.fields.showPassword}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </FieldShell>
  );
});
