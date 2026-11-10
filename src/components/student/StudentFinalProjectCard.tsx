import React, { useState, useRef } from 'react';
import { ExternalLink, FolderUp, UploadCloud, FileCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { normalizeGoogleDriveFolderUrl } from '../../utils/googleDriveUtils';
import { uploadSubmissionFile } from '../../services/driveStorageService';

export const StudentFinalProjectCard: React.FC = () => {
  const { studentSession, participants, periods, confirmFinalProject, updateParticipant, isLiveBackend, showToast } = useApp();
  const participant = participants.find(
    item => item.studentId === studentSession?.studentId && item.periodId === studentSession?.periodId,
  );
  const period = periods.find(item => item.id === studentSession?.periodId);
  const driveFolderUrl = normalizeGoogleDriveFolderUrl(period?.finalProjectDriveUrl);
  const isActive = period?.finalProjectEnabled === true;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = participant?.finalProjectReviewStatus;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUploadAndSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || busy || !period || !studentSession) return;

    setBusy(true);
    setError('');
    setUploadStatusText('Membaca berkas dan mengunggah ke Google Drive...');

    try {
      // 1. Upload file via system backend to Google Drive
      const uploadRes = await uploadSubmissionFile(selectedFile, {
        courseId: period.courseId,
        periodId: period.id,
        studentId: studentSession.studentId,
        submissionType: 'FINAL_PROJECT',
        taskTitle: 'Proyek Akhir',
        allowedFileType: 'ANY',
      });

      if (uploadRes.error) {
        throw uploadRes.error;
      }

      const fileUrl = uploadRes.publicUrl || uploadRes.driveUrl || driveFolderUrl || '';

      // 2. Confirm final project
      await confirmFinalProject();

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      showToast(
        'Proyek Berhasil Diunggah',
        'Berkas Anda telah berhasil diunggah ke Google Drive dan siap diperiksa instruktur.',
        'success'
      );
    } catch (submitError: any) {
      setError(submitError?.message || 'Gagal mengunggah berkas proyek akhir ke Google Drive.');
    } finally {
      setBusy(false);
      setUploadStatusText('');
    }
  };

  if (!isActive) {
    return (
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">Berkas akhir belum diaktifkan</h2>
        <p className="text-sm text-slate-600">Instruktur belum mengaktifkan pengumpulan untuk periode praktik ini.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            Pengunggahan Sistem Otomatis
          </span>
          <span className="text-xs text-slate-400">Google Drive Backend</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Final Project Praktik</h2>
        {period?.finalProjectDescription && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{period.finalProjectDescription}</p>
        )}
        <p className="text-sm leading-relaxed text-slate-600">
          Pilih berkas proyek akhir Anda di bawah. Sistem akan secara otomatis mengunggah dan mengorganisir berkas Anda langsung ke folder Google Drive gelombang praktik Anda.
        </p>
      </div>

      {/* Status Card if already submitted */}
      {participant?.finalProjectConfirmed && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Pemeriksaan</span>
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                status === 'ACCEPTED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : status === 'REVISION_REQUIRED'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {status === 'ACCEPTED'
                ? '✓ Diterima Instruktur'
                : status === 'REVISION_REQUIRED'
                ? 'Perlu Revisi'
                : 'Menunggu Pemeriksaan Instruktur'}
            </span>
          </div>

          {participant.finalProjectUrl && (
            <div className="pt-1">
              <a
                href={participant.finalProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
              >
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Lihat Berkas yang Telah Diunggah</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {participant.finalProjectFeedback && (
            <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800">
              <strong className="block text-slate-700 font-bold mb-1">Catatan Instruktur:</strong>
              <p className="whitespace-pre-line leading-relaxed">{participant.finalProjectFeedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Form - Student just uploads file, system puts it into Google Drive */}
      {status !== 'ACCEPTED' && (
        <form onSubmit={handleUploadAndSubmit} className="space-y-4 border-t border-slate-100 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Pilih Berkas Proyek Akhir (PDF, ZIP, RAR, DWG, DXF)
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                disabled={busy}
                className="hidden"
                accept=".pdf,.zip,.rar,.dwg,.dxf,.png,.jpg,.jpeg,.doc,.docx"
              />

              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
                <UploadCloud className="w-6 h-6" />
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-800">Klik untuk memilih file proyek akhir</p>
                  <p className="text-xs text-slate-500 mt-0.5">Format: PDF, CAD DWG, ZIP, atau RAR (Maks. 100MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              disabled={!selectedFile || busy}
              className="min-h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{uploadStatusText || 'Mengunggah ke Drive...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{participant?.finalProjectConfirmed ? 'Unggah Ulang Berkas Proyek' : 'Kirim & Unggah ke Google Drive'}</span>
                </>
              )}
            </button>

            {driveFolderUrl && (
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 p-2"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Buka Folder Drive Periode</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </form>
      )}

      {!isLiveBackend && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          Mode offline/lokal: berkas disimpan secara lokal di browser.
        </p>
      )}
    </section>
  );
};
