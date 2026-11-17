import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import AlertBanner from '../ui/AlertBanner';
import SubmitButton from '../auth/SubmitButton';
import CowSelect from './CowSelect';
import { dateTimeInputToIso, nowLocalDateTimeInput } from '../../lib/localDate';
import { safetyCopy as copy } from '../../i18n/safety';

// The backend's limit on a hold reason.
const MAX_REASON_LENGTH = 120;

/** Holds a cow's milk by hand (no treatment recorded). The page saves it. */
export default function PlaceHoldModal({ cows, initialCowId = '', onClose, onSubmit, isPending, error }) {
  const [cowId, setCowId] = useState(initialCowId ? String(initialCowId) : '');
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [notes, setNotes] = useState('');
  const canSave = cowId && reason.trim();

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    onSubmit({ cowId: Number(cowId), reason: reason.trim(), until: dateTimeInputToIso(until), notes: notes.trim() || null });
  };

  return (
    <BaseModal isOpen onClose={onClose} title={copy.placeHoldTitle} subtitle={copy.placeHoldHint}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <AlertBanner type="danger" message={error} compact />}
        <CowSelect id="hold-cow" cows={cows} value={cowId} onChange={setCowId} disabled={Boolean(initialCowId)} />
        <div>
          <label htmlFor="hold-reason" className="mb-1.5 block text-field-label text-ink">{copy.holdReason}</label>
          <input id="hold-reason" value={reason} maxLength={MAX_REASON_LENGTH} onChange={(event) => setReason(event.target.value)} placeholder={copy.holdReasonPlaceholder} className="input-machined w-full text-control" required />
        </div>
        <div>
          <label htmlFor="hold-until" className="mb-1.5 block text-field-label text-ink">{copy.holdUntil}</label>
          <input id="hold-until" type="datetime-local" value={until} min={nowLocalDateTimeInput()} onChange={(event) => setUntil(event.target.value)} aria-describedby="hold-until-hint" className="input-machined w-full text-control" />
          <p id="hold-until-hint" className="mt-1 text-meta text-ink-muted">{copy.holdUntilHint}</p>
        </div>
        <div>
          <label htmlFor="hold-notes" className="mb-1.5 block text-field-label text-ink">{copy.holdNotes}</label>
          <textarea id="hold-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={copy.holdNotesPlaceholder} className="input-machined w-full text-control" />
        </div>
        <SubmitButton pending={isPending} pendingLabel={copy.holding} disabled={!canSave}>{copy.holdSubmit}</SubmitButton>
      </form>
    </BaseModal>
  );
}
