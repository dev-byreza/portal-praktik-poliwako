import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, LockKeyhole, X } from 'lucide-react';

export interface CountdownConfig {
  countdownEnabled?: boolean;
  countdownMinutes?: number;
  countdownStartedAt?: string;
}

export const getCountdownEndAt = (config: CountdownConfig): number | null => {
  if (!config.countdownEnabled || !config.countdownStartedAt) return null;
  const startedAt = Date.parse(config.countdownStartedAt);
  if (!Number.isFinite(startedAt)) return null;
  const durationMs = Math.max(1, Number(config.countdownMinutes) || 1) * 60 * 1000;
  return startedAt + durationMs;
};

export const isCountdownLocked = (config: CountdownConfig, now = Date.now()): boolean => {
  const endAt = getCountdownEndAt(config);
  return endAt !== null && now < endAt;
};

const formatRemaining = (milliseconds: number): { hours: string; minutes: string; seconds: string } => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
};

interface CountdownLockedPanelProps {
  title: string;
  onOpen: () => void;
}

export const CountdownLockedPanel: React.FC<CountdownLockedPanelProps> = ({ title, onOpen }) => (
  <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 text-center">
    <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-indigo-200/40 blur-2xl" />
    <div className="relative">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
        <LockKeyhole className="h-5 w-5" />
      </div>
      <h4 className="mt-3 text-sm font-bold text-slate-900">Materi sedang dikunci</h4>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
        {title} akan terbuka setelah countdown selesai. Isi materi dan unduhan belum tersedia.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500"
      >
        <Clock3 className="h-3.5 w-3.5" />
        Lihat Countdown
      </button>
    </div>
  </div>
);

interface CountdownModalProps {
  title: string;
  endAt: number;
  onClose: () => void;
}

export const CountdownModal: React.FC<CountdownModalProps> = ({ title, endAt, onClose }) => {
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, endAt - now);
  const parts = useMemo(() => formatRemaining(remaining), [remaining]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isFinished = remaining <= 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Countdown akses materi">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/60 bg-white p-6 text-center shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup countdown">
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
          <Clock3 className="h-6 w-6" />
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Akses segera dibuka</p>
        <h3 className="mt-1 px-6 text-base font-bold text-slate-900 break-words">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {isFinished ? 'Countdown selesai. Materi sekarang dapat dibuka.' : 'Tunggu sampai waktu selesai untuk melihat teks, membuka materi, dan mengunduh berkas.'}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            ['Jam', parts.hours],
            ['Menit', parts.minutes],
            ['Detik', parts.seconds],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3">
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900">{value}</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={!isFinished}
          className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isFinished ? 'Buka Materi' : 'Materi masih terkunci'}
        </button>
      </div>
    </div>
  );
};
