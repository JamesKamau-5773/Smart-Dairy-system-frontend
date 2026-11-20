import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/backendApi';
import { describePasswordError } from '../../lib/profileErrors';
import { normalizeKenyanPhone } from '../../lib/phone';
import { accountCopy } from '../../i18n/account';
import { PasswordField } from '../auth/AuthFields';
import PasswordStrength from '../auth/PasswordStrength';
import AlertBanner from '../ui/AlertBanner';

const copy = accountCopy.password;
const EMPTY = { current_password: '', new_password: '', confirm_password: '' };

/**
 * Change the password, or set one for an account that signs in with Google only
 * (`account_flags.has_password` false: no current password asked). On success every other
 * session is signed out and this one gets a fresh token (`onChanged` stores it).
 *
 * @param {object} props
 * @param {object} props.profile The account from GET /auth/me.
 * @param {boolean} props.hasPassword
 * @param {boolean} props.readOnly Demo sessions: the form is disabled.
 * @param {(session: object) => Promise<void>} props.onChanged
 */
export default function ProfilePassword({ profile, hasPassword, readOnly, onChanged }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);

  const change = useMutation({
    mutationFn: (payload) => authApi.changePassword(payload),
    onSuccess: async (session) => {
      await onChanged(session);
      setForm(EMPTY);
      toast.success(hasPassword ? copy.changed : copy.set);
    },
    onError: (error) => {
      if (describePasswordError(error).resetRequired) navigate('/reset-required-password', { replace: true });
    },
  });

  const errors = change.error
    ? describePasswordError(change.error)
    : { fields: {}, violations: [], general: null };
  const update = (field) => (event) => {
    if (change.isError) change.reset();
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  // Checked here first, so nothing is sent until the form is complete; the backend checks again.
  const submit = (event) => {
    event.preventDefault();
    if ((hasPassword && !form.current_password) || !form.new_password || !form.confirm_password) return;
    change.mutate(hasPassword ? form : { ...form, current_password: '' });
  };

  const incomplete = (hasPassword && !form.current_password) || !form.new_password || !form.confirm_password;
  const mismatch = form.confirm_password && form.new_password !== form.confirm_password;

  return (
    <section aria-labelledby="profile-password-title" className="rounded-card border border-ink/10 bg-card">
      <header className="border-b border-ink/10 px-5 py-4">
        <h2 id="profile-password-title" className="text-section-title text-ink">{hasPassword ? copy.changeTitle : copy.setTitle}</h2>
        {!hasPassword && <p className="mt-1 text-body text-ink-muted">{copy.setIntro}</p>}
      </header>
      <form onSubmit={submit} noValidate className="space-y-5 px-5 py-5">
        <fieldset disabled={readOnly || change.isPending} className="space-y-5 disabled:opacity-70">
          {errors.general && <AlertBanner type="danger" message={errors.general} />}
          {hasPassword && (
            <PasswordField
              id="profile-current-password"
              label={copy.current}
              autoComplete="current-password"
              value={form.current_password}
              onChange={update('current_password')}
              error={errors.fields.current_password}
            />
          )}
          <PasswordField
            id="profile-new-password"
            label={copy.new}
            autoComplete="new-password"
            value={form.new_password}
            onChange={update('new_password')}
            error={errors.fields.new_password}
          >
            <PasswordStrength
              password={form.new_password}
              personal={{ phone: normalizeKenyanPhone(profile?.phone_number), email: profile?.email ?? '' }}
              serverViolations={errors.violations}
            />
          </PasswordField>
          <PasswordField
            id="profile-confirm-password"
            label={copy.confirm}
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={update('confirm_password')}
            error={errors.fields.confirm_password ?? (mismatch ? copy.errors.mismatch : undefined)}
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-command" disabled={incomplete || mismatch}>
              {change.isPending ? copy.saving : hasPassword ? copy.submitChange : copy.submitSet}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
