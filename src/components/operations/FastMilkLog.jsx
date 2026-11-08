import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTenant } from '../../hooks/useTenant';
import { useSubmissionKey } from '../../hooks/useSubmissionKey';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { getApiErrorMessage, herdApi, productionApi, safetyApi } from '../../lib/backendApi';
import { getApiErrorCode } from '../../lib/apiErrors';
import { reportError } from '../../lib/telemetry';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../ui/Confirmation';
import offlineQueue from '../../lib/offlineQueue';
import { QUEUED_OFFLINE_MESSAGE, isQueuedOffline } from '../../lib/offlinePolicy';
import { useFormDraft } from '../../hooks/useFormDraft';
import DraftRestoredNotice from '../ui/DraftRestoredNotice';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { ArrowLeft, Droplets, CheckCircle2, AlertOctagon, CloudOff, Trash2, X } from 'lucide-react';
import { todayLocalIso } from '../../lib/localDate';

const todayIso = () => todayLocalIso();

const SESSION_OPTIONS = ['morning', 'midday', 'evening'];

// How long the "Saved" / "Saved on this phone" screen shows before the form is ready again.
const OUTCOME_SCREEN_MS = 1400;

const DUPLICATE_MESSAGE = 'Already recorded for this cow and session. Duplicate blocked.';
const IN_PROGRESS_MESSAGE = 'Still saving your last try. Wait a few seconds, then press Save again.';
const SIGNED_OUT_MESSAGE = 'You were signed out, so this wasn’t saved. Sign in again, then press Save.';
const SAVE_FAILED_MESSAGE = 'Couldn’t save. Your entry is still here. Try again.';
const DELETE_FAILED_MESSAGE = 'Couldn’t delete this record. Try again.';
const DELETED_MESSAGE = 'Milk record deleted.';
const DELETE_QUEUED_MESSAGE = 'Will be deleted when you’re back online.';

/** "Neema · KE-012 · morning · 2026-11-08 · 12.5 L" for the delete dialog; parts the row lacks are left out. */
const describeMilkRecord = (record) => [
  formatCowIdentity({ cowName: record?.cowName, cowTag: record?.cowId }, ''),
  record?.session,
  record?.date ?? record?.milkingDate ?? record?.milking_date,
  record?.amount != null && record?.amount !== '' ? `${record.amount} L` : null,
].filter(Boolean).join(' · ');

// A milk draft is worth keeping once a cow or a volume has been entered.
const isMilkDraftEmpty = (values) => !values?.cowId && !values?.volume;

const normalizeFormData = (record, fallbackDate = todayIso()) => ({
  cowId: record?.cowId || '',
  volume: record?.volume ?? record?.amount ?? '',
  date: record?.date || record?.milkingDate || record?.milking_date || fallbackDate,
  session: SESSION_OPTIONS.includes(record?.session) ? record.session : 'morning',
});

/* =========================================================================
   PRESENTER: visual-only component
   - Receives props for herd, form state, handlers, and status
   - No business logic or side-effects
========================================================================= */

