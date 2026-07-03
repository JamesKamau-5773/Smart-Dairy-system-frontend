import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function SlidePanel({ isOpen, onClose, title, subtitle, headerMeta, children }) {
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
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-slate-900/35 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[44rem] flex-col border-l border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-gray-900">{title}</h2>
            {headerMeta}
            {subtitle && <p className="mt-1 text-sm font-medium text-gray-500">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

      </aside>
    </div>
  );
}