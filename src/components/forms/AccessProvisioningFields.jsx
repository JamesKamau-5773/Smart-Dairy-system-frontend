import { useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { ACCESS_MODES, generateSecurePassword } from '../../lib/staffAccessForm';
import { FARM_STAFF_ROLE_OPTIONS } from '../../lib/staffOnboarding';

const MODE_OPTIONS = [
  { value: ACCESS_MODES.NONE, label: 'No access' },
  { value: ACCESS_MODES.INVITE, label: 'Send invitation' },
  { value: ACCESS_MODES.PROVISION, label: 'Provision directly' },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const availableModes = allowNoAccess ? MODE_OPTIONS : MODE_OPTIONS.slice(1);

  const handleGeneratePassword = () => {
    onPasswordChange(generateSecurePassword());
    setShowPassword(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex border-b border-ink-200" role="tablist" aria-label="App access method">
        {availableModes.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={mode === option.value}
            onClick={() => onModeChange(option.value)}
            className={`min-h-11 flex-1 border-b-[3px] px-2 py-2 text-xs font-bold transition-colors ${
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
        <p className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">Create the HR and payroll record only. App access can be granted later from the key action.</p>
      ) : (
        <>
          <label className="block text-xs font-bold text-ink-700">
            System role
            <select value={role} onChange={(event) => onRoleChange(event.target.value)} className="input-machined mt-2 w-full">
              {FARM_STAFF_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <span className="mt-2 block font-normal leading-5 text-ink-500">
              {FARM_STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.description}
            </span>
          </label>

          {mode === ACCESS_MODES.INVITE && (
            <p className="rounded-md border border-brand/20 bg-brand-50 px-4 py-3 text-sm leading-6 text-ink-700">The backend will issue a time-limited, single-use claim link for this employee.</p>
          )}

          {mode === ACCESS_MODES.PROVISION && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-ink-700">
                Login phone number
                <input value={phoneNumber || 'No phone number recorded'} readOnly className="input-machined mt-2 w-full bg-ink-100 text-ink-600" />
                {!phoneNumber && <span className="mt-1.5 block font-normal text-danger">Add a valid phone number before provisioning access.</span>}
              </label>

              <label className="block text-xs font-bold text-ink-700">
                Temporary password
                <div className="relative mt-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    autoComplete="new-password"
                    className="input-machined w-full pr-11 font-mono tabular-nums"
                    aria-invalid={Boolean(errors.password)}
                  />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-ink-500" aria-label={showPassword ? 'Hide temporary password' : 'Show temporary password'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.password && <span className="mt-1.5 block font-normal text-danger">{errors.password}</span>}
              </label>

              <button type="button" onClick={handleGeneratePassword} className="inline-flex items-center gap-2 text-xs font-bold text-brand hover:text-brand-dark">
                <RefreshCw size={14} /> Generate secure password
              </button>

              <label className="flex items-start gap-3 rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
                <input type="checkbox" checked readOnly className="mt-0.5 h-4 w-4 accent-brand" />
                <span><strong className="block text-ink-800">Require password change on first login</strong>The employee cannot enter the workspace until they set a private password.</span>
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}