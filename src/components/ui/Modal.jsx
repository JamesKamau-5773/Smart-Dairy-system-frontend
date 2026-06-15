import React from 'react';
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
      <div className="card-machined w-full max-w-2xl bg-surface animate-glass-in relative z-10 !shadow-[0_20px_50px_rgba(2,132,199,0.22)] max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center gap-4 border-b border-ink/10 p-4 sm:p-6 bg-surface-raised sticky top-0">
          <h3 className="font-sans font-black text-lg sm:text-xl normal-case tracking-tight text-brand flex-1 min-w-0">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] hover:bg-danger hover:text-surface transition-colors border-2 border-ink hover:scale-110 flex-shrink-0"
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