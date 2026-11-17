import { useEffect, useState } from 'react';
import InviteClaimPreview from '../auth/InviteClaimPreview';
import AlertBanner from '../ui/AlertBanner';
import BaseModal from '../ui/BaseModal';
import AccessProvisioningFields from './AccessProvisioningFields';
import { ACCESS_MODES, validateProvisioningFields } from '../../lib/staffAccessForm';
import { getDefaultStaffPageAccess, STAFF_PAGE_ACCESS_OPTIONS } from '../../lib/staffOnboarding';
import { getApiErrorMessage } from '../../lib/backendApi';
import { staffCopy } from '../../i18n/staff';

export default function EmployeeAccountInviteModal({ isOpen, staff, onClose, onInvite, onProvision, onSaveAccess }) {
  const copy = staffCopy.accessDialog;
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
      validationErrors.phoneNumber = staffCopy.validation.phoneForProvision;
    }
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      setErrorMessage(validationErrors.phoneNumber || copy.reviewDetails);
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
      setErrorMessage(getApiErrorMessage(error, copy.createFailed));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAccess = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSaveAccess(staff.id, pageAccess);
      setSavedMessage(copy.saved);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, copy.saveFailed));
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
      title={copy.title}
      subtitle={copy.subtitle}
      footerActions={(
        <>
          <button type="button" onClick={onClose} className="btn-secondary">{copy.close}</button>
          {onSaveAccess && staff.userId && (
            <button type="button" onClick={handleSaveAccess} disabled={isSubmitting} className="rounded-md border border-brand px-4 py-2 text-control text-brand disabled:opacity-50">{copy.savePages}</button>
          )}
          {!actionComplete && !isActiveAccount && (
            <button type="submit" form="manage-app-access-form" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-control text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting
                ? copy.saving
                : mode === ACCESS_MODES.INVITE
                  ? isReissue ? copy.reissue : copy.generate
                  : copy.provision}
            </button>
          )}
        </>
      )}
    >
      <form id="manage-app-access-form" onSubmit={handleSubmit} className="space-y-5">
        <p className="text-body-strong text-ink-strong">{staff.name}</p>

        {errorMessage && <AlertBanner type="danger" title={copy.failedTitle} message={errorMessage} onDismiss={() => setErrorMessage('')} />}
        {savedMessage && <AlertBanner type="success" title={copy.updatedTitle} message={savedMessage} onDismiss={() => setSavedMessage('')} />}

        {isActiveAccount && <p className="text-body text-slate-600">{copy.activeHint}</p>}

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
            <h3 className="text-section-title text-slate-800">{copy.pages}</h3>
            <p className="text-meta text-slate-500">{copy.pagesHint}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {STAFF_PAGE_ACCESS_OPTIONS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-field-label text-slate-700">
                <input type="checkbox" checked={pageAccess.includes(key)} onChange={(event) => setPageAccess((current) => event.target.checked ? [...current, key] : current.filter((entry) => entry !== key))} />
                {label}
              </label>
            ))}
          </div>
        </section>

        {invitation && (
          <InviteClaimPreview
            invite={invitation}
            title={copy.linkTitle}
            description={invitation.expires_in_hours ? copy.expiresHours(invitation.expires_in_hours) : copy.expiresDays(invitation.expires_in_days ?? 2)}
          />
        )}

        {provisioned && <AlertBanner type="success" title={copy.readyTitle} message={copy.readyMessage} />}

      </form>
    </BaseModal>
  );
}
