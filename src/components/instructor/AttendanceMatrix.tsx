// Attendance Matrix & Remedial Management (PRD Section 53-58, 91, 101, 102)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus, RemedialAssignment } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileText,
  ShieldAlert,
  UserCheck,
  Eye,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { formatPeriodRange } from '../../utils/dateUtils';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { ModalPortal } from '../common/ModalPortal';

export const AttendanceMatrix: React.FC = () => {
  const {
    activeCourseId,
    activeCourse,
    periods,
    participants,
    attendance,
    remedials,
    updateAttendanceCell,
    createRemedialTask,
    gradeRemedialTask,
    showToast
  } = useApp();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [isRemedialModalOpen, setIsRemedialModalOpen] = useState(false);
  const [selectedStudentForRemedial, setSelectedStudentForRemedial] = useState<{ id: string; name: string } | null>(null);
  
  // Remedial Form states
  const [remTitle, setRemTitle] = useState('Tugas Tambahan Pengganti Kehadiran: Resume Analisis SOP');
  const [remDesc, setRemDesc] = useState('Mahasiswa wajib membuat resume teknis dan analisis prosedur praktikum dalam format PDF.');
  const [remDeadline, setRemDeadline] = useState('2026-09-14 23:59 WITA');

  const [pdfPreview, setPdfPreview] = useState<{ isOpen: boolean; title: string; url?: string; authorName?: string } | null>(null);

  // Filter periods for active course
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const activeSelectedPeriod = coursePeriods.find(p => p.id === selectedPeriodId) || coursePeriods[0];

  // Participants of selected period
  const periodParticipants = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return participants.filter(p => p.periodId === activeSelectedPeriod.id);
  }, [participants, activeSelectedPeriod]);

  // Attendance Records mapped to students
  const studentAttendanceData = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return periodParticipants.map(part => {
      const att = attendance.find(a => a.periodId === activeSelectedPeriod.id && a.studentId === part.studentId) || {
        id: `temp-${part.studentId}`,
        periodId: activeSelectedPeriod.id,
        studentId: part.studentId,
        day1: 'HADIR' as AttendanceStatus,
        day2: 'HADIR' as AttendanceStatus,
        day3: 'HADIR' as AttendanceStatus,
        day4: 'HADIR' as AttendanceStatus,
        day5: 'HADIR' as AttendanceStatus,
        percentage: 100,
        isEligible: true,
        updatedAt: '2026-09-11'
      };

      const studentRemedials = remedials.filter(
        r => r.periodId === activeSelectedPeriod.id && r.studentId === part.studentId
      );

      return {
        participant: part,
        attendance: att,
        remedials: studentRemedials
      };
    });
  }, [periodParticipants, attendance, activeSelectedPeriod, remedials]);

  const handleCycleStatus = (studentId: string, day: 'day1' | 'day2' | 'day3' | 'day4' | 'day5', currentStatus: AttendanceStatus) => {
    if (!activeSelectedPeriod) return;
    const cycle: Record<AttendanceStatus, AttendanceStatus> = {
      HADIR: 'IZIN',
      IZIN: 'SAKIT',
      SAKIT: 'ALPA',
      ALPA: 'HADIR'
    };
    const nextStatus = cycle[currentStatus] || 'HADIR';
    updateAttendanceCell(activeSelectedPeriod.id, studentId, day, nextStatus);
  };

  const handleOpenCreateRemedial = (student: { id: string; name: string }) => {
    setSelectedStudentForRemedial(student);
    setRemTitle(`Tugas Pengganti Kehadiran: ${student.name}`);
    setRemDesc('Mahasiswa dengan kehadiran <75% wajib menyelesaikan tugas resume teknis ini dalam format PDF untuk membuka blokir publikasi nilai akhir.');
    setIsRemedialModalOpen(true);
  };

  const handleSaveRemedial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedPeriod || !selectedStudentForRemedial) return;

    createRemedialTask({
      periodId: activeSelectedPeriod.id,
      studentId: selectedStudentForRemedial.id,
      title: remTitle.trim(),
      description: remDesc.trim(),
      deadline: remDeadline.trim()
    });

    setIsRemedialModalOpen(false);
  };

  const renderStatusCell = (studentId: string, day: 'day1' | 'day2' | 'day3' | 'day4' | 'day5', status: AttendanceStatus) => {
    const styleMap = {
      HADIR: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
      IZIN: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
      SAKIT: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
      ALPA: 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-bold',
    }[status];

    const labelMap = {
      HADIR: 'H',
      IZIN: 'I',
      SAKIT: 'S',
      ALPA: 'A',
    }[status];

    return (
      <button
        onClick={() => handleCycleStatus(studentId, day, status)}
        className={`w-9 h-8 rounded-lg text-xs font-bold border transition-all flex items-center justify-center shadow-xs ${styleMap}`}
        title={`Status: ${status} (Klik untuk ubah: H -> I -> S -> A)`}
      >
        {labelMap}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Monitoring Kehadiran & Remedial
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Presensi 5 Hari & Aturan Ketuntasan (&lt;75%)</h2>
          <p className="text-xs text-slate-500">
            Sistem secara default mengaktifkan 100% Hadir. Cukup klik pada hari mahasiswa yang absen (H = Hadir, I = Izin, S = Sakit, A = Alpa).
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 text-xs w-full md:w-auto">
          <span className="text-slate-500 font-medium">Periode:</span>
          <select
            value={activeSelectedPeriod?.id || ''}
            onChange={e => setSelectedPeriodId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {coursePeriods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rules Notice Box (PRD Section 55 & 56) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <span className="font-bold text-blue-950">Aturan Presensi Minimum 75%:</span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              5 Hari = 100% • 4 Hari = 80% (Memenuhi). Jika &lt;75% (≤3 Hari = 60%), publikasi nilai terkunci otomatis hingga seluruh tugas remedial LULUS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 font-semibold">
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">H = Hadir (20%)</span>
          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded">A = Alpa (0%)</span>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <span>Matriks Presensi Peserta ({studentAttendanceData.length} Mahasiswa)</span>
          </div>
          {activeSelectedPeriod && (
            <span className="text-xs text-slate-500 font-semibold">
              {formatPeriodRange(activeSelectedPeriod.startDate, activeSelectedPeriod.endDate)}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Mahasiswa / NIM</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-2 text-center">Sen (D1)</th>
                <th className="py-3 px-2 text-center">Sel (D2)</th>
                <th className="py-3 px-2 text-center">Rab (D3)</th>
                <th className="py-3 px-2 text-center">Kam (D4)</th>
                <th className="py-3 px-2 text-center">Jum (D5)</th>
                <th className="py-3 px-4 text-center">Total %</th>
                <th className="py-3 px-4">Status Kelayakan</th>
                <th className="py-3 px-4 text-right">Tugas Remedial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {studentAttendanceData.length > 0 ? (
                studentAttendanceData.map(item => {
                  const att = item.attendance;
                  const std = item.participant.student;
                  const isEligible = att.isEligible;
                  const hasRemedials = item.remedials.length > 0;
                  const allRemedialsPassed = hasRemedials && item.remedials.every(r => r.status === 'LULUS');

                  return (
                    <tr key={item.participant.id} className={!isEligible ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/70'}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{std.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">NIM: {std.nim}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-semibold">
                          {std.className}
                        </span>
                      </td>

                      {/* 5 Day Buttons */}
                      <td className="py-3 px-2 text-center">{renderStatusCell(std.id, 'day1', att.day1)}</td>
                      <td className="py-3 px-2 text-center">{renderStatusCell(std.id, 'day2', att.day2)}</td>
                      <td className="py-3 px-2 text-center">{renderStatusCell(std.id, 'day3', att.day3)}</td>
                      <td className="py-3 px-2 text-center">{renderStatusCell(std.id, 'day4', att.day4)}</td>
                      <td className="py-3 px-2 text-center">{renderStatusCell(std.id, 'day5', att.day5)}</td>

                      {/* Percentage */}
                      <td className="py-3 px-4 text-center">
                        <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg ${
                          att.percentage >= 75
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {att.percentage}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isEligible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Memenuhi Syarat</span>
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Tidak Memenuhi (&lt;75%)</span>
                            </span>
                            <p className="text-[10px] text-rose-600 font-semibold">
                              {allRemedialsPassed ? '✓ Remedial Lulus (Siap Publish)' : 'Publikasi Terkunci'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Remedial Actions */}
                      <td className="py-3 px-4 text-right">
                        {!isEligible ? (
                          <div className="flex flex-col items-end gap-1.5">
                            {item.remedials.map(rem => (
                              <div key={rem.id} className="flex items-center gap-1 text-[10px]">
                                <span className="font-medium text-slate-700 truncate max-w-[120px]">{rem.title}</span>
                                <Badge status={rem.status} size="sm" />
                                
                                {rem.submissionFileUrl && (
                                  <button
                                    onClick={() => setPdfPreview({ isOpen: true, title: rem.title, url: rem.submissionFileUrl, authorName: std.name })}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Lihat PDF Jawaban Remedial"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {rem.status === 'SUBMITTED' && (
                                  <div className="flex items-center gap-1 ml-1">
                                    <button
                                      onClick={() => gradeRemedialTask(rem.id, 'LULUS')}
                                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px]"
                                    >
                                      Lulus
                                    </button>
                                    <button
                                      onClick={() => gradeRemedialTask(rem.id, 'BELUM_LULUS')}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px]"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            <button
                              onClick={() => handleOpenCreateRemedial({ id: std.id, name: std.name })}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Beri Tugas Tambahan</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada peserta di periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create Remedial */}
      {isRemedialModalOpen && selectedStudentForRemedial && activeSelectedPeriod && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Buat Tugas Tambahan (Remedial)</h3>
                  <p className="text-xs text-rose-300 mt-0.5">Untuk: {selectedStudentForRemedial.name}</p>
                </div>
                <button onClick={() => setIsRemedialModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRemedial} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Judul Tugas Tambahan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Analisis Keselamatan Kerja Pembubutan"
                    value={remTitle}
                    onChange={(e) => setRemTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Instruksi & Ketentuan *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Jelaskan ketentuan pengerjaan tugas remedial (format PDF)..."
                    value={remDesc}
                    onChange={(e) => setRemDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Batas Waktu Pengumpulan (Deadline)
                  </label>
                  <input
                    type="text"
                    value={remDeadline}
                    onChange={(e) => setRemDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRemedialModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/30"
                  >
                    Tugaskan Remedial
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* PDF Viewer */}
      {pdfPreview && (
        <ModalPortal>
          <PDFViewerModal
            isOpen={pdfPreview.isOpen}
            onClose={() => setPdfPreview(null)}
            title={pdfPreview.title}
            fileUrl={pdfPreview.url}
            authorName={pdfPreview.authorName}
          />
        </ModalPortal>
      )}

    </div>
  );
};