const FastMilkUI = ({
  displayHerd,
  isLocked,
  formData,
  setFormData,
  onSubmit,
  onDelete,
  saveStatus,
  isPending,
  isDeleting,
  onClose,
  onBack,
  message,
  messageType,
  onDismissMessage,
  mode,
  editCowLabel = '',
  draftNotice = null,
}) => {
  const isEditMode = mode === 'edit';

  if (saveStatus === 'success') {
    // 'info' = kept on this phone (not yet on the server); 'warning' = duplicate blocked.
    const outcome = messageType === 'info'
      ? { Icon: CloudOff, iconClass: 'text-warning-700', title: 'Saved on this phone' }
      : messageType === 'warning'
        ? { Icon: AlertOctagon, iconClass: 'text-warning-700', title: 'Already recorded' }
        : { Icon: CheckCircle2, iconClass: 'text-brand', title: 'Saved!' };
    return (
      <div role="status" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain bg-white rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 animate-reveal touch-pan-y sm:p-12 sm:max-h-[90dvh]">
        <outcome.Icon size={64} className={`${outcome.iconClass} scale-150 mb-2`} />
        <h3 className="font-black text-3xl text-ink">{outcome.title}</h3>
        <p className="text-ink-muted font-bold">
          {messageType === 'success' ? 'Ready for the next cow...' : messageType === 'info' ? 'It will be sent when you’re back online.' : message}
        </p>
      </div>
    );
  }

  return (
    <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain bg-white rounded-3xl border border-ink/10 relative animate-reveal touch-pan-y sm:max-h-[90dvh]">
      {message && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type={messageType} title="Fast Log" message={message} onDismiss={onDismissMessage} autoDismiss={6000} />
        </div>
      )}

      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-ink-muted hover:text-danger hover:bg-danger/5 rounded-full transition-colors" aria-label="Close Fast Log">
          <X size={20} />
        </button>
      )}

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost absolute left-4 top-4 h-9 w-9 !min-h-0 !p-0"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      <div className="p-8 pb-6 text-center border-b border-ink/5">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-brand/10 text-brand rounded-full mb-4">
          <Droplets size={24} />
        </div>
        <h2 className="font-sans font-black text-3xl text-brand tracking-tight">
          {isEditMode ? 'Edit Milk Record' : 'Record Milk'}
        </h2>
        <p className="text-ink-muted text-sm mt-1 font-medium">
          {isEditMode ? 'Update the milk entry details' : 'Record the milk in litres'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="p-8 space-y-6 bg-surface-warm/30">
        {draftNotice}
        <div className="space-y-2">
          <label htmlFor="fast-milk-cow" className="text-[11px] font-black text-ink-muted uppercase tracking-widest block">{isEditMode ? 'Cow' : 'Select Cow'}</label>
          {isEditMode ? (
            // Editing changes amount, session and date only; the backend keeps the record's cow.
            <input
              id="fast-milk-cow"
              type="text"
              readOnly
              value={editCowLabel}
              aria-describedby="fast-milk-cow-hint"
              className="w-full rounded-xl border-2 border-ink/10 bg-ink/5 p-4 text-lg font-bold text-ink-strong focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          ) : (
            <div className="relative">
              <select
                id="fast-milk-cow"
                value={formData.cowId}
                onChange={(e) => setFormData({ ...formData, cowId: e.target.value })}
                className="w-full appearance-none bg-white border-2 border-ink/10 rounded-xl p-4 pr-10 text-lg font-bold text-ink-strong focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer "
                required
              >
                <option value="" disabled>Choose cow...</option>
                {displayHerd.map((cow) => (
                  <option key={cow.id} value={cow.id}>
                    {formatCowIdentity(cow)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-ink-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          {isEditMode && (
            <p id="fast-milk-cow-hint" className="text-xs text-ink-muted">
              To move this milk to another cow, delete this record and record it again for the right cow.
            </p>
          )}
        </div>

        {/* One column on phones: side by side, the date and three sessions don’t fit at 360px. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label htmlFor="fast-milk-date" className="text-[11px] font-black text-ink-muted uppercase tracking-widest block">Date</label>
            <input
              id="fast-milk-date"
              type="date"
              value={formData.date}
              max={todayIso()}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-white border-2 border-ink/10 rounded-xl p-4 text-sm font-bold text-ink-strong focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all "
              required
            />
          </div>
          <div className="min-w-0 space-y-2">
            <span id="fast-milk-session" className="text-[11px] font-black text-ink-muted uppercase tracking-widest block">Session</span>
            <div role="group" aria-labelledby="fast-milk-session" className="grid grid-cols-3 gap-1 rounded-xl border-2 border-ink/10 bg-white p-1">
              {SESSION_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={formData.session === s}
                  onClick={() => setFormData({ ...formData, session: s })}
                  className={`min-w-0 truncate rounded-lg px-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    formData.session === s ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger flex items-center gap-3 text-danger">
            <AlertOctagon size={20} />
            <div className="text-sm font-bold">Cow on Medication! Do not mix this milk.</div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[11px] font-black text-ink-muted uppercase tracking-widest block">Volume (Liters)</label>
          <div className="relative">
            <input
              inputMode="decimal"
              type="number"
              step="0.1"
              className="w-full bg-white border-2 border-ink/10 rounded-xl p-6 text-center text-3xl font-black text-brand focus:outline-none focus:border-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.0"
              value={formData.volume}
              onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
              required
            />
            <span className="absolute right-8 bottom-7 font-sans font-bold text-ink/45 text-xl">L</span>
          </div>
        </div>

        {/* Edit has three actions: on phones, Cancel and Delete share a row and the primary
            action takes the full width below them, within thumb reach. */}
        <div className="pt-4 flex flex-wrap gap-3 sm:flex-nowrap">
          {onClose && (
            <button type="button" onClick={onClose} className={`px-6 py-4 rounded-xl font-bold text-ink-muted hover:bg-ink/20 hover:text-ink-strong transition-colors ${isEditMode ? 'flex-1 sm:flex-none' : ''}`}>Cancel</button>
          )}
          {isEditMode && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending || isDeleting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-danger/20 px-5 py-4 font-bold text-danger hover:bg-danger/5 disabled:opacity-60 transition-colors sm:flex-none"
            >
              <Trash2 size={16} /> {isDeleting ? 'Deleting...' : 'Delete Record'}
            </button>
          )}
          <button type="submit" disabled={!formData.cowId || !formData.volume || !formData.date || isLocked || isPending} className={`flex-1 bg-brand text-surface font-black text-lg py-4 rounded-xl hover:bg-brand-dark disabled:opacity-70 transition-all active:scale-95 ${isEditMode ? 'basis-full sm:basis-auto' : ''}`}>
            {isPending ? 'Saving...' : isEditMode ? 'Update Record' : 'Save Record'}
          </button>
        </div>
      </form>
    </div>
  );
};


/* =========================================================================
   CONTAINER: logic-only (fetch, mutate, state)
========================================================================= */

export default function FastMilkLog({ onClose, onSaveSuccess, onDeleteSuccess, mode = 'create', record = null, initialDate = '' } = {}) {
  const navigate = useNavigate();
  const { tenantId, farmId } = useTenant();
  const defaultCreateDate = initialDate || todayIso();
  const [formData, setFormData] = useState(() => normalizeFormData(record, defaultCreateDate));
  const [saveStatus, setSaveStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef(null);
  // React Query tells React about isPending on a later tick, so a second submit in the same
  // tick (Enter plus a tap, a very fast double tap) would still read isPending === false.
  // This ref closes that gap; isPending drives what the farmer sees.
  const submitInFlight = useRef(false);
  const submissionKey = useSubmissionKey();
  const deleteConfirmation = useConfirmation();

  // The form starts from `record` when it mounts. To show another record, the parent
  // mounts a new FastMilkLog (productionLog opens one per record).
  const isEditMode = mode === 'edit' && !!record?.id;

  // Herd fetch (scoped by tenant/farm)
  const { data: cowsRaw } = useQuery({
    queryKey: QUERY_KEYS.COWS(tenantId, farmId),
    queryFn: () => herdApi.list(),
    enabled: !!farmId,
  });

  const herd = Array.isArray(cowsRaw)
    ? cowsRaw
    : Array.isArray(cowsRaw?.items)
      ? cowsRaw.items
      : Array.isArray(cowsRaw?.data)
        ? cowsRaw.data
        : [];

  const displayHerd = herd;

  // Hardlocks
  const { data: hardlocksRaw } = useQuery({
    queryKey: ['hardlocks', tenantId, farmId],
    queryFn: () => safetyApi.activeHardlocks(),
    enabled: !!farmId,
  });

  const hardlocks = Array.isArray(hardlocksRaw)
    ? hardlocksRaw
    : Array.isArray(hardlocksRaw?.items)
    ? hardlocksRaw.items
    : Array.isArray(hardlocksRaw?.data)
    ? hardlocksRaw.data
    : [];

  const isLocked = !!formData.cowId && hardlocks.some(h => h.cow_id === formData.cowId || h.cow_id === formData.cowId.replace(/^C-?/i, ''));

  const milkDraft = useFormDraft('milk-log', formData, setFormData, { enabled: !isEditMode, isEmpty: isMilkDraftEmpty });
  const handleClose = onClose
    ? () => { milkDraft.clearDraft(); onClose(); }
    : undefined;

  // Shows the outcome screen, then readies the form for the next cow (or closes an edit).
  // The entry is settled, so its idempotency key is forgotten: the next entry gets a new one.
  const settleEntry = (type, text) => {
    submissionKey.reset();
    setSaveStatus('success');
    setMessageType(type);
    setMessage(text);
    setTimeout(() => {
      setSaveStatus(null);
      setMessage('');
      if (isEditMode && onClose) {
        onClose();
        return;
      }
      setFormData(normalizeFormData(null, defaultCreateDate));
      inputRef.current?.focus();
    }, OUTCOME_SCREEN_MS);
  };

  // A new record is created (POST); an existing one is edited in place (PATCH), so an edit
  // can never leave the farm with the old record deleted and the new one missing.
  // Every attempt of one submission carries the same Idempotency-Key (useSubmissionKey).
  const mutation = useMutation({
    mutationFn: ({ entry, idempotencyKey }) => {
      const config = { headers: { 'Idempotency-Key': idempotencyKey } };
      return isEditMode
        ? productionApi.updateYield(record.id, entry, config)
        : productionApi.createYield(entry, config);
    },
    onSuccess: (data) => {
      if (isQueuedOffline(data)) {
        // Queued by apiClient: there is no saved record yet. The milk log lists it under
        // "Not sent yet" from the offline queue until it syncs.
        settleEntry('info', QUEUED_OFFLINE_MESSAGE);
        return;
      }
      if (onSaveSuccess) onSaveSuccess(data?.received || data?.updated || data);
      settleEntry('success', isEditMode ? 'Updated' : 'Saved');
    },
    onError: async (error, { entry, idempotencyKey }) => {
      const code = getApiErrorCode(error);

      if (code === 'DUPLICATE_MILK_ENTRY') {
        settleEntry('warning', DUPLICATE_MESSAGE);
        return;
      }

      // No answer from the server and apiClient didn't queue it (an error it doesn't treat
      // as offline). The request may still have arrived, so it is queued under the same key:
      // the backend then saves it once.
      if (!error?.response && !isEditMode) {
        try {
          await offlineQueue.enqueue(entry, { idempotencyKey });
          settleEntry('info', QUEUED_OFFLINE_MESSAGE);
          return;
        } catch (queueError) {
          reportError(queueError, { where: 'FastMilkLog.queue' });
        }
      }

      // The first try is still being saved; keep the key so the next try is matched to it.
      if (code === 'IDEMPOTENCY_IN_PROGRESS') {
        setMessageType('warning');
        setMessage(IN_PROGRESS_MESSAGE);
        return;
      }
      // Should not happen (the key follows the content), but never get stuck on a bad key.
      if (code === 'IDEMPOTENCY_KEY_REUSED') submissionKey.reset();

      reportError(error, { where: 'FastMilkLog.save' });
      setMessageType('danger');
      setMessage(error?.response?.status === 401
        ? SIGNED_OUT_MESSAGE
        : getApiErrorMessage(error, SAVE_FAILED_MESSAGE));
    },
    onSettled: () => {
      submitInFlight.current = false;
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitInFlight.current || mutation.isPending || isDeleting) return;
    if (!formData.cowId || !formData.volume || !formData.date || isLocked) return;

    const amount = parseFloat(formData.volume);
    if (Number.isNaN(amount) || amount < 0) {
      setMessageType('danger');
      setMessage('Enter a valid amount');
      return;
    }

    if (formData.date > todayIso()) {
      setMessageType('danger');
      setMessage('Milking date cannot be in the future');
      return;
    }

    const entry = {
      cow_id: formData.cowId,
      amount,
      session: formData.session,
      milking_date: formData.date,
    };
    submitInFlight.current = true;
    mutation.mutate({
      entry,
      idempotencyKey: submissionKey.keyFor({ recordId: isEditMode ? record.id : null, ...entry }),
    });
  };

  const handleDelete = async () => {
    if (!isEditMode || isDeleting || submitInFlight.current || mutation.isPending) return;
    const description = describeMilkRecord(record);
    const confirmed = await deleteConfirmation.confirm({
      title: 'Delete this milk record?',
      message: `${description ? `${description}. ` : ''}You can’t undo this.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Keep',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await productionApi.deleteYield(record.id);
      // Offline, apiClient queues the delete: the record stays until it is sent.
      if (isQueuedOffline(response?.data)) {
        toast(DELETE_QUEUED_MESSAGE);
      } else {
        toast.success(DELETED_MESSAGE);
      }
      if (onDeleteSuccess) onDeleteSuccess(record);
      if (onClose) onClose();
    } catch (error) {
      reportError(error, { where: 'FastMilkLog.delete' });
      setMessageType('danger');
      setMessage(getApiErrorMessage(error, DELETE_FAILED_MESSAGE));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 120);
  }, []);

  return createPortal(
    // z-[100] is the modal layer (as the other form modals), so the delete confirmation,
    // the session-expired sheet and toasts stay on top of it.
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-3 touch-pan-y sm:items-center sm:p-4">
      <FastMilkUI
        displayHerd={displayHerd}
        isLocked={isLocked}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        saveStatus={saveStatus}
        isPending={mutation.isPending}
        isDeleting={isDeleting}
        onClose={handleClose}
        onBack={!onClose ? () => navigate(-1) : undefined}
        draftNotice={milkDraft.restored ? (
          <DraftRestoredNotice
            onStartOver={() => { milkDraft.clearDraft(); setFormData(normalizeFormData(null, defaultCreateDate)); }}
            onDismiss={milkDraft.dismissRestored}
          />
        ) : null}
        message={message}
        messageType={messageType}
        onDismissMessage={() => setMessage('')}
        mode={mode}
        editCowLabel={isEditMode ? formatCowIdentity({ cowName: record.cowName, cowTag: record.cowId }) : ''}
      />
      <Confirmation {...deleteConfirmation} />
    </div>,
    document.body
  );
}
