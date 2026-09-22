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
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0F172A]/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="flex items-start justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 overflow-y-auto">{children}</div>

        {footerActions && (
          <footer className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
            {footerActions}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
