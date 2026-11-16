import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage, herdApi, productionApi } from '../../lib/backendApi';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { isActiveCalf, todayLocalIso, validateCalfMilkFeed } from '../../lib/milkDisposition';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import BaseModal from '../ui/BaseModal';
import { milkCopy } from '../../i18n/milk';

const createInitialValues = (date) => ({
  calfId: '',
  liters: '',
  date: date || todayLocalIso(),
  notes: '',
});

function CalfMilkFeedForm({ onClose, initialDate }) {
  const copy = milkCopy.calfFeed;
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => createInitialValues(initialDate));
  const [validationMessage, setValidationMessage] = useState('');

  const herdQuery = useQuery({
    queryKey: QUERY_KEYS.COWS(tenantId, farmId),
    queryFn: () => herdApi.list(),
    enabled: !!farmId,
  });

  const activeCalves = useMemo(
    () => (Array.isArray(herdQuery.data) ? herdQuery.data.filter(isActiveCalf) : []),
    [herdQuery.data]
  );

  const mutation = useMutation({
    mutationFn: (payload) => productionApi.createMilkDisposition(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MILK_DISPOSITIONS(tenantId, farmId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY(tenantId, farmId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.YIELD_SUMMARY(tenantId, farmId) }),
        queryClient.invalidateQueries({ queryKey: ['production-summary', tenantId, farmId] }),
      ]);
      toast.success(copy.recorded);
      onClose();
    },
    onError: (error) => {
      setValidationMessage(getApiErrorMessage(error, copy.failed));
    },
  });

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (validationMessage) setValidationMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const error = validateCalfMilkFeed(values);
    if (error) {
      setValidationMessage(error);
      return;
    }
    mutation.mutate(values);
  };

  return (
    <BaseModal closeOnBackdrop isOpen onClose={mutation.isPending ? undefined : onClose} title={copy.title}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border-b border-ink/10 pb-4">
          <div>
            <p className="text-sm font-semibold text-ink">{copy.allocation}</p>
            <p className="text-xs text-ink-muted">{copy.allocationHint}</p>
          </div>
        </div>

        {validationMessage && (
          <div role="alert" className="border-l-4 border-danger bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
            {validationMessage}
          </div>
        )}

        <label className="form-control">
          <span className="label-text">{copy.calf}</span>
          <select
            name="calfId"
            value={values.calfId}
            onChange={updateValue}
            className="input-machined w-full"
            disabled={mutation.isPending || herdQuery.isLoading}
            required
          >
            <option value="">{herdQuery.isLoading ? copy.loadingCalves : copy.selectCalf}</option>
            {activeCalves.map((calf) => (
              <option key={calf.id} value={calf.id}>{formatCowIdentity(calf)}</option>
            ))}
          </select>
          {!herdQuery.isLoading && activeCalves.length === 0 && (
            <span className="mt-1 text-xs font-medium text-warning-dark">{copy.noCalves}</span>
          )}
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="form-control">
            <span className="label-text">{copy.date}</span>
            <input
              type="date"
              name="date"
              value={values.date}
              max={todayLocalIso()}
              onChange={updateValue}
              className="input-machined w-full"
              disabled={mutation.isPending}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">{copy.liters}</span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                name="liters"
                value={values.liters}
                min="0.01"
                step="0.01"
                onChange={updateValue}
                className="input-machined w-full pr-10 tabular-nums"
                placeholder="0.00"
                disabled={mutation.isPending}
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">L</span>
            </div>
          </label>
        </div>

        <label className="form-control">
          <span className="label-text">{copy.notes}</span>
          <textarea
            name="notes"
            value={values.notes}
            onChange={updateValue}
            rows="3"
            maxLength="500"
            className="input-machined w-full resize-y"
            placeholder={copy.notesPlaceholder}
            disabled={mutation.isPending}
          />
        </label>

        <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="btn-secondary justify-center">
            {copy.cancel}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || herdQuery.isLoading || activeCalves.length === 0}
            className="btn-command justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {mutation.isPending ? copy.recording : copy.submit}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

export default function CalfMilkFeedModal({ isOpen, onClose, initialDate = '' }) {
  if (!isOpen) return null;
  return <CalfMilkFeedForm key={initialDate || 'today'} onClose={onClose} initialDate={initialDate} />;
}