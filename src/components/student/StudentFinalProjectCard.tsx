import React, { useState } from 'react';
import { ExternalLink, FolderUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { normalizeGoogleDriveFolderUrl } from '../../utils/googleDriveUtils';

export const StudentFinalProjectCard: React.FC = () => {
  const { studentSession, participants, periods, confirmFinalProject, isLiveBackend } = useApp();
  const participant = participants.find(
    item => item.studentId === studentSession?.studentId && item.periodId === studentSession?.periodId,
  );
  const period = periods.find(item => item.id === studentSession?.periodId);
  const driveFolderUrl = normalizeGoogleDriveFolderUrl(period?.finalProjectDriveUrl);
  const isActive = period?.finalProjectEnabled === true;
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = participant?.finalProjectReviewStatus;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!checked || busy || !driveFolderUrl) return;
    setBusy(true);
    setError('');
    try {
      await confirmFinalProject();
      setChecked(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Konfirmasi pengumpulan gagal.');
    } finally {
      setBusy(false);
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
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Final project praktik</h2>
        {period?.finalProjectDescription && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{period.finalProjectDescription}</p>
        )}
        <p className="text-sm leading-relaxed text-slate-600">
          Unggah folder kerja Anda langsung ke Google Drive yang disediakan instruktur. Setelah selesai, kembali ke portal untuk mengonfirmasi pengumpulan.
        </p>
      </div>

      {driveFolderUrl ? (
        <a
          href={driveFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <FolderUp className="h-4 w-4" aria-hidden="true" />
          Buka folder Google Drive instruktur
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Folder Google Drive instruktur belum dikonfigurasi dengan benar. Hubungi instruktur sebelum mengunggah proyek.
        </p>
      )}

      {!isLiveBackend && (
        <p className="text-sm text-amber-800">Mode lokal: konfirmasi pengumpulan belum tersimpan ke server.</p>
      )}

      {participant?.finalProjectConfirmed && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          <strong className="block">
            {status === 'ACCEPTED' ? 'Diterima instruktur' : status === 'REVISION_REQUIRED' ? 'Perlu revisi' : 'Menunggu pemeriksaan instruktur'}
          </strong>
          {driveFolderUrl && (
            <a href={driveFolderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-blue-800 hover:underline">
              Buka kembali folder Drive pengumpulan <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
          {participant.finalProjectFeedback && <p className="whitespace-pre-line">{participant.finalProjectFeedback}</p>}
        </div>
      )}

      {status !== 'ACCEPTED' && driveFolderUrl && (
        <form onSubmit={submit} className="space-y-3 border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={event => setChecked(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-blue-700"
            />
            <span>Saya sudah mengunggah folder kerja ke Drive instruktur dan memastikan berkas dapat diakses.</span>
          </label>
          <button
            type="submit"
            disabled={!checked || busy}
            className="min-h-11 w-full rounded-lg bg-blue-700 px-5 font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? 'Menyimpan konfirmasi…' : participant?.finalProjectConfirmed ? 'Kirim ulang konfirmasi' : 'Konfirmasi pengumpulan'}
          </button>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        </form>
      )}
    </section>
  );
};
