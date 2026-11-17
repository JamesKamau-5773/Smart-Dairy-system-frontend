import { useState } from 'react';
import AlertBanner from '../../components/ui/AlertBanner';
import InviteClaimPreview from '../../components/auth/InviteClaimPreview';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage, onboardingApi } from '../../lib/backendApi';
import { getAssignableFarmMemberRoles } from '../../lib/staffOnboarding';
import { formatKenyanPhoneInput, normalizeKenyanPhone } from '../../lib/phone';
import { authCopy } from '../../i18n/auth';
import FieldError from '../../components/ui/FieldError';
import { fieldErrorProps } from '../../components/ui/fieldErrorProps';
import { adminCopy } from '../../i18n/admin';

const copy = adminCopy.members;

export default function CooperativeAdminOnboardingPage() {
  const { currentUser } = useAuth();
  const roleOptions = getAssignableFarmMemberRoles(currentUser);
  const [manualInvite, setManualInvite] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    role: 'FARM_HAND',
  });
  const [csvDefaultRole, setCsvDefaultRole] = useState('FARM_HAND');
  const [csvFile, setCsvFile] = useState(null);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [phoneError, setPhoneError] = useState('');

  const handleManualInvite = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    const phoneNumber = normalizeKenyanPhone(manualInvite.phone_number);
    if (!phoneNumber) {
      setPhoneError(authCopy.fields.phoneInvalid);
      return;
    }
    setIsInviting(true);

    try {
      const invite = await onboardingApi.inviteMember({
        ...manualInvite,
        full_name: manualInvite.full_name.trim(),
        email: manualInvite.email.trim(),
        phone_number: phoneNumber,
      });

      setCreatedInvite(invite);
      setManualInvite({ full_name: '', email: '', phone_number: '', role: 'FARM_HAND' });
      setMessage({ type: 'success', text: copy.inviteCreated });
    } catch (error) {
      setMessage({ type: 'danger', text: getApiErrorMessage(error, copy.inviteFailed) });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCsvUpload = async (event) => {
    event.preventDefault();

    if (!csvFile) {
      setMessage({ type: 'danger', text: copy.needCsv });
      return;
    }

    setMessage({ type: '', text: '' });
    setIsUploadingCsv(true);

    try {
      await onboardingApi.importMembersCsv(csvFile, { default_role: csvDefaultRole });
      setCsvFile(null);
      event.currentTarget.reset();
      setMessage({ type: 'success', text: copy.csvQueued });
    } catch (error) {
      setMessage({ type: 'danger', text: getApiErrorMessage(error, copy.csvFailed) });
    } finally {
      setIsUploadingCsv(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-10rem)] rounded-2xl border border-[#602f1f]/10 bg-[linear-gradient(135deg,#fff4ec_0%,#fff8ea_36%,#f2f4ff_100%)] p-4 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#7a3e1f]/20 bg-white/90 p-6 ">
          <header className="mb-5">
            <p className="inline-flex items-center rounded-full bg-[#7a3e1f]/10 px-3 py-1 text-label text-[#5a2e16]">

    {copy.manualBadge}
            </p>
            <h1 className="mt-4 text-page-title text-[#3d1f11]">{copy.title}</h1>
            <p className="mt-2 text-body text-[#6b3f2a]">{copy.subtitle}</p>
          </header>

          <form onSubmit={handleManualInvite} className="space-y-4">
            <label className="block text-field-label text-[#6a3a24]">
              {copy.fullName}
              <input
                className="mt-2 w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] px-4 py-3 text-control text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                value={manualInvite.full_name}
                onChange={(event) => setManualInvite((prev) => ({ ...prev, full_name: event.target.value }))}
                placeholder="Njeri Maina"
                required
              />
            </label>

            <label className="block text-field-label text-[#6a3a24]">
              {copy.email}
              <div className="relative mt-2">
                <input
                  type="email"
                  className="w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] py-3 pl-4 pr-4 text-control text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                  value={manualInvite.email}
                  onChange={(event) => setManualInvite((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="member@cooperative.org"
                  required
                />
              </div>
            </label>

            <label className="block text-field-label text-[#6a3a24]">
              {copy.phone}
              <input
                id="member-invite-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="mt-2 w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] px-4 py-3 text-control text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                value={manualInvite.phone_number}
                onChange={(event) => {
                  setPhoneError('');
                  setManualInvite((prev) => ({ ...prev, phone_number: formatKenyanPhoneInput(event.target.value) }));
                }}
                placeholder={authCopy.fields.phonePlaceholder}
                required
                {...fieldErrorProps('member-invite-phone', phoneError)}
              />
              <FieldError id="member-invite-phone" message={phoneError} />
            </label>

            <label className="block text-field-label text-[#6a3a24]">
              {copy.role}
              <select
                className="mt-2 w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] px-4 py-3 text-control text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                value={manualInvite.role}
                onChange={(event) => setManualInvite((prev) => ({ ...prev, role: event.target.value }))}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <span className="mt-2 block text-meta normal-case text-[#79513c]">
                {roleOptions.find((option) => option.value === manualInvite.role)?.description}
              </span>
            </label>

            <InviteClaimPreview
              invite={createdInvite}
              title={copy.linkTitle}
              description={copy.linkText}
            />

            <button type="submit" className="btn-command w-full" disabled={isInviting}>
              {isInviting ? copy.sending : copy.send}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#224f87]/20 bg-white/90 p-6 ">
          <header className="mb-5">
            <p className="inline-flex items-center rounded-full bg-[#224f87]/10 px-3 py-1 text-label text-[#1d4370]">

    {copy.bulkBadge}
            </p>
            <h2 className="mt-4 text-section-title text-[#132f4f]">{copy.csvTitle}</h2>
            <p className="mt-2 text-body text-[#35577d]">{copy.csvText}</p>
          </header>

          <form onSubmit={handleCsvUpload} className="space-y-4">
            <label className="block text-field-label text-[#35577d]">
              {copy.defaultRole}
              <select
                className="mt-2 w-full rounded-lg border border-[#224f87]/20 bg-[#f8fbff] px-4 py-3 text-control text-[#112740] outline-none transition focus:border-[#224f87] focus:ring-2 focus:ring-[#224f87]/20"
                value={csvDefaultRole}
                onChange={(event) => setCsvDefaultRole(event.target.value)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-field-label text-[#35577d]">
              {copy.csvFile}
              <div className="mt-2 flex w-full items-center justify-between rounded-lg border border-dashed border-[#224f87]/35 bg-[#f8fbff] px-4 py-4">
                <div>
                  <p className="text-body-strong text-[#112740]">{csvFile?.name || copy.noFile}</p>
                  <p className="text-meta text-[#446687]">{copy.accepted}</p>
                </div>
                <label className="btn-secondary cursor-pointer">
                  {copy.chooseFile}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </label>

            <button type="submit" className="btn-command w-full" disabled={isUploadingCsv}>
              {isUploadingCsv ? copy.uploading : copy.import}
            </button>
          </form>
        </section>
      </div>

      {message.text && (
        <div className="mx-auto mt-6 max-w-6xl">
          <AlertBanner type={message.type || 'info'} title={copy.statusTitle} message={message.text} onDismiss={() => setMessage({ type: '', text: '' })} />
        </div>
      )}
    </div>
  );
}
