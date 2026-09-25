import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Megaphone,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course, LearningUnit, PracticePeriod } from '../../types';
import { formatIndonesianDate, getWitaDateString } from '../../utils/dateUtils';
import {
  DeadlineUrgency,
  formatDeadlineDistance,
  formatSubmissionDeadline,
  getDeadlineUrgency,
  submissionDeadline,
} from '../../utils/submissionDeadline';
import { hasSuccessfulSubmission } from '../../utils/studentProgress';
import { getUnitAssignments } from '../../utils/learningAssignments';

const getVisibleAttendanceDays = (startDate?: string): number => {
  const startParts = String(startDate || '').split('-').map(Number);
  if (startParts.length !== 3 || startParts.some(Number.isNaN)) return 5;

  const start = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
  const todayParts = getWitaDateString().split('-').map(Number);
  if (todayParts.length !== 3 || todayParts.some(Number.isNaN)) return 5;

  const today = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);
  const elapsedDays = Math.floor((today - start) / 86400000) + 1;
  return Math.max(0, Math.min(5, elapsedDays));
};

interface Props {
  course?: Course;
  period?: PracticePeriod;
  units: LearningUnit[];
  onLearn: (unitId?: string) => void;
  onGrade: () => void;
  onProject: () => void;
}

interface StudentAction {
  id: string;
  priority: number;
  title: string;
  description: string;
  badge: string;
  tone: 'rose' | 'amber' | 'blue' | 'slate';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

const urgencyPriority: Record<DeadlineUrgency, number> = {
  OVERDUE: 10,
  DUE_SOON: 20,
  UPCOMING: 40,
  LATER: 60,
  UNSCHEDULED: 70,
};

const urgencyTone = (urgency: DeadlineUrgency): StudentAction['tone'] => {
  if (urgency === 'OVERDUE') return 'rose';
  if (urgency === 'DUE_SOON' || urgency === 'UPCOMING') return 'amber';
  return 'blue';
};

const actionStyles: Record<StudentAction['tone'], { container: string; icon: string; badge: string }> = {
  rose: {
    container: 'border-rose-200 bg-rose-50/60 hover:bg-rose-50',
    icon: 'bg-rose-100 text-rose-700',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  amber: {
    container: 'border-amber-200 bg-amber-50/60 hover:bg-amber-50',
    icon: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  blue: {
    container: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  slate: {
    container: 'border-slate-200 bg-slate-50 hover:bg-slate-100',
    icon: 'bg-slate-200 text-slate-700',
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
  },
};

export const StudentDashboard: React.FC<Props> = ({ course, period, units, onLearn, onGrade, onProject }) => {
  const {
    currentStudent,
    studentSession,
    submissions,
    remedials,
    attendance,
    isLiveBackend,
    participants,
    assessments,
    announcements,
  } = useApp();
  const now = Date.now();
  const mine = (item: { studentId: string; periodId: string }) => (
    item.studentId === studentSession?.studentId && item.periodId === period?.id
  );
  const mySubmissions = submissions.filter(mine);
  const progressAssignments = units.flatMap(unit => getUnitAssignments(unit).map(assignment => ({ unit, assignment })));
  const completed = new Set(
    progressAssignments
      .filter(item => hasSuccessfulSubmission(mySubmissions, item.assignment.id))
      .map(item => item.assignment.id)
  );
  const done = progressAssignments.filter(item => completed.has(item.assignment.id)).length;
  // Upload progress is assignment-based. Keep the unit count separate so the
  // dashboard does not suggest that five assignments are five learning units.
  const totalProgressTasks = progressAssignments.length;
  const progressPercent = totalProgressTasks > 0 ? Math.round((done / totalProgressTasks) * 100) : 0;
  const nextUnit = progressAssignments.find(item => !completed.has(item.assignment.id))?.unit || units[0];
  const revisionSubmissions = mySubmissions.filter(submission => submission.status === 'REVISION_REQUIRED');
  const pending = progressAssignments
    .filter(item => !hasSuccessfulSubmission(mySubmissions, item.assignment.id))
    .filter(item => !revisionSubmissions.some(submission => submission.assignmentId === item.assignment.id))
    .sort((a, b) => (submissionDeadline(a.assignment.deadline || '') || Number.MAX_SAFE_INTEGER)
      - (submissionDeadline(b.assignment.deadline || '') || Number.MAX_SAFE_INTEGER));
  const extra = remedials.filter(r => mine(r) && ['PENDING_SUBMISSION', 'BELUM_LULUS'].includes(r.status));
  const record = attendance.find(mine);
  const visibleAttendanceDays = getVisibleAttendanceDays(period?.startDate);
  const project = participants.find(mine);
  const assessment = assessments.find(mine);
  const visibleAnnouncements = useMemo(() => {
    const priorityOrder = { URGENT: 0, IMPORTANT: 1, INFO: 2 } as const;
    return announcements
      .filter(item => item.courseId === course?.id)
      .filter(item => !item.periodId || item.periodId === period?.id)
      .filter(item => item.isActive && (!item.expiresAt || new Date(item.expiresAt).getTime() > now))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.publishedAt.localeCompare(a.publishedAt));
  }, [announcements, course?.id, now, period?.id]);

  const actions = useMemo<StudentAction[]>(() => {
    const items: StudentAction[] = [];

    if (project?.finalProjectReviewStatus === 'REVISION_REQUIRED') {
      items.push({
        id: 'final-project-revision',
        priority: 0,
        title: 'Final project perlu direvisi',
        description: project.finalProjectFeedback || 'Buka final project untuk melihat catatan instruktur.',
        badge: 'Revisi wajib',
        tone: 'rose',
        icon: RotateCcw,
        action: onProject,
      });
    }

    revisionSubmissions.forEach(submission => {
      const item = progressAssignments.find(item => item.assignment.id === submission.assignmentId);
      if (!item) return;
      items.push({
        id: `assignment-revision-${submission.id}`,
        priority: 1,
        title: `${item.assignment.title} perlu direvisi`,
        description: submission.reviewFeedback || 'Buka tugas dan unggah berkas perbaikan sesuai arahan instruktur.',
        badge: `Revisi ${submission.revisionNumber || 1}`,
        tone: 'rose',
        icon: RotateCcw,
        action: () => onLearn(item.unit.id),
      });
    });

    extra.forEach(remedial => {
      const urgency = getDeadlineUrgency(remedial.deadline, now);
      items.push({
        id: `remedial-${remedial.id}`,
        priority: remedial.status === 'BELUM_LULUS' ? 2 : Math.min(8, urgencyPriority[urgency]),
        title: remedial.title,
        description: remedial.status === 'BELUM_LULUS'
          ? 'Belum lulus. Periksa catatan lalu kirim perbaikan.'
          : `${formatDeadlineDistance(remedial.deadline, now)} • ${formatSubmissionDeadline(remedial.deadline)} WITA`,
        badge: remedial.status === 'BELUM_LULUS' ? 'Perlu perbaikan' : 'Remedial',
        tone: remedial.status === 'BELUM_LULUS' || urgency === 'OVERDUE' ? 'rose' : 'amber',
        icon: RotateCcw,
        action: onGrade,
      });
    });

    pending.forEach(({ unit, assignment }) => {
      const urgency = getDeadlineUrgency(assignment.deadline, now);
      const badge = urgency === 'OVERDUE'
        ? 'Tenggat lewat'
        : urgency === 'DUE_SOON'
          ? 'Segera'
          : urgency === 'UPCOMING'
            ? 'Mendekati tenggat'
            : 'Belum dikumpulkan';
      items.push({
        id: `assignment-${assignment.id}`,
        priority: urgencyPriority[urgency],
        title: assignment.title,
        description: `${formatDeadlineDistance(assignment.deadline, now)} • ${formatSubmissionDeadline(assignment.deadline)} WITA`,
        badge,
        tone: urgencyTone(urgency),
        icon: urgency === 'OVERDUE' ? AlertTriangle : Clock,
        action: () => onLearn(unit.id),
      });
    });

    const learningComplete = progressAssignments.length > 0 && done === progressAssignments.length;
    if (period?.finalProjectEnabled && learningComplete && !project?.finalProjectConfirmed) {
      items.push({
        id: 'final-project-submit',
        priority: 30,
        title: 'Final project siap dikumpulkan',
        description: 'Seluruh tugas unit sudah tersimpan. Lanjutkan ke pengumpulan final project.',
        badge: 'Tahap berikutnya',
        tone: 'blue',
        icon: ClipboardList,
        action: onProject,
      });
    }

    if (assessment?.isPublished) {
      items.push({
        id: 'published-grade',
        priority: 80,
        title: 'Nilai dan feedback tersedia',
        description: 'Buka hasil praktik untuk melihat nilai akhir dan arahan instruktur.',
        badge: 'Hasil tersedia',
        tone: 'slate',
        icon: Award,
        action: onGrade,
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [assessment?.isPublished, done, extra, now, onGrade, onLearn, onProject, pending, period?.finalProjectEnabled, progressAssignments, project, revisionSubmissions]);

  const primaryAction = actions[0];
  const requiredActionCount = actions.filter(item => item.priority < 80).length;
  const visibleActions = actions.slice(0, 6);
  const attentionActions = visibleActions.filter(item => item.tone === 'rose');
  const plannedActions = visibleActions.filter(item => item.tone !== 'rose');
  const renderActionList = (items: StudentAction[]) => (
    <ul className="mt-3 space-y-2.5">
      {items.map(item => {
        const styles = actionStyles[item.tone];
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={item.action}
              className={`w-full rounded-xl border p-3.5 text-left transition-colors ${styles.container}`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 break-words">{item.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}>{item.badge}</span>
                  </span>
                  <span className="mt-1 block break-words text-xs leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{item.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-950 bg-blue-900 p-4 text-white sm:p-5">
        <p className="text-xs uppercase tracking-widest text-cyan-200">Dashboard mahasiswa</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2 break-words">Halo, {currentStudent?.name || 'Mahasiswa'}</h1>
        <p className="text-sm text-blue-100 mt-2">{course?.name || 'Mata kuliah belum tersedia'}</p>
        <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="font-semibold">
            {primaryAction?.title || (units.length ? 'Semua pekerjaan utama sudah selesai' : 'Materi belum tersedia')}
          </p>
          <p className="text-sm text-blue-100 mt-1">
            {primaryAction?.description || nextUnit?.title || 'Periksa kembali ketika instruktur menerbitkan aktivitas baru.'}
          </p>
          <button
            onClick={primaryAction?.action || (() => onLearn(nextUnit?.id))}
            disabled={!primaryAction && !units.length}
            className="ui-button ui-button-secondary mt-4 w-full text-blue-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {primaryAction ? 'Kerjakan sekarang' : units.length ? 'Lihat materi' : 'Belum ada aktivitas'}
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {!isLiveBackend && (
        <p className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm text-amber-900">
          Mode lokal: aktivitas dan berkas pada perangkat ini belum tersinkron ke instruktur.
        </p>
      )}

      <nav aria-label="Akses cepat mahasiswa" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Materi & tugas', icon: BookOpen, action: () => onLearn(nextUnit?.id) },
          { label: 'Final project', icon: ClipboardList, action: onProject },
          { label: 'Nilai & remedial', icon: Award, action: onGrade },
        ].map(item => (
          <button key={item.label} onClick={item.action} className="min-h-12 p-3 border rounded-xl flex items-center gap-3 text-sm font-semibold text-blue-800 hover:bg-blue-50">
            <item.icon size={19} />{item.label}<ArrowRight size={16} className="ml-auto" />
          </button>
        ))}
      </nav>

      {visibleAnnouncements.length > 0 && (
        <section className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4 sm:p-5" aria-labelledby="student-announcements-title">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-cyan-700" />
            <h2 id="student-announcements-title" className="font-bold text-slate-900">Pengumuman instruktur</h2>
            <span className="ml-auto rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-800">{visibleAnnouncements.length}</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {visibleAnnouncements.slice(0, 4).map(item => {
              const tone = item.priority === 'URGENT'
                ? 'border-rose-200 bg-rose-50'
                : item.priority === 'IMPORTANT'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-blue-200 bg-white';
              const badge = item.priority === 'URGENT'
                ? 'bg-rose-100 text-rose-700'
                : item.priority === 'IMPORTANT'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700';
              return (
                <article key={item.id} className={`rounded-xl border p-3.5 ${tone}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                      {item.priority === 'URGENT' ? 'Mendesak' : item.priority === 'IMPORTANT' ? 'Penting' : 'Informasi'}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{item.message}</p>
                  <p className="mt-2 text-[10px] text-slate-500">Diterbitkan {formatSubmissionDeadline(item.publishedAt)} WITA</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-xl border p-4 sm:col-span-2">
          <p className="text-sm text-slate-500">Progres upload tugas</p>
          <p className="text-2xl font-bold mt-2">{done}<span className="text-sm font-normal text-slate-500"> / {totalProgressTasks} tugas</span></p>
          <progress aria-label="Progres upload tugas" value={done} max={totalProgressTasks || 1} className="w-full h-2 mt-3 accent-blue-600" />
          <p className="text-xs text-slate-500 mt-2">{progressPercent}% tersimpan • tersebar di {units.length} unit pembelajaran.</p>
        </section>
        <section className="rounded-xl border p-4">
          <p className="text-sm text-slate-500">Perlu tindakan</p>
          <p className="text-2xl font-bold mt-2">{requiredActionCount}</p>
          <p className="text-xs text-slate-500 mt-3">{extra.length} remedial • {pending.length} tugas</p>
        </section>
        <section className="rounded-xl border p-4">
          <p className="text-sm text-slate-500">Kehadiran</p>
          <p className="text-2xl font-bold mt-2">{record ? `${record.percentage}%` : '—'}</p>
          <p className={`text-xs mt-3 font-semibold ${record?.isEligible ? 'text-emerald-700' : record ? 'text-rose-700' : 'text-slate-500'}`}>
            {record ? `${record.isEligible ? 'Status aman' : 'Perlu perhatian'} • ${visibleAttendanceDays} hari berjalan` : 'Belum ada catatan'}
          </p>
        </section>
      </div>

      <section className="border rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Yang harus dikerjakan</h2>
            <p className="text-xs text-slate-500 mt-1">Disusun otomatis berdasarkan revisi dan tenggat terdekat.</p>
          </div>
          {requiredActionCount > 0 && (
            <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
              {requiredActionCount} tindakan
            </span>
          )}
        </div>

        {actions.length > 0 ? (
          <div className="mt-4 space-y-5">
            {attentionActions.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">Terlambat / perlu perbaikan</h3>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{attentionActions.length}</span>
                </div>
                {renderActionList(attentionActions)}
              </div>
            )}
            {plannedActions.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">Segera dikerjakan</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{plannedActions.length}</span>
                </div>
                {renderActionList(plannedActions)}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />Semua pekerjaan utama selesai</div>
            <p className="mt-1 text-xs">Tidak ada tugas, revisi, atau remedial yang perlu ditindaklanjuti saat ini.</p>
          </div>
        )}
      </section>

      <section className="border rounded-2xl p-4 sm:p-5">
        <h2 className="font-bold">Periode praktik</h2>
        <p className="text-sm mt-2">{period?.name || 'Belum ada periode'}</p>
        {period && (
          <>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mulai praktik</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{formatIndonesianDate(period.startDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Selesai praktik</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{formatIndonesianDate(period.endDate)}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Seluruh jadwal praktik mengikuti zona waktu WITA.</p>
          </>
        )}
        <p className="text-xs text-slate-500 mt-2">
          {period?.status === 'ACTIVE' ? 'Periode sedang berlangsung' : period?.status === 'COMPLETED' ? 'Periode telah berakhir' : 'Periksa jadwal periode sebelum memulai praktik.'}
        </p>
      </section>

      <section className="border rounded-2xl p-4 sm:p-5">
        <h2 className="font-bold">Catatan presensi</h2>
        {record ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
              {(['day1', 'day2', 'day3', 'day4', 'day5'] as const).map((day, index) => (
                <div key={day} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Hari {index + 1}</p>
                  <p className="text-sm font-semibold mt-1">{index < visibleAttendanceDays ? record[day] : '-'}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Hari praktik yang belum tiba ditampilkan sebagai tanda strip (-). Catatan sistem dapat berubah setelah pemeriksaan instruktur.</p>
          </>
        ) : <p className="text-sm text-slate-500 mt-3">Belum ada catatan presensi.</p>}
      </section>
    </div>
  );
};
