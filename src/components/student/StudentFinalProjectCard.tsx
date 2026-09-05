// Student Final Project Card with Google Drive Integration & Confirmation

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FolderArchive,
  ExternalLink,
  CheckCircle2,
  Lock,
  Sparkles,
  ShieldCheck,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentFinalProjectCardProps {
  isUnlocked: boolean;
  driveUrl?: string;
}

export const StudentFinalProjectCard: React.FC<StudentFinalProjectCardProps> = ({
  isUnlocked,
  driveUrl = 'https://drive.google.com/drive/folders/poliwako-cnc-final'
}) => {
  const { studentSession, participants, confirmFinalProject, showToast } = useApp();
  const [isChecked, setIsChecked] = useState(false);

  const currentParticipant = participants.find(
    p => p.periodId === studentSession?.periodId && p.studentId === studentSession?.studentId
  );

  const isConfirmed = currentParticipant?.finalProjectConfirmed || false;

  const handleConfirm = () => {
    if (!isChecked || isConfirmed) return;

    confirmFinalProject();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (!isUnlocked) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-700">Final Project Terkunci</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          Selesaikan seluruh modul dan unit pembelajaran (100%) terlebih dahulu untuk membuka akses pengumpulan Final Project.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl shadow-xl p-6 sm:p-8 text-white border border-blue-500/30 relative overflow-hidden">
      {/* Background glowing ambient light */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-semibold w-fit border border-cyan-500/30 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tahap Terakhir • Final Project Praktik</span>
        </div>

        <h3 className="text-xl font-bold tracking-tight text-white">
          Pengumpulan Proyek Akhir (Final Project)
        </h3>
        <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
          Seluruh unit pembelajaran telah tuntas (100%). Silakan upload seluruh folder file pekerjaan CAD/CAM, simulasi NC, dan dokumentasi foto benda kerja Anda ke Google Drive yang disediakan.
        </p>

        {/* Google Drive Link Button */}
        <div className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/30 border border-blue-400/40 text-cyan-300 flex items-center justify-center shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Google Drive Folder Pengumpulan</h4>
              <p className="text-[11px] text-slate-300 font-mono truncate max-w-xs sm:max-w-md mt-0.5">
                {driveUrl}
              </p>
            </div>
          </div>

          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 shrink-0"
          >
            <span>Buka Google Drive</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Confirmation Form */}
        <div className="mt-6 pt-5 border-t border-white/10">
          {isConfirmed ? (
            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-4 flex items-center gap-3.5 text-emerald-200">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Pengumpulan Proyek Akhir Telah Dikonfirmasi</h4>
                <p className="text-[11px] text-emerald-300 mt-0.5">
                  Waktu konfirmasi: {currentParticipant?.finalProjectSubmittedAt || 'Terekam di sistem'}. Silakan menunggu penilaian dari instruktur.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => setIsChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-400 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-800"
                />
                <span className="text-xs text-slate-200 leading-relaxed select-none group-hover:text-white transition-colors">
                  Saya menyatakan telah mengunggah seluruh folder file pekerjaan lengkap ke Google Drive sesuai dengan ketentuan praktik Politeknik Sorowako.
                </span>
              </label>

              <button
                onClick={handleConfirm}
                disabled={!isChecked}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Konfirmasi Pengumpulan Project</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
