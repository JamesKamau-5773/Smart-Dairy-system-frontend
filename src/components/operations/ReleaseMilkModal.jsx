import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import SubmitButton from '../auth/SubmitButton';
import { formatLockExpiry } from '../../lib/milkSafety';
import { safetyCopy as copy } from '../../i18n/safety';

/**
 * Releasing milk the backend says isn't safe yet (withdrawal running or a failed
 * test): asks for the audited `override_reason` the backend requires.
 */
export default function ReleaseMilkModal({ lock, cowName, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');
  const ends = formatLockExpiry(lock.withdrawalEndsAt ?? lock.lockExpires);
  const testFailed = lock.latestTest?.result === 'FAIL';

  const submit = (event) => {
    event.preventDefault();
    if (reason.trim()) onConfirm(reason.trim());
  };

  return (
    <BaseModal isOpen onClose={onClose} title={copy.overrideTitle(cowName)}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-body text-ink">
          {ends ? copy.overrideWhy(ends) : null} {testFailed ? copy.overrideFailedTest : null}
        </p>
        <div>
          <label htmlFor="release-override" className="mb-1.5 block text-field-label text-ink">{copy.overrideLabel}</label>
          <textarea
            id="release-override"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={copy.overridePlaceholder}
            aria-describedby="release-override-hint"
            className="input-machined w-full text-control"
          />
          <p id="release-override-hint" className="mt-1 text-meta text-ink-muted">{copy.overrideHint}</p>
        </div>
        <SubmitButton pending={isPending} pendingLabel={copy.releasing} disabled={!reason.trim()}>{copy.overrideSubmit}</SubmitButton>
      </form>
    </BaseModal>
  );
}
