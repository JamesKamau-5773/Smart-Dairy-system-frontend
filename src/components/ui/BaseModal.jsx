import { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { commonCopy } from '../../i18n/common';

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

/**
 * The app's one dialog frame: backdrop, header with title and close button, a scrolling body
 * and an optional footer. Escape closes it, Tab stays inside, and focus returns to the opener
 * on close. Form state and actions stay with the caller; this only owns the frame.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.title Shown in the header and used as the dialog's accessible name.
 * @param {React.ReactNode} [props.subtitle]
 * @param {React.ReactNode} [props.icon] Shown before the title.
 * @param {keyof WIDTHS} [props.size] Maximum width; '2xl' by default.
 * @param {boolean} [props.closeOnBackdrop] Tapping outside closes it (off by default, so a
 *   stray tap can't lose a half-filled form).
 * @param {boolean} [props.dismissible] False while saving: Escape, the backdrop and the close
 *   button do nothing.
 * @param {string} [props.closeLabel] Accessible name of the close button.
 * @param {(event: React.FormEvent) => void} [props.onSubmit] Makes the body and footer one
 *   form, so a submit button in `footerActions` submits it.
 * @param {React.ReactNode} [props.footerActions]
 * @param {React.ReactNode} props.children
 *
 * @example
 * <BaseModal isOpen={open} onClose={close} title="Restock" size="lg" onSubmit={save}
 *   dismissible={!saving} footerActions={<button type="submit">Save</button>}>
 *   …fields…
 * </BaseModal>
 */
export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = '2xl',
  closeOnBackdrop = false,
  dismissible = true,
  closeLabel,
  onSubmit,
  footerActions,
  children,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const requestClose = () => {
    if (dismissible) onClose?.();
  };
  useFocusTrap(panelRef, isOpen, { onEscape: requestClose });

  if (!isOpen) return null;

  const Panel = onSubmit ? 'form' : 'div';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-brand-dark/50 p-3 backdrop-blur-sm touch-pan-y sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) requestClose();
      }}
    >
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onSubmit={onSubmit}
        className={`my-auto flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full ${WIDTHS[size] ?? WIDTHS['2xl']} flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none sm:max-h-[90dvh]`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-ink-200 p-4 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && <span className="mt-0.5 shrink-0 text-brand" aria-hidden="true">{icon}</span>}
            <div className="min-w-0">
              <h2 id={titleId} className="break-words text-lg font-bold text-ink sm:text-xl">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={!dismissible}
            aria-label={closeLabel ?? commonCopy.modal.close}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700 disabled:opacity-40 sm:h-9 sm:w-9"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 touch-pan-y sm:p-6">{children}</div>

        {footerActions && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-ink-200 bg-ink-50 px-4 py-4 sm:px-6">
            {footerActions}
          </footer>
        )}
      </Panel>
    </div>,
    document.body,
  );
}
