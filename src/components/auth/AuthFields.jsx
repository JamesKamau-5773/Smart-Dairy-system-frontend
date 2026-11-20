import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authCopy } from '../../i18n/auth';
import { formatKenyanPhoneInput } from '../../lib/phone';
import { FormField, TextField } from '../ui/FormField';
import { FIELD_CONTROL, fieldDescriptionProps } from '../ui/formFieldStyles';

// The app-wide field (components/ui/FormField), used by the sign-in screens too.
export { TextField };

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
    <FormField id={id} label={label} hint={hint} error={error} footer={children}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          {...fieldDescriptionProps(id, { hint, error })}
          className={`${FIELD_CONTROL} pr-14 ${error ? 'border-danger' : ''}`}
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
    </FormField>
  );
});
