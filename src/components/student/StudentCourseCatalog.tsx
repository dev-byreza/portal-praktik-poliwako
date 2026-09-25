import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  LogOut,
  Layers,
  Sparkles,
  UserRound,
  LoaderCircle
} from 'lucide-react';
import { formatPeriodRange } from '../../utils/dateUtils';
import { hasSuccessfulSubmission } from '../../utils/studentProgress';
import { getUnitAssignments } from '../../utils/learningAssignments';
import { FooterBranding } from '../common/FooterBranding';

interface StudentCourseCatalogProps {
  onSelectCourse: (courseSlug: string) => void;
}

export const StudentCourseCatalog: React.FC<StudentCourseCatalogProps> = ({ onSelectCourse }) => {
  const {
    currentStudent,
    courses,
    instructorDirectory,
    periods,
    participants,
    learningUnits,
    submissions,
    isInitialDataLoaded,
    initialDataError,
    clearStudentIdentity
  } = useApp();

  const visibleCourses = useMemo(() => {
    if (!currentStudent) return [];
    const enrolledCourseIds = new Set(
      periods
        .filter(period => participants.some(participant =>
          participant.periodId === period.id && participant.studentId === currentStudent.id
        ))
        .map(period => period.courseId)
    );
    return courses.filter(course =>
      course.status === 'PUBLISHED' && enrolledCourseIds.has(course.id)
    );
  }, [courses, periods, participants, currentStudent?.id]);

  return (
    <div className="relative flex-1 min-h-0 w-full h-full flex flex-col overflow-y-auto bg-slate-50 text-slate-800 selection:bg-blue-100 selection:text-blue-950">

      {/* Student Session Bar (Aligned Full Width) */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm shrink-0">
        <div className="w-full px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Logo Institusi Poliwako */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1.5 flex items-center justify-center shadow-md shadow-cyan-500/10 ring-1 ring-white/20 shrink-0">
              <img src="/logo-poliwako.webp" alt="Logo Poliwako" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight truncate">Portal Praktik Poliwako</p>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Politeknik Sorowako • Outcome-Based Education (OBE)</p>
            </div>
          </div>

          {/* Student Profile Card & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 max-w-[54%] sm:max-w-none">
            {currentStudent && (
              <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 rounded-xl min-w-0 max-w-[44vw] sm:max-w-none">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-800">
                  {currentStudent.name.charAt(0)}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate" title={currentStudent.name}>{currentStudent.name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight truncate whitespace-nowrap">
                    NIM: <span className="font-mono text-blue-700">{currentStudent.nim}</span> • Kelas {currentStudent.className}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={clearStudentIdentity}
              className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Keluar dari sesi portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start items-center">
        
        {/* Welcome Banner */}
        <div className="mb-7 text-center max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            <span>Mata kuliah praktik terdaftar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Pilih Mata Kuliah Praktik
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            Selamat datang di Portal Pembelajaran Praktik Poliwako. Silakan pilih salah satu mata kuliah praktik di bawah ini untuk mengakses modul ajar, video tutorial, pengumpulan penugasan, dan rekap penilaian OBE Anda.
          </p>
        </div>

        {/* Course Cards Container: Selalu center! Jika 1 frame berada di tengah, jika 2 frame bergeser seimbang ke kiri dan kanan dengan titik tengah simetris */}
        <div className="flex flex-wrap justify-center items-stretch gap-6 w-full max-w-5xl mx-auto">
          {!isInitialDataLoaded && (
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <LoaderCircle className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-700" />
              <h2 className="text-lg font-bold text-slate-900">Memuat mata kuliah...</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Tunggu sebentar, kami sedang mengambil daftar mata kuliah dan pendaftaran praktik Anda.
              </p>
            </div>
          )}
          {isInitialDataLoaded && initialDataError && (
            <div role="alert" className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-950">
              <h2 className="text-lg font-bold">Daftar mata kuliah belum dapat dimuat</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-900">{initialDataError}</p>
              <button type="button" onClick={() => window.location.reload()} className="ui-button ui-button-secondary mt-4">Muat ulang</button>
            </div>
          )}
          {isInitialDataLoaded && !initialDataError && visibleCourses.length === 0 && (
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-blue-700" />
              <h2 className="text-lg font-bold text-slate-900">Belum ada mata kuliah terdaftar</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Akun ini belum didaftarkan pada periode praktik mana pun. Hubungi instruktur untuk mendapatkan pendaftaran mata kuliah.
              </p>
            </div>
          )}
          {visibleCourses.map((course) => {
            // Show the period this student is enrolled in, preferring the
            // active enrolled period over another period in the same course.
            const enrolledPeriods = periods.filter(period => period.courseId === course.id && participants.some(participant =>
              participant.periodId === period.id && participant.studentId === currentStudent?.id
            ));
            const activePeriod = enrolledPeriods.find(period => period.status === 'ACTIVE') ||
                                 enrolledPeriods[0];

            const instructorProfile = instructorDirectory[course.instructorId];

            // Units in this active period
            const units = activePeriod
              ? learningUnits.filter(u => u.periodId === activePeriod.id)
              : [];

            // Progress increases only after an uploaded file is saved.
            const progressAssignments = units.flatMap(getUnitAssignments);
            const currentSubmissions = currentStudent && activePeriod
              ? submissions.filter(submission => submission.studentId === currentStudent.id && submission.periodId === activePeriod.id)
              : [];
            const completedCount = progressAssignments.filter(assignment => hasSuccessfulSubmission(currentSubmissions, assignment.id)).length;
            const totalTasks = progressAssignments.length;
            const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            const isCompletedAll = totalTasks > 0 && completedCount === totalTasks;

            return (
              <div
                key={course.id}
                className={`w-full ${visibleCourses.length === 1 ? 'max-w-xl' : 'md:w-[calc(50%-12px)] max-w-xl'} group relative flex flex-col justify-between bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-5 sm:p-6 transition-colors shadow-sm`}
              >
                {/* Course Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-100 rounded-md">
                        {course.code}
                      </span>
                      <span className="text-xs text-slate-500">
                        {course.department}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
                      {course.name}
                    </h2>
                  </div>

                  <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-800">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                {/* Instructor & study program */}
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <UserRound className="h-3.5 w-3.5 text-blue-700" />
                      Instruktur
                    </span>
                    <span className="text-right font-semibold text-slate-800">
                      {instructorProfile?.name || 'Instruktur mata kuliah'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Program Studi</span>
                    <span className="text-right text-slate-700">
                      {instructorProfile?.department || course.department}
                    </span>
                  </div>
                </div>

                {/* Course Description */}
                <p className="text-xs text-slate-600 line-clamp-2 mb-5 leading-relaxed">
                  {course.description}
                </p>

                {/* Active Period Information */}
                {activePeriod ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-700" />
                        Periode Praktik Aktif:
                      </span>
                      <span className="font-semibold text-blue-800">
                        {activePeriod.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Jadwal Pelaksanaan:
                      </span>
                      <span className="text-slate-700 font-mono">
                        {formatPeriodRange(activePeriod.startDate, activePeriod.endDate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-xs text-slate-600">
                    Belum ada periode praktik yang dibuka untuk mata kuliah ini.
                  </div>
                )}

                {/* Progress Bar & Unit Count */}
                <div className="mt-auto pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-700" />
                      Progres Pembelajaran
                    </span>
                    <span className="font-semibold text-slate-800">
                      {completedCount} dari {totalTasks} Tugas ({progressPercent}%)
                    </span>
                  </div>

                  {/* Progress bar track */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-5">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompletedAll
                          ? 'bg-emerald-600'
                          : 'bg-blue-700'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectCourse(course.slug)}
                    className="ui-button ui-button-primary w-full"
                  >
                    <span>Buka Workspace Praktik</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="relative z-10 mt-10 border-t border-slate-200 pt-5 pb-8 text-center">
          <FooterBranding theme="light" compact />
        </footer>
      </main>
    </div>
  );
};
