import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTenant } from '../../hooks/useTenant';
import { useSubmissionKey } from '../../hooks/useSubmissionKey';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { getApiErrorMessage, herdApi, hrApi, productionApi, safetyApi } from '../../lib/backendApi';
import { getApiErrorCode } from '../../lib/apiErrors';
import { reportError } from '../../lib/telemetry';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../ui/Confirmation';
import offlineQueue from '../../lib/offlineQueue';
import { queuedOfflineMessage, isQueuedOffline } from '../../lib/offlinePolicy';
import { useFormDraft } from '../../hooks/useFormDraft';
import DraftRestoredNotice from '../ui/DraftRestoredNotice';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { ArrowLeft, CheckCircle2, AlertOctagon, CloudOff, X } from 'lucide-react';
import { todayLocalIso } from '../../lib/localDate';
import { useServerFieldErrors } from '../../hooks/useServerFieldErrors';
import FieldError from '../ui/FieldError';
import { fieldErrorProps } from '../ui/fieldErrorProps';
import { milkCopy as copy } from '../../i18n/milk';

const todayIso = () => todayLocalIso();

const SESSION_OPTIONS = ['morning', 'midday', 'evening'];

// How long the "Saved" / "Saved on this phone" screen shows before the form is ready again.
const OUTCOME_SCREEN_MS = 1400;

// The backend's milk-record fields, by the form's names, for showing its errors per input.
const SERVER_FIELDS = Object.freeze({ fieldMap: { cow_id: 'cowId', amount: 'volume', milking_date: 'date', milker_id: 'milkerId' } });

/** "Neema · KE-012 · morning · 2026-11-08 · 12.5 L" for the delete dialog; parts the row lacks are left out. */
const describeMilkRecord = (record) => [
  formatCowIdentity({ cowName: record?.cowName, cowTag: record?.cowId }, ''),
  record?.session,
  record?.date ?? record?.milkingDate ?? record?.milking_date,
  record?.amount != null && record?.amount !== '' ? `${record.amount} L` : null,
].filter(Boolean).join(' · ');

// A milk draft is worth keeping once a cow or a volume has been entered.
const isMilkDraftEmpty = (values) => !values?.cowId && !values?.volume;

// The backend sends sessions capitalised ("Evening"). An edited record keeps its own session;
// if it has none the form recognises, nothing is pre-selected and the farmer must pick one,
// so a save can never quietly move milk to the morning. New records start on morning.
const formSession = (record) => {
  if (!record) return 'morning';
  const session = String(record.session ?? '').trim().toLowerCase();
  return SESSION_OPTIONS.includes(session) ? session : '';
};

const normalizeFormData = (record, fallbackDate = todayIso()) => ({
  cowId: record?.cowId || '',
  volume: record?.volume ?? record?.amount ?? '',
  date: record?.date || record?.milkingDate || record?.milking_date || fallbackDate,
  session: formSession(record),
  // '' = the person entering the record milked (the backend then shows them as milker).
  milkerId: record?.milkerId != null ? String(record.milkerId) : '',
});

/* =========================================================================
   PRESENTER: visual-only component
   - Receives props for herd, form state, handlers, and status
   - No business logic or side-effects
========================================================================= */

