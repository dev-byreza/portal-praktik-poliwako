import React, { useMemo, useState } from 'react';
import { Clock, Megaphone, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Announcement, AnnouncementPriority } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';

const priorityStyle: Record<AnnouncementPriority, { label: string; badge: string; border: string }> = {
  INFO: { label: 'Informasi', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  IMPORTANT: { label: 'Penting', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
  URGENT: { label: 'Mendesak', badge: 'bg-rose-100 text-rose-700', border: 'border-rose-200' },
};

const formatWitaDateTime = (value?: string): string => {
  if (!value) return 'Tanpa batas waktu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const AnnouncementManager: React.FC = () => {
  const {
    activeCourseId,
    periods,
    announcements,
    createAnnouncement,
    deleteAnnouncement,
    showToast,
  } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [periodId, setPeriodId] = useState('ALL');
  const [priority, setPriority] = useState<AnnouncementPriority>('INFO');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);

  const coursePeriods = useMemo(
    () => periods.filter(period => period.courseId === activeCourseId),
    [activeCourseId, periods]
  );
  const courseAnnouncements = useMemo(
    () => announcements
      .filter(item => item.courseId === activeCourseId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [activeCourseId, announcements]
  );

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setPeriodId('ALL');
    setPriority('INFO');
    setExpiresAt('');
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!activeCourseId || !cleanTitle || !cleanMessage) {
      showToast('Data Belum Lengkap', 'Judul dan isi pengumuman wajib diisi.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await createAnnouncement({
        courseId: activeCourseId,
        periodId: periodId === 'ALL' ? undefined : periodId,
        title: cleanTitle,
        message: cleanMessage,
        priority,
        isActive: true,
        expiresAt: expiresAt ? new Date(`${expiresAt}:00+08:00`).toISOString() : undefined,
      });
      resetForm();
    } catch (error) {
      showToast('Gagal Menerbitkan', error instanceof Error ? error.message : 'Pengumuman belum berhasil disimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteAnnouncement(target.id);
    } catch (error) {
      showToast('Gagal Menghapus', error instanceof Error ? error.message : 'Pengumuman belum berhasil dihapus.', 'error');
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Hapus pengumuman?"
        message={`Pengumuman “${pendingDelete?.title || ''}” akan dihapus dan tidak lagi terlihat oleh mahasiswa.`}
        confirmLabel="Hapus pengumuman"
        onConfirm={() => { void handleDelete(); }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-cyan-600" />
            <h2 className="text-base font-black text-slate-900">Pengumuman mahasiswa</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Informasi aktif muncul langsung pada dashboard mahasiswa yang sesuai.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(open => !open)}
          disabled={!activeCourseId}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Tutup formulir' : 'Buat pengumuman'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-slate-700 md:col-span-2">
              Judul
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                maxLength={160}
                placeholder="Contoh: Perubahan tenggat laporan"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
            <label className="text-xs font-bold text-slate-700 md:col-span-2">
              Isi pengumuman
              <textarea
                value={message}
                onChange={event => setMessage(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Tuliskan informasi dan tindakan yang perlu dilakukan mahasiswa."
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Target periode
              <select value={periodId} onChange={event => setPeriodId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900">
                <option value="ALL">Semua periode mata kuliah</option>
                {coursePeriods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Prioritas
              <select value={priority} onChange={event => setPriority(event.target.value as AnnouncementPriority)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900">
                <option value="INFO">Informasi</option>
                <option value="IMPORTANT">Penting</option>
                <option value="URGENT">Mendesak</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700 md:col-span-2">
              Tampilkan sampai (opsional, WITA)
              <input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 md:max-w-sm" />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={isSaving} className="min-h-11 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60">
              {isSaving ? 'Menerbitkan…' : 'Terbitkan pengumuman'}
            </button>
          </div>
        </form>
      )}

      {courseAnnouncements.length > 0 ? (
        <div className="mt-5 space-y-3">
          {courseAnnouncements.slice(0, 5).map(item => {
            const style = priorityStyle[item.priority];
            const periodName = item.periodId ? coursePeriods.find(period => period.id === item.periodId)?.name : undefined;
            const expired = Boolean(item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now());
            return (
              <article key={item.id} className={`rounded-2xl border p-4 ${style.border} ${expired ? 'bg-slate-50 opacity-70' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>{style.label}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{periodName || 'Semua periode'}</span>
                      {expired && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Berakhir</span>}
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{item.message}</p>
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" /> Terbit {formatWitaDateTime(item.publishedAt)}
                      {item.expiresAt ? ` • Berakhir ${formatWitaDateTime(item.expiresAt)}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => setPendingDelete(item)} aria-label={`Hapus pengumuman ${item.title}`} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada pengumuman</p>
          <p className="mt-1 text-xs text-slate-500">Buat pengumuman untuk perubahan jadwal, tenggat, atau instruksi penting.</p>
        </div>
      )}
    </section>
  );
};
