import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/backendApi';
import { getAccountFlags } from '../../lib/authState';
import { changedFields, describeProfileError } from '../../lib/profileErrors';
import { accountCopy } from '../../i18n/account';
import { PhoneField, TextField } from '../auth/AuthFields';
import AlertBanner from '../ui/AlertBanner';

const copy = accountCopy.details;
const FIELDS = ['name', 'phone_number', 'email', 'farm_location'];
const formFrom = (profile) => Object.fromEntries(FIELDS.map((field) => [field, profile?.[field] ?? '']));

function VerifiedBadge({ verified }) {
  if (verified == null) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-badge ${
      verified ? 'border-success/25 bg-success/10 text-success' : 'border-warning-500/30 bg-warning-50 text-warning-700'
    }`}
    >
      {verified ? copy.verified : copy.unverified}
    </span>
  );
}

function Row({ label, children, action }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-meta text-ink-muted">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-2 text-body-strong text-ink sm:justify-end">
        {children}
        {action}
      </dd>
    </div>
  );
}

/**
 * The person's own details: shown as a list, edited in place. Every value is the backend's;
 * a save sends only what changed and the page then re-reads the account (`onSaved`).
 *
 * @param {object} props
 * @param {object} props.profile The account from GET /auth/me.
 * @param {boolean} props.readOnly Demo sessions: no editing.
 * @param {() => Promise<void>} props.onSaved
 */
export default function ProfileDetails({ profile, readOnly, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => formFrom(profile));
  const flags = getAccountFlags(profile);

  const save = useMutation({
    mutationFn: (changes) => authApi.updateProfile(changes),
    onSuccess: async (data, changes) => {
      await onSaved();
      setEditing(false);
      if (changes.email) toast.success(copy.emailChanged(changes.email));
      else toast.success(copy.saved);
    },
  });
  const sendEmailLink = useMutation({
    mutationFn: () => authApi.sendEmailVerification(),
    onSuccess: () => toast.success(copy.emailLinkSent(profile.email)),
    onError: () => toast.error(copy.emailLinkFailed),
  });

  const errors = save.error ? describeProfileError(save.error) : { fields: {}, general: null };
  const update = (field, value) => {
    if (save.isError) save.reset();
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEditing = () => {
    save.reset();
    setForm(formFrom(profile));
    setEditing(true);
  };

  const submit = (event) => {
    event.preventDefault();
    const changes = changedFields(form, profile);
    if (!Object.keys(changes).length) {
      setEditing(false);
      toast(copy.nothingChanged);
      return;
    }
    save.mutate(changes);
  };

  const notSet = <span className="text-body text-ink-muted">{copy.notSet}</span>;

  return (
    <section aria-labelledby="profile-details-title" className="rounded-card border border-ink/10 bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
        <h2 id="profile-details-title" className="text-section-title text-ink">{copy.title}</h2>
        {!editing && !readOnly && (
          <button type="button" onClick={startEditing} className="btn-ghost">{copy.edit}</button>
        )}
      </header>

      {editing ? (
        <form onSubmit={submit} noValidate className="space-y-5 px-5 py-5">
          {errors.general && <AlertBanner type="danger" message={errors.general} />}
          <TextField
            id="profile-name"
            label={copy.name}
            autoComplete="name"
            maxLength={120}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            error={errors.fields.name}
          />
          <PhoneField
            id="profile-phone"
            label={copy.phone}
            hint={copy.phoneHint}
            value={form.phone_number}
            onValueChange={(value) => update('phone_number', value)}
            error={errors.fields.phone_number}
          />
          <TextField
            id="profile-email"
            label={copy.email}
            hint={copy.emailHint}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            error={errors.fields.email}
          />
          <TextField
            id="profile-location"
            label={copy.farmLocation}
            placeholder={copy.farmLocationPlaceholder}
            maxLength={150}
            value={form.farm_location}
            onChange={(event) => update('farm_location', event.target.value)}
            error={errors.fields.farm_location}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost" disabled={save.isPending}>{copy.cancel}</button>
            <button type="submit" className="btn-command" disabled={save.isPending}>{save.isPending ? copy.saving : copy.save}</button>
          </div>
        </form>
      ) : (
        <dl className="divide-y divide-ink/5 px-5">
          <Row label={copy.name}>{profile.name || notSet}</Row>
          {profile.username && <Row label={copy.username}><span className="break-all">{profile.username}</span></Row>}
          <Row
            label={copy.phone}
            action={profile.phone_number && flags.phone_verified === false && !readOnly
              ? <Link to="/verify-phone" className="text-control text-brand underline-offset-4 hover:underline">{copy.verifyPhone}</Link>
              : null}
          >
            {profile.phone_number ? <span className="tabular-nums">{profile.phone_number}</span> : notSet}
            {profile.phone_number && <VerifiedBadge verified={flags.phone_verified} />}
          </Row>
          <Row
            label={copy.email}
            action={profile.email && flags.email_verified === false && !readOnly ? (
              <button
                type="button"
                onClick={() => sendEmailLink.mutate()}
                disabled={sendEmailLink.isPending}
                className="text-control text-brand underline-offset-4 hover:underline disabled:opacity-60"
              >
                {sendEmailLink.isPending ? copy.sendingEmailLink : copy.sendEmailLink}
              </button>
            ) : null}
          >
            {profile.email ? <span className="break-all">{profile.email}</span> : notSet}
            {profile.email && <VerifiedBadge verified={flags.email_verified} />}
          </Row>
          <Row label={copy.farmLocation}>{profile.farm_location || notSet}</Row>
        </dl>
      )}
    </section>
  );
}
