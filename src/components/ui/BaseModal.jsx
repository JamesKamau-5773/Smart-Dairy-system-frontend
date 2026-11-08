import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Shared enterprise modal frame. Form state and actions intentionally remain
 * with the calling component; this component only owns the modal layout.
 */
export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
}) {
  // Escape closes the dialog, as every other dialog on the web does.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/50 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[90dvh]">
        <header className="flex items-start justify-between p-6 border-b border-ink-200">
          <div>
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="rounded-md p-1 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700">
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 touch-pan-y sm:p-6">{children}</div>

        {footerActions && (
          <footer className="flex items-center justify-end gap-3 px-6 py-4 bg-ink-50 border-t border-ink-200">
            {footerActions}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
