import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Solid backdrop fade without blurring the modal or underlying content */}
      <div
        className="absolute inset-0 bg-brand-dark/40 transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* 3D Machined Modal Body with Glass Entrance */}
      <div className="card-machined relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto border-slate-200 bg-white/90 backdrop-blur animate-glass-in">
        <header className="flex justify-between items-center gap-4 border-b border-ink/10 p-4 sm:p-6 bg-surface-raised sticky top-0">
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