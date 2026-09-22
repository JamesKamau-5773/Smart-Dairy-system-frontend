import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import InviteClaimPreview from '../auth/InviteClaimPreview';
import AlertBanner from '../ui/AlertBanner';
import BaseModal from '../ui/BaseModal';
import AccessProvisioningFields from './AccessProvisioningFields';
import { ACCESS_MODES, validateProvisioningFields } from '../../lib/staffAccessForm';

export default function EmployeeAccountInviteModal({ isOpen, staff, onClose, onInvite, onProvision }) {
  const [mode, setMode] = useState(ACCESS_MODES.INVITE);
  const [role, setRole] = useState('FARM_HAND');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [invitation, setInvitation] = useState(null);
  const [provisioned, setProvisioned] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const result = await onInvite(staff.id, { role });
        setInvitation(result);
      } else {
        await onProvision(staff.id, { role, password, requires_password_reset: true });
        setPassword('');
        setProvisioned(true);
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.error || error?.response?.data?.message || 'Unable to grant employee access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReissue = ['INVITED', 'INVITE_PENDING'].includes(staff.accountStatus);
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
          {!actionComplete && (
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

        {!actionComplete && (
          <AccessProvisioningFields
            mode={mode}
            onModeChange={(nextMode) => { setMode(nextMode); setErrorMessage(''); setErrors({}); }}
            role={role}
            onRoleChange={setRole}
            phoneNumber={staff.phoneNumber}
            password={password}
            onPasswordChange={setPassword}
            errors={errors}
          />
        )}

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
