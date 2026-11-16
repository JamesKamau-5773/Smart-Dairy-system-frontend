import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, UserRound, UserRoundPlus } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import InviteClaimPreview from '../../components/auth/InviteClaimPreview';
import { getApiErrorMessage, onboardingApi } from '../../lib/backendApi';
import { formatKenyanPhoneInput, normalizeKenyanPhone } from '../../lib/phone';
import { authCopy } from '../../i18n/auth';
import FieldError from '../../components/ui/FieldError';
import { fieldErrorProps } from '../../components/ui/fieldErrorProps';
import { adminCopy } from '../../i18n/admin';

const copy = adminCopy.coopSetup;

const panelClassName = 'rounded-2xl border border-ink/10 bg-white/90  backdrop-blur';
const inputClassName = 'mt-2 w-full rounded-lg border border-ink/10 bg-[#fbfcfa] px-4 py-3 text-sm text-ink-strong outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';

const extractCooperativeId = (response) => (
  response?.cooperative_id
  ?? response?.cooperativeId
  ?? response?.tenant_id
  ?? response?.tenantId
  ?? response?.id
  ?? null
);

function SectionHeader({ eyebrow, title, description, accent = 'brand' }) {
  const accentClass = accent === 'secondary' ? 'bg-accent/10 text-accent' : 'bg-brand/10 text-brand';

  return (
    <header className="mb-6">
      <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${accentClass}`}>
        <Building2 size={14} /> {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-ink-strong">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
    </header>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
      {label}
      {children}
    </label>
  );
}

export default function SuperAdminCooperativeSetupPage() {
  const [cooperativeForm, setCooperativeForm] = useState({
    cooperative_name: '',
    contact_phone: '',
  });
  const [adminForm, setAdminForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    role: 'COOP_ADMIN',
  });
  const [isSavingCooperative, setIsSavingCooperative] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [cooperative, setCooperative] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [phoneErrors, setPhoneErrors] = useState({});

  const cooperativeId = useMemo(() => extractCooperativeId(cooperative), [cooperative]);

  const handleCreateCooperative = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    const contactPhone = normalizeKenyanPhone(cooperativeForm.contact_phone);
    if (!contactPhone) {
      setPhoneErrors((current) => ({ ...current, contact: authCopy.fields.phoneInvalid }));
      return;
    }
    setIsSavingCooperative(true);

    try {
      const payload = {
        cooperative_name: cooperativeForm.cooperative_name.trim(),
        contact_phone: contactPhone,
      };
      const created = await onboardingApi.createCooperative(payload);
      setCooperative(created);
      setMessage({ type: 'success', text: copy.created });
    } catch (error) {
      setMessage({ type: 'danger', text: getApiErrorMessage(error, copy.createFailed) });
    } finally {
      setIsSavingCooperative(false);
    }
  };

  const handleFirstAdminInvite = async (event) => {
    event.preventDefault();

    if (!cooperativeId) {
      setMessage({ type: 'danger', text: copy.needCoop });
      return;
    }

    setMessage({ type: '', text: '' });
    // The admin's phone is optional; when given it must be a Kenyan mobile.
    const adminPhone = normalizeKenyanPhone(adminForm.phone_number);
    if (adminForm.phone_number.trim() && !adminPhone) {
      setPhoneErrors((current) => ({ ...current, admin: authCopy.fields.phoneInvalid }));
      return;
    }
    setIsSendingInvite(true);

    try {
      const payload = {
        full_name: adminForm.full_name.trim(),
        email: adminForm.email.trim(),
        ...(adminPhone ? { phone_number: adminPhone } : {}),
        role: 'COOP_ADMIN',
      };

      await onboardingApi.createFirstAdmin(cooperativeId, payload);
      setAdminForm({ full_name: '', email: '', phone_number: '', role: 'COOP_ADMIN' });
      setMessage({ type: 'success', text: copy.inviteSent });
    } catch (error) {
      setMessage({ type: 'danger', text: getApiErrorMessage(error, copy.inviteFailed) });
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-10rem)] w-full rounded-2xl border border-ink/10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_34%),linear-gradient(145deg,#fbfaf4_0%,#edf7e8_44%,#e8f5f6_100%)] p-4 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <section className={`${panelClassName} p-6`}>
          <SectionHeader
            eyebrow={copy.platformSetup}
            title={copy.createTitle}
            description={copy.createText}
          />

          <form onSubmit={handleCreateCooperative} className="space-y-4">
            <FormField label={copy.coopName}>
              <input
                className={inputClassName}
                value={cooperativeForm.cooperative_name}
                onChange={(event) => setCooperativeForm((prev) => ({ ...prev, cooperative_name: event.target.value }))}
                placeholder="Green Rift Dairy Cooperative"
                required
              />
            </FormField>

            <FormField label={copy.contactPhone}>
              <div className="relative mt-2">
                <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  id="cooperative-contact-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={`${inputClassName} mt-0 pl-10`}
                  value={cooperativeForm.contact_phone}
                  onChange={(event) => {
                    setPhoneErrors((current) => ({ ...current, contact: undefined }));
                    setCooperativeForm((prev) => ({ ...prev, contact_phone: formatKenyanPhoneInput(event.target.value) }));
                  }}
                  placeholder={authCopy.fields.phonePlaceholder}
                  required
                  {...fieldErrorProps('cooperative-contact-phone', phoneErrors.contact)}
                />
              </div>
              <FieldError id="cooperative-contact-phone" message={phoneErrors.contact} />
            </FormField>

            <button type="submit" className="btn-command w-full" disabled={isSavingCooperative}>
              {isSavingCooperative ? copy.creating : copy.create}
            </button>
          </form>
        </section>

        <section className={`${panelClassName} p-6`}>
          <SectionHeader
            eyebrow={copy.step2}
            title={copy.inviteTitle}
            description={copy.inviteText}
            accent="secondary"
          />

          <form onSubmit={handleFirstAdminInvite} className="space-y-4">
            <FormField label={copy.fullName}>
              <div className="relative mt-2">
                <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  className={`${inputClassName} mt-0 pl-10`}
                  value={adminForm.full_name}
                  onChange={(event) => setAdminForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  placeholder="Amina Wanjiru"
                  required
                />
              </div>
            </FormField>

            <FormField label={copy.email}>
              <div className="relative mt-2">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="email"
                  className={`${inputClassName} mt-0 pl-10`}
                  value={adminForm.email}
                  onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="admin@greenrift.coop"
                  required
                />
              </div>
            </FormField>

            <FormField label={copy.phone}>
              <input
                id="cooperative-admin-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={inputClassName}
                value={adminForm.phone_number}
                onChange={(event) => {
                  setPhoneErrors((current) => ({ ...current, admin: undefined }));
                  setAdminForm((prev) => ({ ...prev, phone_number: formatKenyanPhoneInput(event.target.value) }));
                }}
                placeholder={authCopy.fields.phonePlaceholder}
                {...fieldErrorProps('cooperative-admin-phone', phoneErrors.admin)}
              />
              <FieldError id="cooperative-admin-phone" message={phoneErrors.admin} />
            </FormField>

            <InviteClaimPreview
              title={copy.previewTitle}
              description={copy.previewText}
            />

            <button type="submit" className="btn-command w-full" disabled={isSendingInvite || !cooperativeId}>
              {isSendingInvite ? copy.sending : copy.send}
            </button>

            {!cooperativeId && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {copy.unlockHint}
              </p>
            )}
          </form>
        </section>
      </div>

      {message.text && (
        <div className="mx-auto mt-6 max-w-6xl">
          <AlertBanner type={message.type || 'info'} title={copy.statusTitle} message={message.text} onDismiss={() => setMessage({ type: '', text: '' })} />
        </div>
      )}

      <div className="mx-auto mt-6 max-w-6xl rounded-xl border border-ink/10 bg-white/75 p-4 text-sm text-ink-muted  backdrop-blur">
        {copy.nextBefore}
        <Link to="/cooperative-admin/members" className="font-semibold text-brand underline underline-offset-4">
          {copy.nextLink}
        </Link>
        {copy.nextAfter}
      </div>
    </div>
  );
}
