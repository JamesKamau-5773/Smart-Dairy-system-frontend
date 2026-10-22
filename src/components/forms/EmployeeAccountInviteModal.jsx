import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import InviteClaimPreview from '../auth/InviteClaimPreview';
import AlertBanner from '../ui/AlertBanner';
import BaseModal from '../ui/BaseModal';
import AccessProvisioningFields from './AccessProvisioningFields';
import { ACCESS_MODES, validateProvisioningFields } from '../../lib/staffAccessForm';
import { getDefaultStaffPageAccess, STAFF_PAGE_ACCESS_OPTIONS } from '../../lib/staffOnboarding';

export default function EmployeeAccountInviteModal({ isOpen, staff, onClose, onInvite, onProvision, onSaveAccess }) {
  const [mode, setMode] = useState(ACCESS_MODES.INVITE);
  const [role, setRole] = useState('FARM_HAND');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [invitation, setInvitation] = useState(null);
  const [provisioned, setProvisioned] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageAccess, setPageAccess] = useState([]);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (!staff) return;
    const candidateRole = String(staff.accountRole || staff.role || '').trim().replace(/[-\s]+/g, '_').toUpperCase();
    const availableRoles = ['FARM_ADMIN', 'FARM_MANAGER', 'FARM_SUPERVISOR', 'FARM_HAND', 'VETERINARY_DOCTOR'];
    const initialRole = availableRoles.includes(candidateRole) ? candidateRole : 'FARM_HAND';
    setRole(initialRole);
    setPageAccess(Array.isArray(staff.page_access) ? staff.page_access : getDefaultStaffPageAccess(initialRole));
  }, [staff?.id, staff?.role, staff?.accountRole, staff?.page_access]);

  if (!staff) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setErrors({});

    const validationErrors = validateProvisioningFields({ mode, password, requiresPasswordReset: true });
    if (mode === ACCESS_MODES.PROVISION && !staff.phoneNumber) {
      validationErrors.phoneNumber = 'A phone number is required for direct provisioning.';
    }
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      setErrorMessage(validationErrors.phoneNumber || 'Review the highlighted account details.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === ACCESS_MODES.INVITE) {
        const result = await onInvite(staff.id, { role, page_access: pageAccess });
        setInvitation(result);
      } else {
        await onProvision(staff.id, { role, password, page_access: pageAccess, requires_password_reset: true });
        setPassword('');
        setProvisioned(true);
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.error || error?.response?.data?.message || 'Unable to grant employee access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAccess = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSaveAccess(staff.id, pageAccess);
      setSavedMessage('Access settings saved.');
    } catch (error) {
      setErrorMessage(error?.response?.data?.error || 'Unable to save access settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReissue = ['INVITED', 'INVITE_PENDING'].includes(staff.accountStatus);
  const isActiveAccount = staff.accountStatus === 'ACTIVE';
  const actionComplete = Boolean(invitation || provisioned);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage app access"
      subtitle="The account will be linked to this employee record."
      footerActions={(
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Close</button>
          {onSaveAccess && staff.userId && (
            <button type="button" onClick={handleSaveAccess} disabled={isSubmitting} className="rounded-md border border-brand px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50">Save page access</button>
          )}
          {!actionComplete && !isActiveAccount && (
            <button type="submit" form="manage-app-access-form" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0369A1] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0369A1]/90 disabled:cursor-not-allowed disabled:opacity-50">
              {mode === ACCESS_MODES.INVITE ? <KeyRound size={15} /> : <ShieldCheck size={15} />}
              {isSubmitting
                ? 'Saving access...'
                : mode === ACCESS_MODES.INVITE
                  ? isReissue ? 'Reissue invitation' : 'Generate link'
                  : 'Provision account'}
            </button>
          )}
        </>
      )}
    >
      <form id="manage-app-access-form" onSubmit={handleSubmit} className="space-y-5">
        <p className="font-semibold text-ink-strong">{staff.name}</p>

        {errorMessage && <AlertBanner type="danger" title="Access update failed" message={errorMessage} onDismiss={() => setErrorMessage('')} />}
        {savedMessage && <AlertBanner type="success" title="Access updated" message={savedMessage} onDismiss={() => setSavedMessage('')} />}

        {isActiveAccount && <p className="text-sm text-slate-600">This employee has an active account. Select the pages they may use, then save.</p>}

        {!actionComplete && !isActiveAccount && (
          <AccessProvisioningFields
            mode={mode}
            onModeChange={(nextMode) => { setMode(nextMode); setErrorMessage(''); setErrors({}); }}
            role={role}
            onRoleChange={(nextRole) => { setRole(nextRole); setPageAccess(getDefaultStaffPageAccess(nextRole)); }}
            phoneNumber={staff.phoneNumber}
            password={password}
            onPasswordChange={setPassword}
            errors={errors}
          />
        )}

        <section className="space-y-2 rounded-lg border border-slate-200 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Pages this employee can access</h3>
            <p className="text-xs text-slate-500">Role defaults are preselected. The farmer can change them at any time.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {STAFF_PAGE_ACCESS_OPTIONS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={pageAccess.includes(key)} onChange={(event) => setPageAccess((current) => event.target.checked ? [...current, key] : current.filter((entry) => entry !== key))} />
                {label}
              </label>
            ))}
          </div>
        </section>

        {invitation && (
          <InviteClaimPreview
            invite={invitation}
            title="Employee claim link"
            description={`Expires in ${invitation.expires_in_hours ? `${invitation.expires_in_hours} hours` : `${invitation.expires_in_days ?? 2} days`} and can be used once.`}
          />
        )}

        {provisioned && <AlertBanner type="success" title="Account provisioned" message="The backend created and linked the account. The employee must replace the temporary password at first login." />}

      </form>
    </BaseModal>
  );
}
