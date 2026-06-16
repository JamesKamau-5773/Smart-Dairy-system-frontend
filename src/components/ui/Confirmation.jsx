import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

/**
 * Confirmation Dialog Component
 * Enterprise-grade confirmation for destructive or important actions
 */
export default function Confirmation({
  isOpen = false,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm = () => {},
  onCancel = () => {},
  isLoading = false,
  isDangerous = false,
}) {
  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      buttonColor: 'bg-amber-500 hover:bg-amber-600',
      bgColor: 'bg-amber-50',
    },
    danger: {
      icon: XCircle,
      iconColor: 'text-rose-500',
      buttonColor: 'bg-rose-500 hover:bg-rose-600',
      bgColor: 'bg-rose-50',
    },
    info: {
      icon: Info,
      iconColor: 'text-brand',
      buttonColor: 'bg-brand hover:bg-brand-dark',
      bgColor: 'bg-brand/5',
    },
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  };

  const config = typeStyles[type] || typeStyles.warning;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl">
        {/* Icon & Title */}
        <div className="mb-4 flex items-start gap-3">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon size={24} />
          </div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
        </div>

        {/* Message */}
        <div className={`mb-6 rounded-lg ${config.bgColor} p-3`}>
          <p className="text-sm leading-relaxed text-ink-muted">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-ink/10 bg-surface-raised px-4 py-2.5 font-medium text-ink transition-colors hover:bg-surface-raised/80 disabled:opacity-50"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg ${config.buttonColor} px-4 py-2.5 font-medium text-white shadow-md transition-colors disabled:opacity-50`}
            aria-label={confirmText}
          >
            {isLoading ? 'Please wait...' : confirmText}
          </button>
        </div>

        {/* Accessibility */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {title}: {message}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage confirmation dialog state
 */
export function useConfirmation() {
  const [state, setState] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isLoading: false,
    isDangerous: false,
  });

  const [callbacks, setCallbacks] = React.useState({
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = React.useCallback((options) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      ...options,
    }));

    return new Promise((resolve) => {
      setCallbacks({
        onConfirm: () => {
          resolve(true);
          close();
        },
        onCancel: () => {
          resolve(false);
          close();
        },
      });
    });
  }, []);

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setLoading = React.useCallback((isLoading) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  return {
    ...state,
    confirm,
    close,
    setLoading,
    ...callbacks,
  };
}
