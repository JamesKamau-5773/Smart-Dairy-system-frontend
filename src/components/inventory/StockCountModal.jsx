import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import SubmitButton from '../auth/SubmitButton';
import { feedCopy } from '../../i18n/feed';
import { getFeedErrorMessage } from '../../lib/feedErrors';
import { describeCountDifference, validateStockCount } from '../../lib/stockChangeForm';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { tone } from '../ui/tones';

const { stockCount: copy } = feedCopy;

/**
 * Enter what is physically in the store; the server records the gain or loss.
 * Online only: the count must be compared with the latest balance.
 */
export default function StockCountModal({ item, onClose, onSubmit }) {
  const online = useOnlineStatus();
  const [counted, setCounted] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [pending, setPending] = useState(false);
  const stock = Number(item.stock?.value ?? item.currentStock ?? 0);
  const unit = item.stock?.unit ?? item.unit ?? 'units';
  const difference = describeCountDifference(counted, stock);

  const submit = async (event) => {
    event.preventDefault();
    const errors = validateStockCount(counted);
    setError(errors.counted ?? '');
    if (errors.counted) return;
    setPending(true);
    setSubmitError('');
    try {
      await onSubmit(item, Number(counted));
      onClose();
    } catch (caught) {
      setSubmitError(getFeedErrorMessage(caught, copy.failed));
    } finally {
      setPending(false);
    }
  };

  return (
    <BaseModal isOpen onClose={onClose} title={copy.title} subtitle={copy.subtitle(item.name, stock, unit)}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="stock-count-value" className="mb-1.5 block text-field-label text-ink-muted">{`${copy.counted} (${unit})`}</label>
          <input
            id="stock-count-value"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={counted}
            onChange={(event) => {
              setCounted(event.target.value);
              setError('');
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby="stock-count-hint"
            className="input-machined w-full text-control"
          />
          <p id="stock-count-hint" className="mt-1.5 text-meta text-ink-muted">{copy.countHint}</p>
          {error && <p className="mt-1 text-meta text-danger">{error}</p>}
        </div>

        {difference && (
          <p role="status" className={`rounded-lg p-3 text-body-strong ${difference.kind === 'loss' ? tone('attention').surface : tone('info').surface} text-ink`}>
            {difference.kind === 'match' ? copy.preview.match : copy.preview[difference.kind](difference.difference, unit)}
          </p>
        )}

        {!online && <p className="text-meta text-ink-muted">{copy.onlineOnly}</p>}
        {submitError && <p role="alert" className="text-meta text-danger">{submitError}</p>}
        <SubmitButton pending={pending} pendingLabel={copy.submitting} disabled={!online}>{copy.submit}</SubmitButton>
      </form>
    </BaseModal>
  );
}
