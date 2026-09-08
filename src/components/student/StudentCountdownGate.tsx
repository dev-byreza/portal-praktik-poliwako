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
      <h4 className="mt-3 text-sm font-bold text-slate-900">Unit sedang dikunci</h4>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
        {title} akan terbuka setelah countdown selesai. Materi, tugas, dan unduhan belum tersedia.
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 sm:p-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Countdown akses unit">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white p-7 sm:p-10 text-center shadow-2xl shadow-indigo-950/30">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup countdown">
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
          <Clock3 className="h-8 w-8" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Akses unit segera dibuka</p>
        <h3 className="mt-2 px-3 text-xl sm:text-2xl font-bold text-slate-900 break-words">{title}</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
          {isFinished ? 'Countdown selesai. Seluruh materi dan tugas pada unit ini sekarang dapat dibuka.' : 'Seluruh materi dan tugas pada unit ini masih terkunci sampai countdown selesai.'}
        </p>
        <div className="mt-7 grid grid-cols-3 gap-3">
          {[
            ['Jam', parts.hours],
            ['Menit', parts.minutes],
            ['Detik', parts.seconds],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-2 py-5 sm:py-6">
              <div className="font-mono text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-slate-900">{value}</div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={!isFinished}
          className="mt-7 w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isFinished ? 'Buka Unit' : 'Unit masih terkunci'}
        </button>
      </div>
    </div>
  );
};
