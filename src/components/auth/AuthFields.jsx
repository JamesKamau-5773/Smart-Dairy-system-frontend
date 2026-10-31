import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const describedBy = (id, hint, error) => [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;

function FieldShell({ id, label, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink-900">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="text-sm font-medium text-danger">{error}</p>}
      {hint && <p id={`${id}-hint`} className="text-xs text-ink-muted">{hint}</p>}
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
        className={`input-machined text-base ${error ? 'border-danger' : ''} ${className}`}
        {...inputProps}
      />
    </FieldShell>
  );
});

export const PasswordField = forwardRef(function PasswordField({ id, label = 'Password', hint, error, ...inputProps }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`input-machined pr-14 text-base ${error ? 'border-danger' : ''}`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="btn-ghost absolute right-1 top-1/2 h-11 w-11 !min-h-0 -translate-y-1/2 border-transparent !p-0"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </FieldShell>
  );
});
