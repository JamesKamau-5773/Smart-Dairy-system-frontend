import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function SlidePanel({ isOpen, onClose, title, subtitle, children }) {
  // Prevent background scrolling when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // CHANGED: Added items-center and justify-center to place it perfectly in the middle
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      
      {/* Backdrop (Darkens the rest of the screen) */}
      <div 
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Container */}
      {/* CHANGED: max-h-[90vh], rounded-2xl, and zoom-in-95 animation */}
      <div className="relative w-full max-w-lg bg-surface max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 rounded-2xl border border-ink/10 overflow-hidden">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/10 bg-surface-raised/80">
          <div>
            <h2 className="text-lg font-black text-ink">{title}</h2>
            {subtitle && <p className="text-xs font-medium text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-colors shrink-0 ml-4"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Panel Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
        
      </div>
    </div>
  );
}