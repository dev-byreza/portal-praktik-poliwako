import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  GraduationCap, 
  Calendar, 
  LogOut, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { formatPeriodRange } from '../../utils/dateUtils';

interface StudentCourseCatalogProps {
  onSelectCourse: (courseSlug: string) => void;
}

export const StudentCourseCatalog: React.FC<StudentCourseCatalogProps> = ({ onSelectCourse }) => {
  const {
    currentStudent,
    courses,
    periods,
    learningUnits,
    unitProgress,
    clearStudentIdentity
  } = useApp();

  // Interactive pointer tracking for background lighting
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [rawMouse, setRawMouse] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
    setRawMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED');

  return (
    <div 
      onPointerMove={handlePointerMove}
      onMouseMove={handlePointerMove}
      className="relative flex-1 min-h-0 w-full h-full flex flex-col overflow-y-auto bg-slate-950 text-white selection:bg-blue-600 selection:text-white"
    >
      
      {/* Dynamic Cyber Glow Background with Pointer Tracking */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-25" />
        
        {rawMouse.x !== null && rawMouse.y !== null && (
          <div 
            className="absolute w-[40rem] h-[40rem] rounded-full bg-cyan-500/12 blur-[120px] pointer-events-none transition-transform duration-100 ease-out will-change-transform"
            style={{
              left: `${rawMouse.x}px`,
              top: `${rawMouse.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

        <div 
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-transparent blur-[100px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * -60}px, ${(mousePos.y - 0.5) * -60}px)`,
          }}
        />
        <div 
          className="absolute -bottom-28 -right-28 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tl from-indigo-600/25 via-purple-600/20 to-transparent blur-[110px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * 70}px, ${(mousePos.y - 0.5) * 70}px)`,
          }}
        />
        <div 
          className="absolute top-1/3 left-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-[130px] pointer-events-none transition-transform duration-500 ease-out will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${(mousePos.x - 0.5) * 35}px), calc(-50% + ${(mousePos.y - 0.5) * 35}px))`,
          }}
        />
      </div>

      {/* Top Navbar Header */}
      <header className="relative z-10 sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-md shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">Portal Praktik Poliwako</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
                  Katalog Praktik
                </span>
              </div>
              <p className="text-xs text-slate-400">Politeknik Sorowako • Learning & OBE Assessment Workspace</p>
            </div>
          </div>

          {/* Student Profile Card & Logout */}
          <div className="flex items-center gap-3">
            {currentStudent && (
              <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xs">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
                  {currentStudent.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-200 leading-tight">{currentStudent.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    NIM: <span className="font-mono text-cyan-300">{currentStudent.nim}</span> • Kelas {currentStudent.className}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={clearStudentIdentity}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 hover:border-red-500/40 text-xs font-medium transition-all shadow-xs cursor-pointer"
              title="Keluar dari sesi portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start">
        
        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mata Kuliah Praktik Terdaftar Semester Ganjil 2026/2027</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pilih Mata Kuliah Praktik
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
            Selamat datang di Portal Pembelajaran Praktik Poliwako. Silakan pilih salah satu mata kuliah praktik di bawah ini untuk mengakses modul ajar, video tutorial, pengumpulan penugasan, dan rekap penilaian OBE Anda.
          </p>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {publishedCourses.map((course) => {
            // Find active period for this course
            const activePeriod = periods.find(p => p.courseId === course.id && p.status === 'ACTIVE') ||
                                 periods.find(p => p.courseId === course.id);

            // Units in this active period
            const units = activePeriod
              ? learningUnits.filter(u => u.periodId === activePeriod.id)
              : [];

            // Calculate student progress
            const completedCount = currentStudent && activePeriod
              ? unitProgress.filter(p => p.studentId === currentStudent.id && p.periodId === activePeriod.id && p.isCompleted).length
              : 0;

            const totalUnits = units.length;
            const progressPercent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;
            const isCompletedAll = totalUnits > 0 && completedCount === totalUnits;

            return (
              <div
                key={course.id}
                className="group relative flex flex-col bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 backdrop-blur-sm"
              >
                {/* Course Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md">
                        {course.code}
                      </span>
                      <span className="text-xs text-slate-400">
                        {course.department}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {course.name}
                    </h2>
                  </div>

                  <div className="shrink-0 w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-all shadow-inner">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                {/* Course Description */}
                <p className="text-xs text-slate-400 line-clamp-2 mb-5 leading-relaxed">
                  {course.description}
                </p>

                {/* Active Period Information */}
                {activePeriod ? (
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 mb-5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Periode Praktik Aktif:
                      </span>
                      <span className="font-semibold text-cyan-300">
                        {activePeriod.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Jadwal Pelaksanaan:
                      </span>
                      <span className="text-slate-300 font-mono">
                        {formatPeriodRange(activePeriod.startDate, activePeriod.endDate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 mb-5 text-xs text-slate-400">
                    Belum ada periode praktik yang dibuka untuk mata kuliah ini.
                  </div>
                )}

                {/* Progress Bar & Unit Count */}
                <div className="mt-auto pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Progres Pembelajaran
                    </span>
                    <span className="font-bold text-slate-200">
                      {completedCount} dari {totalUnits} Unit ({progressPercent}%)
                    </span>
                  </div>

                  {/* Progress bar track */}
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-5">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompletedAll
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectCourse(course.slug)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/35 transition-all group-hover:translate-y-[-1px] active:translate-y-[0px] cursor-pointer"
                  >
                    <span>Buka Workspace Praktik</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-xs text-slate-500 pb-6">
          <p>© 2026 Politeknik Sorowako — Sistem Penilaian Praktik Terintegrasi Outcome-Based Education (OBE)</p>
        </div>

      </main>

    </div>
  );
};
