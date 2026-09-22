import { useState } from 'react';
import { FileSpreadsheet, Mail, Upload, UserPlus } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import InviteClaimPreview from '../../components/auth/InviteClaimPreview';
import { useAuth } from '../../contexts/AuthContext';
import { onboardingApi } from '../../lib/backendApi';
import { getAssignableFarmMemberRoles } from '../../lib/staffOnboarding';

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

  const handleManualInvite = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    setIsInviting(true);

    try {
      const invite = await onboardingApi.inviteMember({
        ...manualInvite,
        full_name: manualInvite.full_name.trim(),
        email: manualInvite.email.trim(),
        phone_number: manualInvite.phone_number.trim(),
      });

      setCreatedInvite(invite);
      setManualInvite({ full_name: '', email: '', phone_number: '', role: 'FARM_HAND' });
      setMessage({ type: 'success', text: 'Member invitation created. Share the server-issued claim link below.' });
    } catch (error) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
      setMessage({ type: 'danger', text: serverMessage || 'Member invite failed.' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCsvUpload = async (event) => {
    event.preventDefault();

    if (!csvFile) {
      setMessage({ type: 'danger', text: 'Attach a CSV file before importing members.' });
      return;
    }

    setMessage({ type: '', text: '' });
    setIsUploadingCsv(true);

    try {
      await onboardingApi.importMembersCsv(csvFile, { default_role: csvDefaultRole });
      setCsvFile(null);
      event.currentTarget.reset();
      setMessage({ type: 'success', text: 'CSV import queued successfully.' });
    } catch (error) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
      setMessage({ type: 'danger', text: serverMessage || 'CSV import failed.' });
    } finally {
      setIsUploadingCsv(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-10rem)] rounded-2xl border border-[#602f1f]/10 bg-[linear-gradient(135deg,#fff4ec_0%,#fff8ea_36%,#f2f4ff_100%)] p-4 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#7a3e1f]/20 bg-white/90 p-6 ">
          <header className="mb-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#7a3e1f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#5a2e16]">
              <UserPlus size={14} /> Manual Invite
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#3d1f11]">Invite Member</h1>
            <p className="mt-2 text-sm text-[#6b3f2a]">Invite one member at a time and assign organizational or operational roles per farm policy.</p>
          </header>

          <form onSubmit={handleManualInvite} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#6a3a24]">
              Full Name
              <input
                className="mt-2 w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] px-4 py-3 text-sm text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                value={manualInvite.full_name}
                onChange={(event) => setManualInvite((prev) => ({ ...prev, full_name: event.target.value }))}
                placeholder="Njeri Maina"
                required
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#6a3a24]">
              Email
              <div className="relative mt-2">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f5a41]" />
                <input
                  type="email"
                  className="w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] py-3 pl-10 pr-4 text-sm text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                  value={manualInvite.email}
                  onChange={(event) => setManualInvite((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="member@cooperative.org"
                  required
                />
              </div>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#6a3a24]">
              Phone Number
              <input
                className="mt-2 w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] px-4 py-3 text-sm text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                value={manualInvite.phone_number}
                onChange={(event) => setManualInvite((prev) => ({ ...prev, phone_number: event.target.value }))}
                placeholder="+254722000000"
                required
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#6a3a24]">
              Role
              <select
                className="mt-2 w-full rounded-lg border border-[#7a3e1f]/20 bg-[#fffcfa] px-4 py-3 text-sm text-[#2e160b] outline-none transition focus:border-[#7a3e1f] focus:ring-2 focus:ring-[#7a3e1f]/20"
                value={manualInvite.role}
                onChange={(event) => setManualInvite((prev) => ({ ...prev, role: event.target.value }))}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <span className="mt-2 block text-xs normal-case tracking-normal text-[#79513c]">
                {roleOptions.find((option) => option.value === manualInvite.role)?.description}
              </span>
            </label>

            <InviteClaimPreview
              invite={createdInvite}
              title="Member claim link"
              description="For security, this link is generated only after the server accepts the invitation."
            />

            <button type="submit" className="btn-command w-full" disabled={isInviting}>
              {isInviting ? 'Sending invite…' : 'Send invite'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#224f87]/20 bg-white/90 p-6 ">
          <header className="mb-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#224f87]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#1d4370]">
              <FileSpreadsheet size={14} /> Bulk Import
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#132f4f]">CSV Onboarding</h2>
            <p className="mt-2 text-sm text-[#35577d]">Import many members in one pass. Keep headers predictable: full_name,email,phone_number,role.</p>
          </header>

          <form onSubmit={handleCsvUpload} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#35577d]">
              Default Role
              <select
                className="mt-2 w-full rounded-lg border border-[#224f87]/20 bg-[#f8fbff] px-4 py-3 text-sm text-[#112740] outline-none transition focus:border-[#224f87] focus:ring-2 focus:ring-[#224f87]/20"
                value={csvDefaultRole}
                onChange={(event) => setCsvDefaultRole(event.target.value)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#35577d]">
              CSV File
              <div className="mt-2 flex w-full items-center justify-between rounded-lg border border-dashed border-[#224f87]/35 bg-[#f8fbff] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#112740]">{csvFile?.name || 'No file selected'}</p>
                  <p className="text-xs text-[#446687]">Accepted format: .csv</p>
                </div>
                <label className="btn-secondary cursor-pointer">
                  <Upload size={14} className="mr-2" />
                  Choose File
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
              {isUploadingCsv ? 'Uploading CSV…' : 'Import CSV members'}
            </button>
          </form>
        </section>
      </div>

      {message.text && (
        <div className="mx-auto mt-6 max-w-6xl">
          <AlertBanner type={message.type || 'info'} title="Onboarding status" message={message.text} onDismiss={() => setMessage({ type: '', text: '' })} />
        </div>
      )}
    </div>
  );
}
