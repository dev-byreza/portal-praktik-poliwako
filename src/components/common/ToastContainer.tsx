// Floating Notifications (Toast) Component
// Tampilan ringkas, hanya 1 baris berganti (tidak bersusun ke atas)

import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  // Single-slot notification (hanya 1 baris saja berganti, tidak bersusun ke atas)
  const activeToast = toasts[toasts.length - 1];
  if (!activeToast) return null;

  const styles = {
    success: {
      bg: 'bg-emerald-950/95 dark:bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
    },
    error: {
      bg: 'bg-rose-950/95 dark:bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-rose-950/50',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
    },
    warning: {
      bg: 'bg-amber-950/95 dark:bg-amber-950/95 border-amber-500/40 text-amber-100 shadow-amber-950/50',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
    },
    info: {
      bg: 'bg-slate-900/95 dark:bg-slate-900/95 border-blue-500/40 text-slate-100 shadow-slate-950/50',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />
    },
  }[activeToast.type];

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      <div
        key={activeToast.id}
        className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-toast ${styles.bg}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {styles.icon}
          <div className="min-w-0">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider">{activeToast.title}</h4>
            <p className="text-xs opacity-90 truncate leading-snug">{activeToast.message}</p>
          </div>
        </div>
        <button
          onClick={() => removeToast(activeToast.id)}
          className="opacity-60 hover:opacity-100 p-1 rounded-lg hover:bg-white/10 transition-all shrink-0 cursor-pointer"
          title="Tutup Notifikasi"
          aria-label="Tutup Notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
