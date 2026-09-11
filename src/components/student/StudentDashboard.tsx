import { formatSubmissionDeadline } from '../../utils/submissionDeadline';
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Course, PracticePeriod, LearningUnit } from '../../types';
import { ArrowRight, BookOpen, ClipboardList, Award } from 'lucide-react';
import { hasSuccessfulSubmission } from '../../utils/studentProgress';
interface Props {
  course?: Course; period?: PracticePeriod; units: LearningUnit[];
  onLearn: (unitId?: string) => void; onGrade: () => void; onProject: () => void;
}
export const StudentDashboard: React.FC<Props> = ({course, period, units, onLearn, onGrade, onProject}) => {
  const {currentStudent, studentSession, submissions, remedials, attendance, isLiveBackend, participants} = useApp();
  const mine = (item: {studentId: string; periodId: string}) => item.studentId === studentSession?.studentId && item.periodId === period?.id;
  const mySubmissions = submissions.filter(mine);
  const progressUnits = units.filter(unit => Boolean(unit.assignment));
  const completed = new Set(progressUnits.filter(unit => hasSuccessfulSubmission(mySubmissions, unit.assignment?.id)).map(unit => unit.id));
  const done = progressUnits.filter(unit => completed.has(unit.id)).length;
  const totalProgressUnits = progressUnits.length || units.length;
  const nextAssignment = progressUnits.find(unit => !completed.has(unit.id));
  const nextUnit = nextAssignment || units[0];
  const pending = progressUnits.filter(unit => !hasSuccessfulSubmission(mySubmissions, unit.assignment?.id)).sort((a,b) => (a.assignment?.deadline || '9999').localeCompare(b.assignment?.deadline || '9999'));
  const extra = remedials.filter(r => mine(r) && ['PENDING_SUBMISSION','BELUM_LULUS'].includes(r.status));
  const record = attendance.find(mine);
  const project = participants.find(mine);
  return <div className="space-y-5 min-w-0">
    <section className="rounded-2xl bg-gradient-to-br from-blue-950 to-blue-800 p-5 sm:p-7 text-white">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Dashboard mahasiswa</p>
      <h1 className="text-2xl sm:text-3xl font-bold mt-2 break-words">Halo, {currentStudent?.name || 'Mahasiswa'}</h1>
      <p className="text-sm text-blue-100 mt-2">{course?.name || 'Mata kuliah belum tersedia'}</p>
      <div className="mt-5 rounded-xl bg-white/10 p-4">
        <p className="font-semibold">{extra.length ? `${extra.length} tugas tambahan perlu ditindaklanjuti` : pending.length ? `${pending.length} tugas belum dikumpulkan` : nextAssignment ? 'Lanjutkan tugas praktik Anda' : units.length ? (progressUnits.length ? 'Semua tugas sudah tersimpan' : 'Materi praktik tersedia') : 'Materi belum tersedia'}</p>
        <p className="text-sm text-blue-100 mt-1">{extra.length ? 'Buka nilai dan remedial untuk melihat instruksi.' : pending[0]?.assignment ? `${pending[0].assignment.title} • ${formatSubmissionDeadline(pending[0].assignment.deadline)} WITA` : nextUnit?.title || 'Periksa hasil penilaian atau informasi dari instruktur.'}</p>
        <button onClick={() => extra.length ? onGrade() : onLearn(pending[0]?.id || nextUnit?.id)} disabled={!extra.length && !units.length} className="mt-4 min-h-11 px-4 bg-white text-blue-900 rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-50">{extra.length ? 'Lihat remedial' : pending.length ? 'Buka tugas' : 'Lanjut belajar'}<ArrowRight size={17}/></button>
      </div>
    </section>
    {!isLiveBackend && <p className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm text-amber-900">Mode lokal: aktivitas dan berkas pada perangkat ini belum tersinkron ke instruktur.</p>}
    <div className="grid grid-cols-2 gap-3">
      <section className="rounded-xl border p-4"><p className="text-sm text-slate-500">Progres upload tugas</p><p className="text-2xl font-bold mt-2">{done}<span className="text-sm font-normal text-slate-500"> / {totalProgressUnits} unit</span></p><progress aria-label="Progres upload tugas" value={done} max={totalProgressUnits || 1} className="w-full h-2 mt-3 accent-blue-600"/><p className="text-xs text-slate-500 mt-2">Berdasarkan upload yang berhasil tersimpan.</p></section>
      <section className="rounded-xl border p-4"><p className="text-sm text-slate-500">Tugas belum dikirim</p><p className="text-2xl font-bold mt-2">{pending.length}</p><p className="text-xs text-slate-500 mt-3">{extra.length} tugas tambahan perlu dikerjakan</p></section>
    </div>
    {project?.finalProjectReviewStatus === 'REVISION_REQUIRED' && <button onClick={onProject} className="w-full text-left p-4 rounded-xl bg-amber-50 border border-amber-200"><strong className="text-amber-900">Final project perlu revisi</strong><p className="text-sm mt-1">{project.finalProjectFeedback || 'Buka proyek untuk melihat tindak lanjut.'}</p></button>}
    <nav aria-label="Akses cepat mahasiswa" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[{label:'Materi & tugas', icon:BookOpen, action:() => onLearn(nextUnit?.id)}, {label:'Final project',icon:ClipboardList,action:onProject}, {label:'Nilai & remedial',icon:Award,action:onGrade}].map(item => <button key={item.label} onClick={item.action} className="min-h-12 p-3 border rounded-xl flex items-center gap-3 text-sm font-semibold text-blue-800 hover:bg-blue-50"><item.icon size={19}/>{item.label}<ArrowRight size={16} className="ml-auto"/></button>)}
    </nav>
    <section className="border rounded-2xl p-4 sm:p-5"><h2 className="font-bold">Periode praktik</h2><p className="text-sm mt-2">{period?.name || 'Belum ada periode'}</p>{period && <p className="text-sm text-slate-600 mt-1">{period.startDate} – {period.endDate} • WITA</p>}<p className="text-xs text-slate-500 mt-2">{period?.status === 'ACTIVE' ? 'Periode sedang berlangsung' : period?.status === 'COMPLETED' ? 'Periode telah berakhir' : 'Periksa jadwal periode sebelum memulai praktik.'}</p></section>
    <section className="border rounded-2xl p-4 sm:p-5"><h2 className="font-bold">Tugas saya</h2>{pending.length ? <ul className="divide-y mt-2">{pending.map(unit => <li key={unit.id}><button onClick={() => onLearn(unit.id)} className="w-full min-h-14 py-3 flex items-center gap-3 text-left"><div className="min-w-0 flex-1"><p className="font-medium text-sm break-words">{unit.assignment?.title}</p><p className="text-xs text-slate-500 mt-1">Batas: {formatSubmissionDeadline(unit.assignment?.deadline || '')} WITA</p></div><ArrowRight size={17}/></button></li>)}</ul> : <p className="text-sm text-slate-500 mt-3">{units.some(u => u.assignment) ? 'Semua tugas telah dikumpulkan. Periksa nilai untuk hasil evaluasi.' : 'Belum ada tugas yang diberikan.'}</p>}</section>
    <section className="border rounded-2xl p-4 sm:p-5"><h2 className="font-bold">Catatan presensi</h2>{record ? <><div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">{(['day1','day2','day3','day4','day5'] as const).map((day,index) => <div key={day} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Hari {index+1}</p><p className="text-sm font-semibold mt-1">{record[day]}</p></div>)}</div><p className="text-xs text-slate-500 mt-3">Catatan sistem dapat berubah setelah pemeriksaan instruktur. Hubungi instruktur jika ada ketidaksesuaian.</p></> : <p className="text-sm text-slate-500 mt-3">Belum ada catatan presensi.</p>}</section>
  </div>;
};