const FastMilkUI = ({
  displayHerd,
  milkers = [],
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
  errorFor = () => undefined,
}) => {
  const isEditMode = mode === 'edit';

  if (saveStatus === 'success') {
    // 'info' = kept on this phone (not yet on the server); 'warning' = duplicate blocked.
    const outcome = messageType === 'info'
      ? { Icon: CloudOff, iconClass: 'text-warning-700', title: copy.outcomeQueued }
      : messageType === 'warning'
        ? { Icon: AlertOctagon, iconClass: 'text-warning-700', title: copy.outcomeDuplicate }
        : { Icon: CheckCircle2, iconClass: 'text-brand', title: copy.outcomeSaved };
    return (
      <div role="status" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain bg-white rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 animate-reveal touch-pan-y sm:p-12 sm:max-h-[90dvh]">
        <outcome.Icon size={64} className={`${outcome.iconClass} scale-150 mb-2`} aria-hidden="true" />
        <h2 className="text-section-title text-ink">{outcome.title}</h2>
        <p className="text-body text-ink-muted">
          {messageType === 'success' ? copy.nextCow : messageType === 'info' ? copy.sentWhenOnline : message}
        </p>
      </div>
    );
  }

  return (
    <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain bg-white rounded-3xl border border-ink/10 relative animate-reveal touch-pan-y sm:max-h-[90dvh]">
      {message && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type={messageType} title={copy.bannerTitle} message={message} onDismiss={onDismissMessage} autoDismiss={6000} />
        </div>
      )}

      {onClose && (
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 text-ink-muted hover:text-danger hover:bg-danger/5 rounded-full transition-colors" aria-label={copy.close}>
          <X size={20} aria-hidden="true" />
        </button>
      )}

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost absolute left-4 top-4 h-9 w-9 !min-h-0 !p-0"
          aria-label={copy.back}
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
      )}

      <div className="p-8 pb-6 text-center border-b border-ink/5">
        <h2 className="text-section-title text-brand">
          {isEditMode ? copy.titleEdit : copy.titleCreate}
        </h2>
        <p className="mt-1 text-body text-ink-muted">
          {isEditMode ? copy.subtitleEdit : copy.subtitleCreate}
        </p>
      </div>

      <form onSubmit={onSubmit} className="p-8 space-y-6 bg-surface-warm/30">
        {draftNotice}
        <div className="space-y-2">
          <label htmlFor="fast-milk-cow" className="block text-field-label text-ink-muted">{isEditMode ? copy.cow : copy.selectCow}</label>
          {isEditMode ? (
            // Editing changes amount, session and date only; the backend keeps the record's cow.
            <input
              id="fast-milk-cow"
              type="text"
              readOnly
              value={editCowLabel}
              aria-describedby={errorFor('cowId') ? 'fast-milk-cow-error fast-milk-cow-hint' : 'fast-milk-cow-hint'}
              aria-invalid={errorFor('cowId') ? true : undefined}
              className="input-machined w-full text-control"
            />
          ) : (
            <div className="relative">
              <select
                id="fast-milk-cow"
                value={formData.cowId}
                onChange={(e) => setFormData({ ...formData, cowId: e.target.value })}
                {...fieldErrorProps('fast-milk-cow', errorFor('cowId'))}
                className="input-machined w-full text-control appearance-none pr-10 cursor-pointer"
                required
              >
                <option value="" disabled>{copy.chooseCow}</option>
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
          <FieldError id="fast-milk-cow" message={errorFor('cowId')} />
          {isEditMode && (
            <p id="fast-milk-cow-hint" className="text-meta text-ink-muted">
              {copy.moveCowHint}
            </p>
          )}
        </div>

        {/* One column on phones: side by side, the date and three sessions don’t fit at 360px. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label htmlFor="fast-milk-date" className="block text-field-label text-ink-muted">{copy.date}</label>
            <input
              id="fast-milk-date"
              type="date"
              value={formData.date}
              max={todayIso()}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              {...fieldErrorProps('fast-milk-date', errorFor('date'))}
              className="input-machined w-full text-control"
              required
            />
            <FieldError id="fast-milk-date" message={errorFor('date')} />
          </div>
          <div className="min-w-0 space-y-2">
            <span id="fast-milk-session" className="block text-field-label text-ink-muted">{copy.session}</span>
            <div role="group" aria-labelledby="fast-milk-session" {...fieldErrorProps('fast-milk-session', errorFor('session'))} className="grid grid-cols-3 gap-1 rounded-xl border-2 border-ink/10 bg-white p-1">
              {SESSION_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={formData.session === s}
                  onClick={() => setFormData({ ...formData, session: s })}
                  className={`min-w-0 truncate rounded-lg px-1 py-2.5 text-control transition-colors ${
                    formData.session === s ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                  }`}
                >
                  {copy.sessions[s]}
                </button>
              ))}
            </div>
            <FieldError id="fast-milk-session" message={errorFor('session')} />
          </div>
        </div>

        {/* Only when the farm's staff list could be read (it is not shown to every role). */}
        {milkers.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="fast-milk-milker" className="block text-field-label text-ink-muted">{copy.milkedBy}</label>
            <select
              id="fast-milk-milker"
              value={formData.milkerId}
              onChange={(e) => setFormData({ ...formData, milkerId: e.target.value })}
              {...fieldErrorProps('fast-milk-milker', errorFor('milkerId'))}
              aria-describedby={errorFor('milkerId') ? 'fast-milk-milker-error fast-milk-milker-hint' : 'fast-milk-milker-hint'}
              className="input-machined w-full text-control cursor-pointer"
            >
              <option value="">{copy.milkedByMe}</option>
              {milkers.map((employee) => (
                <option key={employee.id} value={String(employee.id)}>{employee.name}</option>
              ))}
            </select>
            <p id="fast-milk-milker-hint" className="text-meta text-ink-muted">{copy.milkedByHint}</p>
            <FieldError id="fast-milk-milker" message={errorFor('milkerId')} />
          </div>
        )}

        {isLocked && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger flex items-center gap-3 text-danger">
            <AlertOctagon size={20} aria-hidden="true" />
            <div className="text-body-strong">{copy.onMedication}</div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="fast-milk-volume" className="block text-field-label text-ink-muted">{copy.volume}</label>
          <div className="relative">
            <input
              id="fast-milk-volume"
              {...fieldErrorProps('fast-milk-volume', errorFor('volume'))}
              inputMode="decimal"
              type="number"
              step="0.1"
              className="w-full bg-white border-2 border-ink/10 rounded-xl p-6 text-center text-numeric-input text-brand focus:outline-none focus:border-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.0"
              value={formData.volume}
              onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
              required
            />
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-stat-value text-ink/45">L</span>
          </div>
          <FieldError id="fast-milk-volume" message={errorFor('volume')} />
        </div>

        {/* Edit has three actions: on phones, Cancel and Delete share a row and the primary
            action takes the full width below them, within thumb reach. */}
        <div className="pt-4 flex flex-wrap gap-3 sm:flex-nowrap">
          {onClose && (
            <button type="button" onClick={onClose} className={`px-6 py-4 rounded-xl text-control text-ink-muted hover:bg-ink/20 hover:text-ink-strong transition-colors ${isEditMode ? 'flex-1 sm:flex-none' : ''}`}>{copy.cancel}</button>
          )}
          {isEditMode && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending || isDeleting}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-danger/20 px-5 py-4 text-control text-danger hover:bg-danger/5 disabled:opacity-60 transition-colors sm:flex-none"
            >
              {isDeleting ? copy.deleting : copy.deleteRecord}
            </button>
          )}
          <button type="submit" disabled={!formData.cowId || !formData.volume || !formData.date || isLocked || isPending} className={`flex-1 bg-brand text-surface text-control py-4 rounded-xl hover:bg-brand-dark disabled:opacity-70 transition-all active:scale-95 ${isEditMode ? 'basis-full sm:basis-auto' : ''}`}>
            {isPending ? copy.saving : isEditMode ? copy.update : copy.save}
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

  // Who can be named as milker: the farm's active staff. Roles that can't read the staff list
  // get an error here, and the picker simply isn't shown (the recorder stays the milker).
  const { data: staff } = useQuery({
    queryKey: ['milk-log-milkers', tenantId, farmId],
    queryFn: () => hrApi.listStaff(),
    enabled: !!farmId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const milkers = (Array.isArray(staff) ? staff : [])
    .filter((employee) => employee.id != null && employee.name && String(employee.status).toUpperCase() === 'ACTIVE');

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
        settleEntry('info', queuedOfflineMessage());
        return;
      }
      if (onSaveSuccess) onSaveSuccess(data?.received || data?.updated || data);
      settleEntry('success', isEditMode ? copy.updated : copy.saved);
    },
    onError: async (error, { entry, idempotencyKey }) => {
      const code = getApiErrorCode(error);

      if (code === 'DUPLICATE_MILK_ENTRY') {
        settleEntry('warning', copy.duplicate);
        return;
      }

      // No answer from the server and apiClient didn't queue it (an error it doesn't treat
      // as offline). The request may still have arrived, so it is queued under the same key:
      // the backend then saves it once.
      if (!error?.response && !isEditMode) {
        try {
          await offlineQueue.enqueue(entry, { idempotencyKey });
          settleEntry('info', queuedOfflineMessage());
          return;
        } catch (queueError) {
          reportError(queueError, { where: 'FastMilkLog.queue' });
        }
      }

      // The first try is still being saved; keep the key so the next try is matched to it.
      if (code === 'IDEMPOTENCY_IN_PROGRESS') {
        setMessageType('warning');
        setMessage(copy.inProgress);
        return;
      }
      // Should not happen (the key follows the content), but never get stuck on a bad key.
      if (code === 'IDEMPOTENCY_KEY_REUSED') submissionKey.reset();

      reportError(error, { where: 'FastMilkLog.save' });
      setMessageType('danger');
      setMessage(error?.response?.status === 401
        ? copy.signedOut
        : getApiErrorMessage(error, copy.saveFailed));
    },
    onSettled: () => {
      submitInFlight.current = false;
    },
  });

  const serverFields = useServerFieldErrors(mutation.error, SERVER_FIELDS);
  // A server error stays under its field until the farmer changes the form.
  const editForm = (next) => {
    if (mutation.isError) mutation.reset();
    setFormData(next);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitInFlight.current || mutation.isPending || isDeleting) return;
    if (!formData.cowId || !formData.volume || !formData.date || isLocked) return;

    const amount = parseFloat(formData.volume);
    if (Number.isNaN(amount) || amount < 0) {
      setMessageType('danger');
      setMessage(copy.invalidAmount);
      return;
    }

    if (formData.date > todayIso()) {
      setMessageType('danger');
      setMessage(copy.futureDate);
      return;
    }

    if (!formData.session) {
      setMessageType('danger');
      setMessage(copy.chooseSession);
      return;
    }

    const entry = {
      cow_id: formData.cowId,
      amount,
      session: formData.session,
      milking_date: formData.date,
    };
    const originalMilker = record?.milkerId != null ? String(record.milkerId) : '';
    if (isEditMode) {
      // Sent only when changed; null clears it, so the record shows who entered it again.
      if (formData.milkerId !== originalMilker) entry.milker_id = formData.milkerId ? Number(formData.milkerId) : null;
    } else if (formData.milkerId) {
      entry.milker_id = Number(formData.milkerId);
    }
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
      title: copy.deleteTitle,
      message: copy.deleteMessage(description),
      type: 'danger',
      confirmText: copy.deleteConfirm,
      cancelText: copy.deleteKeep,
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await productionApi.deleteYield(record.id);
      // Offline, apiClient queues the delete: the record stays until it is sent.
      if (isQueuedOffline(response?.data)) {
        toast(copy.deleteQueued);
      } else {
        toast.success(copy.deleted);
      }
      if (onDeleteSuccess) onDeleteSuccess(record);
      if (onClose) onClose();
    } catch (error) {
      reportError(error, { where: 'FastMilkLog.delete' });
      setMessageType('danger');
      setMessage(getApiErrorMessage(error, copy.deleteFailed));
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
        milkers={milkers}
        isLocked={isLocked}
        formData={formData}
        setFormData={editForm}
        errorFor={serverFields.errorFor}
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
