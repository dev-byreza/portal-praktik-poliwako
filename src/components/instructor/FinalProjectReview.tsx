import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PracticeParticipant } from '../../types';
import { ExternalLink, FolderUp, CheckCircle, AlertCircle } from 'lucide-react';

export function FinalProjectReview({ participant }: { participant: PracticeParticipant }) {
  const { reviewFinalProject, periods } = useApp();
  const period = periods.find(p => p.id === participant.periodId);
  const targetDriveUrl = participant.finalProjectUrl || period?.finalProjectDriveUrl;
  const instructorDriveUrl = period?.instructorDriveUrl;

  const [feedback, setFeedback] = useState(participant.finalProjectFeedback || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (status: 'ACCEPTED' | 'REVISION_REQUIRED') => {
    setBusy(true);
    setError('');
    try {
      await reviewFinalProject(participant.id, status, feedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pemeriksaan gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <FolderUp className="w-4 h-4 text-blue-600" />
          <span>Pemeriksaan Final Project di Google Drive</span>
        </h3>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
          participant.finalProjectReviewStatus === 'ACCEPTED'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : participant.finalProjectReviewStatus === 'REVISION_REQUIRED'
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {participant.finalProjectReviewStatus === 'ACCEPTED'
            ? 'Diterima'
            : participant.finalProjectReviewStatus === 'REVISION_REQUIRED'
            ? 'Perlu Revisi'
            : 'Menunggu Pemeriksaan'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {targetDriveUrl ? (
            <a
              href={targetDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Buka Folder Pengumpulan Mahasiswa di Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-amber-600">Folder pengumpulan belum dikonfigurasi</span>
          )}

          {instructorDriveUrl && (
            <a
              href={instructorDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              <span>Folder Backup Soal Instruktur</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Periksa file 3D CAD / gambar teknik / laporan yang diunggah mahasiswa pada folder di atas.
        </p>
      </div>

      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        Catatan & Masukan Pemeriksaan
        <textarea
          rows={3}
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Berikan catatan teknis, koreksi dimensi, atau apresiasi hasil kerja mahasiswa..."
          className="w-full border border-slate-300 rounded-xl p-3 mt-1.5 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-normal"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => save('REVISION_REQUIRED')}
          className="min-h-10 px-4 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
        >
          Minta Revisi
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save('ACCEPTED')}
          className="min-h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Terima & Setujui Final Project</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </section>
  );
}
