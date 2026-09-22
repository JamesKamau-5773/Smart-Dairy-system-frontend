import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Baby, Droplets, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage, herdApi, productionApi } from '../../lib/backendApi';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { isActiveCalf, todayLocalIso, validateCalfMilkFeed } from '../../lib/milkDisposition';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import Modal from '../ui/Modal';

const createInitialValues = (date) => ({
  calfId: '',
  liters: '',
  date: date || todayLocalIso(),
  notes: '',
});

function CalfMilkFeedForm({ onClose, initialDate }) {
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
      toast.success('Calf feeding recorded.');
      onClose();
    },
    onError: (error) => {
      setValidationMessage(getApiErrorMessage(error, 'Could not record calf feeding.'));
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
    <Modal isOpen onClose={mutation.isPending ? undefined : onClose} title="Record calf milk feeding">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 border-b border-ink/10 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Baby size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Milk allocation</p>
            <p className="text-xs text-ink-muted">The available balance will be confirmed when this record is saved.</p>
          </div>
        </div>

        {validationMessage && (
          <div role="alert" className="border-l-4 border-danger bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
            {validationMessage}
          </div>
        )}

        <label className="form-control">
          <span className="label-text">Calf</span>
          <select
            name="calfId"
            value={values.calfId}
            onChange={updateValue}
            className="input-machined w-full"
            disabled={mutation.isPending || herdQuery.isLoading}
            required
          >
            <option value="">{herdQuery.isLoading ? 'Loading active calves...' : 'Select active calf'}</option>
            {activeCalves.map((calf) => (
              <option key={calf.id} value={calf.id}>{formatCowIdentity(calf)}</option>
            ))}
          </select>
          {!herdQuery.isLoading && activeCalves.length === 0 && (
            <span className="mt-1 text-xs font-medium text-warning-dark">No active calves are available.</span>
          )}
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="form-control">
            <span className="label-text">Feeding date</span>
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
            <span className="label-text">Milk consumed (liters)</span>
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
          <span className="label-text">Notes (optional)</span>
          <textarea
            name="notes"
            value={values.notes}
            onChange={updateValue}
            rows="3"
            maxLength="500"
            className="input-machined w-full resize-y"
            placeholder="e.g. Morning feeding"
            disabled={mutation.isPending}
          />
        </label>

        <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="btn-secondary justify-center">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || herdQuery.isLoading || activeCalves.length === 0}
            className="btn-command justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Droplets size={16} />}
            {mutation.isPending ? 'Recording...' : 'Record feeding'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function CalfMilkFeedModal({ isOpen, onClose, initialDate = '' }) {
  if (!isOpen) return null;
  return <CalfMilkFeedForm key={initialDate || 'today'} onClose={onClose} initialDate={initialDate} />;
}