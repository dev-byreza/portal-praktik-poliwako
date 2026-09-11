import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const accent = isDanger
    ? {
        icon: 'bg-rose-100 text-rose-600',
        button: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20',
      }
    : {
        icon: 'bg-amber-100 text-amber-600',
        button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
      };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onCancel();
        }}
      >
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30"
        >
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent.icon}`}>
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 id="confirm-dialog-title" className="text-sm font-bold tracking-tight">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Tutup dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="px-5 py-5">
            <p id="confirm-dialog-message" className="text-sm leading-relaxed text-slate-600">
              {message}
            </p>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-100"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors ${accent.button}`}
            >
              {confirmLabel}
            </button>
          </footer>
        </section>
      </div>
    </ModalPortal>
  );
};
