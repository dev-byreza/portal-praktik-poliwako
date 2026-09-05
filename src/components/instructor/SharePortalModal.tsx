// Modal to Share Student Portal URL & Broadcast to Students
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Send,
  X,
  Sparkles,
  BookOpen,
  QrCode,
  Info
} from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

interface SharePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SharePortalModal: React.FC<SharePortalModalProps> = ({ isOpen, onClose }) => {
  const { activeCourse } = useApp();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  const generalStudentUrl = `${baseUrl}/mahasiswa`;
  const courseSpecificUrl = activeCourse ? `${baseUrl}/${activeCourse.slug}` : generalStudentUrl;

  const broadcastTemplate = `📢 *PENGUMUMAN PRAKTIK POLITEKNIK SOROWAKO*
Mata Kuliah: *${activeCourse?.name || 'Praktik Mahasiswa'}*

Kepada seluruh rekan-rekan mahasiswa,
Portal Praktik Poliwako untuk materi pembelajaran, presensi WITA, dan pengumpulan penugasan OBE dapat diakses melalui tautan berikut:
🔗 *${courseSpecificUrl}*

*Petunjuk Masuk:*
1. Buka tautan di atas melalui browser (HP atau Laptop).
2. Masukkan *NIM (Nomor Induk Mahasiswa)* Anda yang terdaftar.
3. Untuk kunjungan pertama, Anda akan diarahkan membuat kata sandi aktivasi.

Terima kasih dan selamat belajar!`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleOpenNewTab = (path: string) => {
    window.open(path, '_blank');
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(broadcastTemplate);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
        <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-8 transition-all">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 p-6 sm:p-7 text-white relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center ring-2 ring-white/20">
                <Share2 className="w-6 h-6 text-cyan-200" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Bagikan Portal ke Mahasiswa
                </h3>
                <p className="text-xs text-cyan-100 mt-0.5">
                  Tautan khusus mahasiswa untuk akses materi, presensi, & penugasan
                </p>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-7 space-y-6">
            
            {/* Direct Link 1: General Student Portal */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tautan Umum Portal Mahasiswa</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Bisa untuk semua mata kuliah</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generalStudentUrl}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(generalStudentUrl, 'general')}
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                >
                  {copiedKey === 'general' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenNewTab('/mahasiswa')}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Direct Link 2: Specific Active Course */}
            {activeCourse && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Tautan Langsung: {activeCourse.name}</span>
                  </label>
                  <span className="text-[11px] text-cyan-600 font-bold bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                    Direkomendasikan
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={courseSpecificUrl}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-cyan-200 rounded-xl text-xs font-mono text-blue-900 font-medium select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(courseSpecificUrl, 'course')}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  >
                    {copiedKey === 'course' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewTab(`/${activeCourse.slug}`)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
                    title="Buka di tab baru"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* WhatsApp Broadcast Template */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Format Pesan Broadcast (WhatsApp / LMS)</span>
                </label>
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Kirim ke WhatsApp</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={6}
                  value={broadcastTemplate}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none resize-none leading-relaxed select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(broadcastTemplate, 'broadcast')}
                  className="absolute right-3 bottom-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'broadcast' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Teks Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Semua Teks</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Information Tips */}
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 text-xs text-blue-800">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Mahasiswa cukup memasukkan <strong>NIM</strong> yang telah didaftarkan instruktur pada menu Mahasiswa. Mereka tidak memerlukan akun instruktur dan akan langsung masuk ke materi praktik.
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};
