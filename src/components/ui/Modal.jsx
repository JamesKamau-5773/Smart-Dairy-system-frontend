import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, subtitle, children }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-brand-dark/40 p-3 touch-pan-y sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />

      <section
        aria-label={title}
        aria-modal="true"
        role="dialog"
        className="card-machined relative z-10 my-auto flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-2xl flex-col overflow-hidden border-slate-200 bg-white/95 backdrop-blur animate-glass-in sm:max-h-[90dvh]"
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-ink/10 bg-surface-raised p-4 sm:p-6">
          <h3 className="min-w-0 flex-1 font-sans text-lg font-black normal-case tracking-tight text-brand sm:text-xl">
            {title}
            {subtitle && <span className="mt-1 block text-sm font-normal tracking-normal text-ink-muted">{subtitle}</span>}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex h-11 w-11 shrink-0 items-center justify-center !p-0"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 touch-pan-y sm:p-8">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
