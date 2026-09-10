import { formatSubmissionDeadline } from '../../utils/submissionDeadline';
// Student Published Grade & Remedial Alert Card (PRD Section 60)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Award,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
  UploadCloud,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { Badge } from '../common/Badge';
import { getGradePredicate } from '../../utils/gradeCalculators';

export const StudentGradeCard: React.FC = () => {
  const {
    studentSession,
    assessments,
    attendance,
    remedials,
    submitStudentRemedial,
    showToast,
    isLiveBackend
  } = useApp();

  const [remedialFiles, setRemedialFiles] = useState<Record<string, File | undefined>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [preview, setPreview] = useState<{title: string; url: string} | null>(null);

  if (!studentSession) return null;

  const currentAssessment = assessments.find(
    a => a.periodId === studentSession.periodId && a.studentId === studentSession.studentId
  );

  const currentAttendance = attendance.find(
    a => a.periodId === studentSession.periodId && a.studentId === studentSession.studentId
  );

  const studentRemedials = remedials.filter(
    r => r.periodId === studentSession.periodId && r.studentId === studentSession.studentId
  );

  const isAttendanceUnder75 = currentAttendance ? !currentAttendance.isEligible : false;
  const remedialsPassed = studentRemedials.length > 0 && studentRemedials.every(r => r.status === 'LULUS');
  const isGradePublished = Boolean(currentAssessment?.isPublished && (!isAttendanceUnder75 || remedialsPassed));

  const handleRemedialUpload = async (remedialId: string) => {
    const file = remedialFiles[remedialId];
    if (!file || uploading) return;
    setUploading(remedialId);
    try {
      await submitStudentRemedial(remedialId, file);
      setRemedialFiles(prev => ({...prev, [remedialId]: undefined}));
    } catch (reason) { showToast('Pengumpulan Gagal', reason instanceof Error ? reason.message : 'Silakan coba lagi.', 'error'); }
    finally { setUploading(null); }
  };

  return (
    <div className="space-y-6">
      {!isLiveBackend && studentRemedials.length > 0 && <p className="text-sm bg-amber-50 text-amber-800 p-3 rounded-xl">Mode lokal: pengumpulan remedial tersimpan di perangkat ini dan belum dikirim ke instruktur.</p>}
      <PDFViewerModal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.title || 'Berkas remedial'} fileUrl={preview?.url}/>

      
      {/* Attendance Alert if <75% */}
      {(isAttendanceUnder75 || studentRemedials.length > 0) && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900">{isAttendanceUnder75 ? 'Kehadiran perlu ditindaklanjuti' : 'Tugas tambahan praktik'}</h3>
                {isAttendanceUnder75 && <Badge status="INELIGIBLE" size="sm" />}
              </div>
              {isAttendanceUnder75 && <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                Persentase kehadiran Anda pada periode ini adalah <strong>{currentAttendance?.percentage}%</strong>. Sesuai ketentuan akademik Politeknik Sorowako, publikasi nilai akhir Anda ditangguhkan hingga seluruh tugas tambahan (remedial) dinyatakan <strong>LULUS</strong> oleh instruktur.
              </p>

              }
              {/* Remedial Task List */}
              {studentRemedials.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tugas Tambahan yang Diberikan:</h4>
                  {studentRemedials.map(remedial => (
                    <div key={remedial.id} className="bg-white border border-rose-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-rose-600" />
                          <h5 className="text-xs font-bold text-slate-900">{remedial.title}</h5>
                        </div>
                        <Badge status={remedial.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">{remedial.description}</p>
                      {remedial.submissionFileUrl && <button onClick={() => setPreview({title:remedial.submissionFileName || remedial.title, url:remedial.submissionFileUrl!})} className="min-h-11 text-sm text-blue-700 font-semibold">Lihat berkas remedial tersimpan</button>}
                      
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Batas Waktu: {formatSubmissionDeadline(remedial.deadline)} WITA
                        </span>

                        {(remedial.status === 'PENDING_SUBMISSION' || remedial.status === 'BELUM_LULUS') && (
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer text-xs font-semibold">
                              {remedialFiles[remedial.id] ? remedialFiles[remedial.id]?.name : 'Pilih File PDF'}
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={e => setRemedialFiles(prev => ({...prev, [remedial.id]: e.target.files?.[0]}))}
                                className="hidden"
                              />
                            </label>
                            <button
                              onClick={() => handleRemedialUpload(remedial.id)}
                              disabled={!remedialFiles[remedial.id] || !!uploading}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs"
                            >
                              {uploading === remedial.id ? 'Menyimpan…' : 'Kirim PDF'}
                            </button>
                          </div>
                        )}

                        {remedial.status === 'SUBMITTED' && (
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Menunggu Review Instruktur
                          </span>
                        )}

                        {remedial.status === 'LULUS' && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Remedial Diterima (Lulus)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grade Card Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-wrap gap-3 items-center justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Hasil Pembelajaran Praktik</h3>
              <p className="text-xs text-slate-500">Penilaian Berbasis Capaian Pembelajaran (OBE)</p>
            </div>
          </div>

          <Badge status={isGradePublished ? 'PUBLISHED' : 'IN_PROGRESS'} label={isGradePublished ? 'Nilai Dipublikasikan' : 'Menunggu Publikasi'} />
        </div>

        {isGradePublished && currentAssessment ? (
          <div className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[['Kualitas (70%)', currentAssessment.qualityScore], ['Sikap (10%)', currentAssessment.attitudeScore], ['Kreativitas (5%)', currentAssessment.creativityScore], ['Laporan (15%)', currentAssessment.reportScore]].map(([label, score]) => <div key={label} className="bg-slate-50 border rounded-xl p-3"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold mt-1">{score}<span className="text-xs font-normal"> / 100</span></p></div>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              
              {/* Final Score Big Badge */}
              {(() => {
                const gradeInfo = getGradePredicate(currentAssessment.finalScore);
                return (
                  <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 text-center shadow-xl border border-blue-800">
                    <span className="text-xs uppercase font-bold tracking-wider text-cyan-300">Nilai Akhir Praktik</span>
                    <div className="flex items-baseline justify-center gap-1.5 my-2">
                      <span className="text-5xl font-black tracking-tight text-white">
                        {currentAssessment.finalScore}
                      </span>
                      <span className="text-lg text-slate-400 font-semibold">/ 100</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 mt-2">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 rounded-full text-xs font-bold text-cyan-200 border border-white/15">
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[11px]">
                          {gradeInfo.letter}
                        </span>
                        <span className="text-white">{gradeInfo.predicate}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Rentang: {gradeInfo.range10Label} ({gradeInfo.range100Label})
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Automatic Feedback Note (PRD Section 60) */}
              <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Catatan & Feedback Instruktur</span>
                </div>
                <blockquote className="text-sm font-medium text-slate-800 leading-relaxed italic border-l-4 border-blue-600 pl-4 py-1">
                  "{currentAssessment.feedback || 'Instruktur belum menambahkan catatan.'}"
                </blockquote>
                <p className="text-[11px] text-slate-400 mt-4">
                  Dipublikasikan secara resmi pada: {currentAssessment.publishedAt || 'Tanggal belum tersedia'}
                </p>
              </div>

            </div>
          </div>
        ) : (
          <div className="mt-8 text-center py-8">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Clock className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Nilai Sedang Dalam Proses Evaluasi</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Instruktur sedang melakukan penilaian rubrik kualitas Sub-CPMK dan pemeriksaan laporan. Nilai akhir beserta feedback akan tampil otomatis di sini setelah dipublikasikan.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
