import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
      {/* Solid backdrop fade without blurring the modal or underlying content */}
      <div
        className="absolute inset-0 bg-brand-dark/40 transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* 3D Machined Modal Body with Glass Entrance */}
      <div className="card-machined relative z-10 my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl !overflow-y-auto overscroll-contain touch-pan-y border-slate-200 bg-white/95 backdrop-blur animate-glass-in sm:max-h-[90vh]">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-ink/10 bg-surface-raised p-4 sm:p-6">
          <h3 className="font-sans font-black text-lg sm:text-xl normal-case tracking-tight text-brand flex-1 min-w-0">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="btn-ghost h-11 w-11 !p-0 flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>
        
        <div className="p-4 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
