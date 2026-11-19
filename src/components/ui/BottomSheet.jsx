import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * The app's one bottom sheet (phones and tablets): a drag handle, a title row with a 44px
 * close button, and the caller's content. role="dialog" with aria-modal; focus moves in on
 * open and stays inside; Escape, the backdrop or ✕ close it, and focus goes back to what
 * opened it (useFocusTrap).
 *
 * title:      the sheet's heading (names the dialog)
 * header:     optional content under the title (e.g. an amount and a date)
 * closeLabel: the close button's name
 */
export default function BottomSheet({ open, onClose, title, titleClassName = 'text-section-title text-ink', header, closeLabel, children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useFocusTrap(panelRef, open, { onEscape: onClose });
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200 motion-reduce:animate-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-300" aria-hidden="true" />

        <div className="flex items-start gap-3 px-4 pt-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className={`m-0 truncate ${titleClassName}`}>{title}</h2>
            {header}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-50 hover:text-ink-900"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body,
  );
}
