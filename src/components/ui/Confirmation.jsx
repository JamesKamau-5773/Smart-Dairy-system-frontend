/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { commonCopy } from '../../i18n/common';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const TYPE_STYLES = {
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-brand-800',
    buttonColor: 'bg-brand-700 hover:bg-brand-800',
    bgColor: 'bg-brand-50',
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-brand-dark',
    buttonColor: 'bg-brand-dark hover:bg-brand-950',
    bgColor: 'bg-brand-50',
  },
  info: {
    icon: Info,
    iconColor: 'text-brand',
    buttonColor: 'bg-brand hover:bg-brand-dark',
    bgColor: 'bg-brand/5',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-brand',
    buttonColor: 'bg-brand hover:bg-brand-dark',
    bgColor: 'bg-brand/5',
  },
};

// Read when a dialog opens, so the defaults follow the current language.
const defaults = () => ({
  title: commonCopy.confirm.title,
  message: commonCopy.confirm.message,
  type: 'warning',
  confirmText: commonCopy.confirm.confirm,
  cancelText: commonCopy.confirm.cancel,
  requireText: '',
});

/**
 * Phone keyboards add capitals, double spaces and curly apostrophes; none of that should stop
 * a farmer from confirming. Compares ignoring case, extra spaces and quote style.
 */
export const matchesConfirmText = (typed, expected) => {
  const normalize = (value) => String(value ?? '')
    .replace(/[‘’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalize(expected) !== '' && normalize(typed) === normalize(expected);
};

function ConfirmationDialog({
  title, message, type, confirmText, cancelText, requireText, onConfirm, onCancel, isLoading,
}) {
  const [typed, setTyped] = React.useState('');
  const inputId = React.useId();
  const config = TYPE_STYLES[type] || TYPE_STYLES.warning;
  const Icon = config.icon;
  const needsTyping = Boolean(requireText);
  const canConfirm = !isLoading && (!needsTyping || matchesConfirmText(typed, requireText));

  // Escape cancels, and Tab stays in the dialog (even when it opens over another one).
  const formRef = React.useRef(null);
  useFocusTrap(formRef, true, { onEscape: () => { if (!isLoading) onCancel(); } });

  const submit = (event) => {
    event.preventDefault();
    if (canConfirm) onConfirm();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-ink/50 p-3 backdrop-blur-sm touch-pan-y sm:items-center sm:p-6">
      <form ref={formRef} tabIndex={-1} onSubmit={submit} role="dialog" aria-modal="true" aria-label={title} className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl bg-surface p-5 outline-none touch-pan-y sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon size={24} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
        </div>

        <div className={`mb-6 rounded-lg ${config.bgColor} p-3`}>
          <p className="text-sm leading-relaxed text-ink-muted">{message}</p>
        </div>

        {needsTyping && (
          <div className="mb-6 space-y-2">
            <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
              {commonCopy.confirm.typeBefore} <span className="font-mono font-bold">{requireText}</span> {commonCopy.confirm.typeAfter}
            </label>
            <input
              id={inputId}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              // The dialog opened for this: put the cursor where the farmer has to type.
              autoFocus
              disabled={isLoading}
              className="input-machined w-full"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary min-h-11 flex-1 px-4 py-2.5 text-sm font-semibold"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            className={`btn-command min-h-11 flex-1 ${config.buttonColor} px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50`}
            aria-label={confirmText}
          >
            {isLoading ? commonCopy.confirm.pleaseWait : confirmText}
          </button>
        </div>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {title}: {message}
        </div>
      </form>
    </div>,
    document.body,
  );
}

/**
 * The app's one confirmation dialog, for destructive or important actions. Escape cancels.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {string} [props.title]
 * @param {React.ReactNode} [props.message] What will happen, with the record's details.
 * @param {'warning'|'danger'|'info'|'success'} [props.type]
 * @param {string} [props.confirmText] Label of the confirm button, e.g. "Delete".
 * @param {string} [props.cancelText] Label of the cancel button, e.g. "Keep".
 * @param {string} [props.requireText] For high-risk deletes: the confirm button stays
 *   disabled until this text (e.g. the cow's tag) is typed. Case, extra spaces and quote
 *   style don't matter.
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @param {boolean} [props.isLoading] Disables both buttons while the action runs.
 *
 * @example
 * const confirmation = useConfirmation();
 * const ok = await confirmation.confirm({ title: 'Delete Neema?', message: '…', type: 'danger',
 *   confirmText: 'Delete', cancelText: 'Keep', requireText: 'KE-012' });
 * <Confirmation {...confirmation} />
 */
export default function Confirmation({ isOpen = false, ...props }) {
  if (!isOpen) return null;
  return <ConfirmationDialog {...defaults()} {...props} />;
}

/**
 * State for one `Confirmation`. `confirm(options)` opens it with those options (any left out
 * fall back to the defaults, never to the previous dialog's) and resolves to true or false.
 *
 * @returns {object} Props to spread on `<Confirmation />`, plus `confirm`, `close` and `setLoading`.
 */
export function useConfirmation() {
  const [state, setState] = React.useState(() => ({ ...defaults(), isOpen: false, isLoading: false }));
  const [callbacks, setCallbacks] = React.useState({
    onConfirm: () => {},
    onCancel: () => {},
  });

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const confirm = React.useCallback((options = {}) => {
    setState({ ...defaults(), ...options, isOpen: true, isLoading: false });

    return new Promise((resolve) => {
      setCallbacks({
        onConfirm: () => {
          resolve(true);
          close();
        },
        onCancel: () => {
          resolve(false);
          close();
        },
      });
    });
  }, [close]);

  const setLoading = React.useCallback((isLoading) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  return {
    ...state,
    confirm,
    close,
    setLoading,
    ...callbacks,
  };
}
