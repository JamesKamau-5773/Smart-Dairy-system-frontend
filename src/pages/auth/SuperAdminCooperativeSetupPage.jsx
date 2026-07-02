import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, UserRound, UserRoundPlus } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import InviteClaimPreview from '../../components/auth/InviteClaimPreview';
import { onboardingApi } from '../../lib/backendApi';

const panelClassName = 'rounded-2xl border border-ink/10 bg-white/90 shadow-[0_18px_55px_rgba(31,59,47,0.12)] backdrop-blur';
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

  const cooperativeId = useMemo(() => extractCooperativeId(cooperative), [cooperative]);

  const handleCreateCooperative = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    setIsSavingCooperative(true);

    try {
      const payload = {
        cooperative_name: cooperativeForm.cooperative_name.trim(),
        contact_phone: cooperativeForm.contact_phone.trim(),
      };
      const created = await onboardingApi.createCooperative(payload);
      setCooperative(created);
      setMessage({ type: 'success', text: 'Cooperative created. Add the first admin invite next.' });
    } catch (error) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
      setMessage({ type: 'danger', text: serverMessage || 'Failed to create cooperative.' });
    } finally {
      setIsSavingCooperative(false);
    }
  };

  const handleFirstAdminInvite = async (event) => {
    event.preventDefault();

    if (!cooperativeId) {
      setMessage({ type: 'danger', text: 'Create a cooperative first before inviting the initial admin.' });
      return;
    }

    setMessage({ type: '', text: '' });
    setIsSendingInvite(true);

    try {
      const payload = {
        full_name: adminForm.full_name.trim(),
        email: adminForm.email.trim(),
        phone_number: adminForm.phone_number.trim(),
        role: 'COOP_ADMIN',
      };

      await onboardingApi.createFirstAdmin(cooperativeId, payload);
      setAdminForm({ full_name: '', email: '', phone_number: '', role: 'COOP_ADMIN' });
      setMessage({ type: 'success', text: 'First cooperative admin invite sent.' });
    } catch (error) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
      setMessage({ type: 'danger', text: serverMessage || 'Failed to send first admin invite.' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-10rem)] w-full rounded-2xl border border-ink/10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_34%),linear-gradient(145deg,#fbfaf4_0%,#edf7e8_44%,#e8f5f6_100%)] p-4 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <section className={`${panelClassName} p-6`}>
          <SectionHeader
            eyebrow="Platform Setup"
            title="Create Cooperative"
            description="Super admins can provision a cooperative workspace and immediately establish ownership through an initial admin invite."
          />

          <form onSubmit={handleCreateCooperative} className="space-y-4">
            <FormField label="Cooperative Name">
              <input
                className={inputClassName}
                value={cooperativeForm.cooperative_name}
                onChange={(event) => setCooperativeForm((prev) => ({ ...prev, cooperative_name: event.target.value }))}
                placeholder="Green Rift Dairy Cooperative"
                required
              />
            </FormField>

            <FormField label="Contact Phone">
              <div className="relative mt-2">
                <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  className={`${inputClassName} mt-0 pl-10`}
                  value={cooperativeForm.contact_phone}
                  onChange={(event) => setCooperativeForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
                  placeholder="+254712345678"
                  required
                />
              </div>
            </FormField>

            <button type="submit" className="btn-command w-full" disabled={isSavingCooperative}>
              {isSavingCooperative ? 'Creating cooperative…' : 'Create cooperative'}
            </button>
          </form>
        </section>

        <section className={`${panelClassName} p-6`}>
          <SectionHeader
            eyebrow="Step 2"
            title="Invite First Admin"
            description="Send a claim invite so the cooperative admin sets their own password via the claim-account flow."
            accent="secondary"
          />

          <form onSubmit={handleFirstAdminInvite} className="space-y-4">
            <FormField label="Full Name">
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

            <FormField label="Email">
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

            <FormField label="Phone">
              <input
                className={inputClassName}
                value={adminForm.phone_number}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                placeholder="+254700111222"
              />
            </FormField>

            <InviteClaimPreview
              title="First Admin Claim Preview"
              description="Preview the claim link that will be used for the first cooperative admin before you send the invite."
            />

            <button type="submit" className="btn-command w-full" disabled={isSendingInvite || !cooperativeId}>
              {isSendingInvite ? 'Sending invite…' : 'Send admin claim invite'}
            </button>

            {!cooperativeId && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Create a cooperative first to unlock admin invite.
              </p>
            )}
          </form>
        </section>
      </div>

      {message.text && (
        <div className="mx-auto mt-6 max-w-6xl">
          <AlertBanner type={message.type || 'info'} title="Onboarding status" message={message.text} onDismiss={() => setMessage({ type: '', text: '' })} />
        </div>
      )}

      <div className="mx-auto mt-6 max-w-6xl rounded-xl border border-ink/10 bg-white/75 p-4 text-sm text-ink-muted shadow-sm backdrop-blur">
        Next: cooperative admins continue member onboarding in
        {' '}
        <Link to="/cooperative-admin/members" className="font-semibold text-brand underline underline-offset-4">
          cooperative admin onboarding
        </Link>
        .
      </div>
    </div>
  );
}
