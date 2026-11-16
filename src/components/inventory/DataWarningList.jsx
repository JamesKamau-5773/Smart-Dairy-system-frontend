import { AlertTriangle } from 'lucide-react';
import { feedCopy } from '../../i18n/feed';
import { tone } from '../ui/tones';

const { dataWarnings: copy } = feedCopy;
const { icon: iconTone } = tone('attention');

/**
 * Nutrition values the backend thinks are wrong (for example protein typed as a
 * percentage into a g/kg field), with the server's suggested correction. A quiet
 * line under the item rather than a box, so a list of items stays readable.
 * `onApplyFix` is passed only to people allowed to change the item.
 */
export default function DataWarningList({ warnings, itemName, onApplyFix, pendingCode = null }) {
  if (!warnings?.length) return null;

  return (
    <ul className="space-y-1.5">
      {warnings.map((warning) => (
        <li key={`${warning.code}:${warning.field}`} className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
          <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${iconTone}`} aria-hidden="true" />
          <span className="min-w-0">
            {itemName && <span className="font-semibold text-ink">{itemName}: </span>}
            {warning.message}
            {warning.suggested_value !== undefined && warning.suggested_value !== null && (
              <span className="font-semibold text-ink"> {copy.suggested(warning.suggested_value)}.</span>
            )}
            {onApplyFix && (
              <button
                type="button"
                onClick={() => onApplyFix(warning.code)}
                disabled={pendingCode !== null}
                className="ml-2 inline-flex items-center font-semibold text-brand underline-offset-4 hover:text-brand-dark hover:underline disabled:opacity-50"
              >
                {pendingCode === warning.code ? copy.applying : copy.apply}
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
