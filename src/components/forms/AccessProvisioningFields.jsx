import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ACCESS_MODES, generateSecurePassword } from '../../lib/staffAccessForm';
import { FARM_STAFF_ROLE_OPTIONS } from '../../lib/staffOnboarding';
import { staffCopy } from '../../i18n/staff';

// Labels are read when shown, so they follow the chosen language.
const MODE_OPTIONS = [ACCESS_MODES.NONE, ACCESS_MODES.INVITE, ACCESS_MODES.PROVISION]
  .map((value) => ({ value, get label() { return staffCopy.accessFields.modes[value]; } }));

export default function AccessProvisioningFields({
  mode,
  onModeChange,
  role,
  onRoleChange,
  phoneNumber,
  password,
  onPasswordChange,
  errors = {},
  allowNoAccess = false,
}) {
  const copy = staffCopy.accessFields;
  const [showPassword, setShowPassword] = useState(false);
  const availableModes = allowNoAccess ? MODE_OPTIONS : MODE_OPTIONS.slice(1);

  const handleGeneratePassword = () => {
    onPasswordChange(generateSecurePassword());
    setShowPassword(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex border-b border-ink-200" role="tablist" aria-label={copy.method}>
        {availableModes.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={mode === option.value}
            onClick={() => onModeChange(option.value)}
            className={`min-h-11 flex-1 border-b-[3px] px-2 py-2 text-control transition-colors ${
              mode === option.value
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === ACCESS_MODES.NONE ? (
        <p className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-body text-ink-600">{copy.noneHint}</p>
      ) : (
        <>
          <label className="block text-field-label text-ink-700">
            {copy.role}
            <select value={role} onChange={(event) => onRoleChange(event.target.value)} className="input-machined mt-2 w-full">
              {FARM_STAFF_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <span className="mt-2 block text-ink-500">
              {FARM_STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.description}
            </span>
          </label>

          {mode === ACCESS_MODES.INVITE && (
            <p className="rounded-md border border-brand/20 bg-brand-50 px-4 py-3 text-body text-ink-700">{copy.inviteHint}</p>
          )}

          {mode === ACCESS_MODES.PROVISION && (
            <div className="space-y-4">
              <label className="block text-field-label text-ink-700">
                {copy.loginPhone}
                <input value={phoneNumber || copy.noPhone} readOnly className="input-machined mt-2 w-full bg-ink-100 text-ink-600" />
                {!phoneNumber && <span className="mt-1.5 block text-danger">{copy.addPhone}</span>}
              </label>

              <label className="block text-field-label text-ink-700">
                {copy.password}
                <div className="relative mt-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    autoComplete="new-password"
                    className="input-machined w-full pr-11 tabular-nums"
                    aria-invalid={Boolean(errors.password)}
                  />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-ink-500" aria-label={showPassword ? copy.hidePassword : copy.showPassword}>
                    {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && <span className="mt-1.5 block text-danger">{errors.password}</span>}
              </label>

              <button type="button" onClick={handleGeneratePassword} className="inline-flex items-center text-control text-brand hover:text-brand-dark">

                {copy.generate}
              </button>

              <label className="flex items-start gap-3 rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-field-label text-ink-700">
                <input type="checkbox" checked readOnly className="mt-0.5 h-4 w-4 accent-brand" />
                <span><strong className="block text-ink-800">{copy.requireChange}</strong>{copy.requireChangeHint}</span>
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}
