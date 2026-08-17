import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { herdApi, productionApi, safetyApi } from '../../lib/backendApi';
import AlertBanner from '../../components/ui/AlertBanner';
import offlineQueue from '../../lib/offlineQueue';
import { ArrowLeft, Droplets, CheckCircle2, AlertOctagon, Trash2, X } from 'lucide-react';

const todayIso = () => new Date().toISOString().slice(0, 10);

const SESSION_OPTIONS = ['morning', 'midday', 'evening'];

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
  herd,
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
}) => {
  const isEditMode = mode === 'edit';

  if (saveStatus === 'success') {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 animate-reveal min-h-[400px] shadow-[0_20px_60px_rgba(3,105,161,0.12)]">
        <CheckCircle2 size={64} className="text-success scale-150 mb-2" />
        <h3 className="font-black text-3xl text-ink">Saved!</h3>
        <p className="text-ink-muted font-bold">Ready for the next cow...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mt-20 bg-white rounded-3xl shadow-2xl border border-ink/10 overflow-hidden relative animate-reveal">
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
        <div className="space-y-2">
          <label className="text-[11px] font-black text-ink-muted uppercase tracking-widest block">Select Cow</label>
          <div className="relative">
            <select
              value={formData.cowId}
              onChange={(e) => setFormData({ ...formData, cowId: e.target.value })}
              className="w-full appearance-none bg-white border-2 border-ink/10 rounded-xl p-4 pr-10 text-lg font-bold text-ink-strong focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer shadow-sm"
              required
            >
              <option value="" disabled>Choose cow...</option>
              {displayHerd.map((cow) => (
                <option key={cow.id} value={cow.id}>
                  {cow.name} ({cow.tag_number || cow.tag})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-ink-muted">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-ink-muted uppercase tracking-widest block">Date</label>
            <input
              type="date"
              value={formData.date}
              max={todayIso()}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-white border-2 border-ink/10 rounded-xl p-4 text-sm font-bold text-ink-strong focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all shadow-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-ink-muted uppercase tracking-widest block">Session</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl border-2 border-ink/10 bg-white p-1 shadow-sm">
              {SESSION_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, session: s })}
                  className={`rounded-lg px-2 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    formData.session === s ? 'bg-brand text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
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
              className="w-full bg-white border-2 border-ink/10 rounded-xl p-6 text-center text-5xl font-black text-brand focus:outline-none focus:border-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.0"
              value={formData.volume}
              onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
              required
            />
            <span className="absolute right-8 bottom-7 font-sans font-bold text-ink/45 text-xl">L</span>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          {onClose && (
            <button type="button" onClick={onClose} className="px-6 py-4 rounded-xl font-bold text-ink-muted hover:bg-ink/20 hover:text-ink-strong transition-colors">Cancel</button>
          )}
          {isEditMode && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending || isDeleting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger/20 px-5 py-4 font-bold text-danger hover:bg-danger/5 disabled:opacity-60 transition-colors"
            >
              <Trash2 size={16} /> {isDeleting ? 'Deleting...' : 'Delete Record'}
            </button>
          )}
          <button type="submit" disabled={!formData.cowId || !formData.volume || !formData.date || isLocked || isPending} className="flex-1 bg-brand text-surface font-black text-lg py-4 rounded-xl hover:bg-brand-dark disabled:opacity-70 transition-all active:scale-95 shadow-lg shadow-brand/70">
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

  useEffect(() => {
    setFormData(normalizeFormData(record, defaultCreateDate));
    setSaveStatus(null);
    setMessage('');
    setMessageType('info');
    setIsDeleting(false);
  }, [record, mode, defaultCreateDate]);

  // Mutation with idempotency and robust error handling
  const mutation = useMutation({
    mutationFn: async (payload) => {
      const date = payload.milking_date || payload.milkingDate || new Date().toISOString().slice(0, 10);
      const requestPayload = {
        cow_id: payload.cowId,
        amount: Number(payload.volume ?? payload.amount ?? 0),
        session: payload.session || 'morning',
        milking_date: date,
        milkingDate: date,
      };
      const idempotencyKey = isEditMode
        ? `fastlog-edit:${record.id}:${requestPayload.cow_id}:${date}:${requestPayload.session}`
        : `fastlog:${requestPayload.cow_id}:${date}:${requestPayload.session}`;

      if (isEditMode) {
        await productionApi.deleteYield(record.id);
      }

      return productionApi.createYield(requestPayload, { headers: { 'Idempotency-Key': idempotencyKey } });
    },
    onSuccess: (data, variables) => {
      const rawSavedRecord = data?.received || data?.updated || data;
      // Backend currently echoes today's date instead of the submitted milking date;
      // trust what the user entered until the server-side bug is fixed.
      const submittedDate = variables?.milkingDate;
      const savedRecord = submittedDate
        ? { ...rawSavedRecord, date: submittedDate, milkingDate: submittedDate, milking_date: submittedDate }
        : rawSavedRecord;
      setSaveStatus('success');
      setMessage(isEditMode ? 'Updated' : 'Saved');
      setMessageType('success');
      if (onSaveSuccess) onSaveSuccess(savedRecord);
      setTimeout(() => {
        setSaveStatus(null);
        if (!isEditMode) {
          setFormData(normalizeFormData(null, defaultCreateDate));
        }
        setMessage('');
        if (isEditMode && onClose) {
          onClose();
        } else if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 1400);
    },
    onError: (err, variables) => {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 409 && code === 'DUPLICATE_MILK_ENTRY') {
        setMessageType('warning');
        setMessage('Already recorded for this cow and session. Duplicate blocked.');
        setSaveStatus('success');
        setTimeout(() => {
          setSaveStatus(null);
          setFormData(normalizeFormData(null, defaultCreateDate));
          setMessage('');
          if (inputRef.current) inputRef.current.focus();
        }, 1400);
        return;
      }

      const isNetwork = !err?.response && !isEditMode;
      if (isNetwork) {
        try {
          offlineQueue.enqueue({
            cow_id: variables.cowId,
            amount: Number(variables.volume ?? variables.amount ?? 0),
            session: variables.session || 'morning',
            milking_date: variables.milking_date || variables.milkingDate || todayIso(),
            milkingDate: variables.milkingDate || variables.milking_date || todayIso(),
          });
          setMessageType('info');
          setMessage('Saved to device. Will sync when internet returns.');
          setSaveStatus('success');
          setTimeout(() => {
            setSaveStatus(null);
            setFormData(normalizeFormData(null, defaultCreateDate));
            setMessage('');
            if (inputRef.current) inputRef.current.focus();
          }, 1400);
          return;
        } catch (e) {
          console.error('Failed to enqueue offline payload', e);
        }
      }

      console.error('Fast log save failed', err);
      setMessageType('danger');
      setMessage('Failed to save. Try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cowId || !formData.volume || !formData.date || isLocked || mutation.isLoading || isDeleting) return;

    const numeric = parseFloat(formData.volume);
    if (Number.isNaN(numeric) || numeric < 0) {
      setMessageType('danger');
      setMessage('Enter a valid amount');
      return;
    }

    if (formData.date > todayIso()) {
      setMessageType('danger');
      setMessage('Milking date cannot be in the future');
      return;
    }

    mutation.mutate({
      cowId: formData.cowId,
      volume: numeric,
      session: formData.session,
      milkingDate: formData.date,
      id: record?.id,
    });
  };

  const handleDelete = async () => {
    if (!isEditMode || !record?.id || isDeleting || mutation.isLoading) return;
    if (!window.confirm('Delete this milk record?')) return;

    setIsDeleting(true);
    try {
      await productionApi.deleteYield(record.id);
      setMessageType('success');
      setMessage('Deleted');
      if (onDeleteSuccess) onDeleteSuccess(record);
      setTimeout(() => {
        setMessage('');
        setIsDeleting(false);
        setSaveStatus(null);
        if (onClose) onClose();
      }, 800);
    } catch (err) {
      setIsDeleting(false);
      setMessageType('danger');
      setMessage('Failed to delete. Try again.');
      console.error('Fast log delete failed', err);
    }
  };

  useEffect(() => {
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 120);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4">
      <FastMilkUI
        herd={herd}
        displayHerd={displayHerd}
        isLocked={isLocked}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        saveStatus={saveStatus}
        isPending={mutation.isLoading}
        isDeleting={isDeleting}
        onClose={onClose}
        onBack={!onClose ? () => navigate(-1) : undefined}
        message={message}
        messageType={messageType}
        onDismissMessage={() => setMessage('')}
        mode={mode}
      />

      {/* Success handled inside FastMilkUI; no extra floating overlay needed */}
    </div>,
    document.body
  );
}
