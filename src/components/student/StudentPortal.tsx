// Student Progressive Learning Workspace & Portal (PRD Section 28-40, 68)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  RotateCcw,
  User,
  GraduationCap,
  Award,
  Layers,
  HelpCircle,
  FolderArchive,
  LogOut,
  List,
  LayoutGrid
} from 'lucide-react';
import { StudentIdentityModal } from './StudentIdentityModal';
import { StudentAssignmentCard } from './StudentAssignmentCard';
import { StudentFinalProjectCard } from './StudentFinalProjectCard';
import { StudentGradeCard } from './StudentGradeCard';
import { StudentCourseCatalog } from './StudentCourseCatalog';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { formatPeriodRange } from '../../utils/dateUtils';

interface StudentPortalProps {
  courseSlug?: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ courseSlug = 'pemesinan-cnc' }) => {
  const {
    courses,
    activeCourseId,
    periods,
    learningUnits,
    unitProgress,
    participants,
    submissions,
    studentSession,
    currentStudent,
    setStudentIdentity,
    toggleUnitCompletion,
    clearStudentIdentity
  } = useApp();

  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'UNITS' | 'FINAL_PROJECT' | 'GRADE'>('UNITS');
  const [pdfModalDoc, setPdfModalDoc] = useState<{ isOpen: boolean; title: string; url?: string } | null>(null);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(true);

  // Catalog view state (PRD Option B: Course Catalog & Switcher)
  const [isViewingCatalog, setIsViewingCatalog] = useState<boolean>(() => {
    return !sessionStorage.getItem('poliwako_in_workspace');
  });
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>(
    studentSession?.courseSlug || courseSlug || 'pemesinan-cnc'
  );

  // Sync if courseSlug prop changes
  React.useEffect(() => {
    if (courseSlug) {
      setSelectedCourseSlug(courseSlug);
    }
  }, [courseSlug]);

  // Determine current active course
  const currentCourse = courses.find(c => c.slug === selectedCourseSlug) ||
                        courses.find(c => c.slug === courseSlug) ||
                        courses.find(c => c.id === activeCourseId) ||
                        courses[0];

  // Active period
  const activePeriod = periods.find(p => p.courseId === currentCourse?.id && p.status === 'ACTIVE') ||
                       periods.find(p => p.courseId === currentCourse?.id);

  // Units for this period
  const periodUnits = useMemo(() => {
    if (!activePeriod) return [];
    return learningUnits
      .filter(u => u.periodId === activePeriod.id)
      .sort((a, b) => a.unitNumber - b.unitNumber);
  }, [learningUnits, activePeriod]);

  // Handler to switch course from catalog
  const handleSelectCourse = (slug: string) => {
    const targetCourse = courses.find(c => c.slug === slug);
    const targetPeriod = periods.find(p => p.courseId === targetCourse?.id && p.status === 'ACTIVE') ||
                         periods.find(p => p.courseId === targetCourse?.id);
    setSelectedCourseSlug(slug);
    setIsViewingCatalog(false);
    sessionStorage.setItem('poliwako_in_workspace', 'true');
    if (currentStudent && targetCourse && targetPeriod) {
      setStudentIdentity(currentStudent.id, targetCourse.slug, targetPeriod.id);
    }
  };

  const handleOpenCatalog = () => {
    sessionStorage.removeItem('poliwako_in_workspace');
    setIsViewingCatalog(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('poliwako_in_workspace');
    clearStudentIdentity();
  };

  // Reset selected unit if unit does not belong to current periodUnits
  React.useEffect(() => {
    if (periodUnits.length > 0 && !periodUnits.some(u => u.id === selectedUnitId)) {
      setSelectedUnitId(periodUnits[0].id);
      setActiveTab('UNITS');
    }
  }, [periodUnits, selectedUnitId]);

  // If no unit is selected, select the first available or in-progress unit
  const currentUnit = periodUnits.find(u => u.id === selectedUnitId) || periodUnits[0];

  // Progressive Locking logic for Student (PRD Section 34, 35, 36)
  const unitStatusMap = useMemo(() => {
    const map = new Map<string, 'COMPLETED' | 'AVAILABLE' | 'LOCKED'>();
    if (!studentSession || !currentStudent) {
      // If not logged in, first unit is available, others locked
      periodUnits.forEach((u, idx) => {
        map.set(u.id, idx === 0 ? 'AVAILABLE' : 'LOCKED');
      });
      return map;
    }

    const { studentId, periodId } = studentSession;
    const completedSet = new Set(
      unitProgress
        .filter(p => p.studentId === studentId && p.periodId === periodId && p.isCompleted)
        .map(p => p.unitId)
    );

    let unlockNext = true;
    for (const unit of periodUnits) {
      if (completedSet.has(unit.id)) {
        map.set(unit.id, 'COMPLETED');
      } else if (unlockNext) {
        map.set(unit.id, 'AVAILABLE');
        unlockNext = false; // only the immediate next unit is unlocked
      } else {
        map.set(unit.id, 'LOCKED');
      }
    }
    return map;
  }, [periodUnits, studentSession, currentStudent, unitProgress]);

  // Calculate Progress % (PRD Section 36)
  const progressStats = useMemo(() => {
    if (!studentSession || periodUnits.length === 0) return { completed: 0, total: periodUnits.length, percentage: 0 };
    const { studentId, periodId } = studentSession;
    const completed = unitProgress.filter(p => p.studentId === studentId && p.periodId === periodId && p.isCompleted).length;
    const total = periodUnits.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [unitProgress, studentSession, periodUnits]);

  const isLearningComplete = progressStats.percentage === 100;

  // Check assignment submission for current unit
  const currentAssignmentSubmission = useMemo(() => {
    if (!currentUnit?.assignment || !studentSession) return undefined;
    return submissions.find(
      s => s.assignmentId === currentUnit.assignment?.id &&
           s.studentId === studentSession.studentId &&
           s.periodId === studentSession.periodId
    );
  }, [submissions, currentUnit, studentSession]);

  const currentUnitIndex = periodUnits.findIndex(u => u.id === currentUnit?.id);
  const isCurrentUnitCompleted = currentUnit ? unitStatusMap.get(currentUnit.id) === 'COMPLETED' : false;

  const isPrevDisabled = useMemo(() => {
    if (activeTab === 'UNITS') {
      return currentUnitIndex <= 0;
    }
    return false; // Can navigate back from FINAL_PROJECT or GRADE
  }, [activeTab, currentUnitIndex]);

  const isNextDisabled = useMemo(() => {
    if (activeTab === 'GRADE') return true;
    if (activeTab === 'FINAL_PROJECT') return false;
    if (activeTab === 'UNITS') {
      if (periodUnits.length === 0) return true;
      return false;
    }
    return false;
  }, [activeTab, periodUnits.length]);

  const handleNextUnit = () => {
    if (activeTab === 'UNITS') {
      if (currentUnit && !isCurrentUnitCompleted && currentStudent) {
        toggleUnitCompletion(currentUnit.id);
      }
      if (currentUnitIndex < periodUnits.length - 1) {
        const nextUnit = periodUnits[currentUnitIndex + 1];
        setSelectedUnitId(nextUnit.id);
      } else {
        setActiveTab('FINAL_PROJECT');
      }
    } else if (activeTab === 'FINAL_PROJECT') {
      setActiveTab('GRADE');
    }
  };

  const handlePreviousUnit = () => {
    if (activeTab === 'GRADE') {
      setActiveTab('FINAL_PROJECT');
    } else if (activeTab === 'FINAL_PROJECT') {
      setActiveTab('UNITS');
      if (periodUnits.length > 0) {
        setSelectedUnitId(periodUnits[periodUnits.length - 1].id);
      }
    } else if (currentUnitIndex > 0) {
      const prevUnit = periodUnits[currentUnitIndex - 1];
      setSelectedUnitId(prevUnit.id);
      setActiveTab('UNITS');
    }
  };

  // Interactive pointer tracking for background lighting & parallax animation
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [rawMouse, setRawMouse] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
    setRawMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Gate check: If student is not authenticated, render login gate directly with interactive pointer-following animations & glassmorphism
  if (!currentStudent || !studentSession) {
    const spotlightX = rawMouse.x !== null ? `${rawMouse.x}px` : '50%';
    const spotlightY = rawMouse.y !== null ? `${rawMouse.y}px` : '50%';

    return (
      <div 
        onPointerMove={handlePointerMove}
        onMouseMove={handlePointerMove}
        className="relative flex-1 min-h-0 w-full h-full flex flex-col justify-center items-center p-4 overflow-y-auto overflow-x-hidden bg-slate-950 select-none py-6"
      >
        
        {/* Animated & Pointer-Reactive Background Mesh & Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Ambient Base Cyber Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-20" />

          {/* Dynamic Pointer-Illuminated Spotlight Grid */}
          <div 
            className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-35 transition-opacity duration-300"
            style={{
              maskImage: `radial-gradient(circle 500px at ${spotlightX} ${spotlightY}, #000 20%, transparent 80%)`,
              WebkitMaskImage: `radial-gradient(circle 500px at ${spotlightX} ${spotlightY}, #000 20%, transparent 80%)`
            }}
          />

          {/* Pointer Cursor Following Spotlight Aura */}
          {rawMouse.x !== null && rawMouse.y !== null && (
            <div 
              className="absolute w-[38rem] h-[38rem] rounded-full bg-cyan-500/18 blur-[110px] pointer-events-none transition-transform duration-100 ease-out will-change-transform"
              style={{
                left: `${rawMouse.x}px`,
                top: `${rawMouse.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          {/* Parallax Floating Orb 1: Cyan / Blue Glow (Top Left) */}
          <div 
            className="absolute -top-20 -left-20 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-transparent blur-[95px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
            style={{
              transform: `translate(${(mousePos.x - 0.5) * -70}px, ${(mousePos.y - 0.5) * -70}px)`,
            }}
          />

          {/* Parallax Floating Orb 2: Indigo / Purple Glow (Bottom Right) */}
          <div 
            className="absolute -bottom-24 -right-24 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tl from-indigo-600/35 via-purple-600/25 to-transparent blur-[110px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
            style={{
              transform: `translate(${(mousePos.x - 0.5) * 80}px, ${(mousePos.y - 0.5) * 80}px)`,
            }}
          />

          {/* Pulsing Central Deep Blue Glow with subtle Parallax */}
          <div 
            className="absolute top-1/2 left-1/2 w-[36rem] h-[36rem] rounded-full bg-blue-500/15 blur-[130px] pointer-events-none transition-transform duration-500 ease-out will-change-transform"
            style={{
              transform: `translate(calc(-50% + ${(mousePos.x - 0.5) * 35}px), calc(-50% + ${(mousePos.y - 0.5) * 35}px))`,
            }}
          />

          {/* Floating Micro-sparkle Accents moving with pointer */}
          <div 
            className="absolute w-2 h-2 rounded-full bg-cyan-400/80 blur-[0.5px] animate-ping pointer-events-none transition-transform duration-300 ease-out" 
            style={{ 
              top: '25%', 
              left: '22%', 
              animationDuration: '3s',
              transform: `translate(${(mousePos.x - 0.5) * -35}px, ${(mousePos.y - 0.5) * -35}px)` 
            }} 
          />
          <div 
            className="absolute w-2.5 h-2.5 rounded-full bg-blue-400/70 blur-[0.5px] animate-pulse pointer-events-none transition-transform duration-300 ease-out" 
            style={{ 
              bottom: '28%', 
              right: '25%', 
              animationDuration: '4s',
              transform: `translate(${(mousePos.x - 0.5) * 45}px, ${(mousePos.y - 0.5) * 45}px)` 
            }} 
          />
          <div 
            className="absolute w-2 h-2 rounded-full bg-indigo-400/70 blur-[0.5px] animate-ping pointer-events-none transition-transform duration-300 ease-out" 
            style={{ 
              top: '68%', 
              left: '28%', 
              animationDuration: '5s',
              transform: `translate(${(mousePos.x - 0.5) * -25}px, ${(mousePos.y - 0.5) * -25}px)` 
            }} 
          />
        </div>

        {/* Login Gate Frame with subtle 3D tilt reaction */}
        <div 
          className="relative z-10 w-full flex items-center justify-center transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: `perspective(1000px) rotateY(${(mousePos.x - 0.5) * 5}deg) rotateX(${(mousePos.y - 0.5) * -5}deg)`,
          }}
        >
          <StudentIdentityModal
            courseSlug={currentCourse?.slug || courseSlug}
            isEmbedded={true}
          />
        </div>
      </div>
    );
  }

  // Catalog view (PRD Option B): If authenticated and viewing practice catalog
  if (isViewingCatalog) {
    return (
      <StudentCourseCatalog
        onSelectCourse={handleSelectCourse}
      />
    );
  }

  return (
    <div className="h-full w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100">
      
      {/* Top Compact Banner & Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-sm shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                  Learning Workspace
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  {currentCourse?.code} • {currentCourse?.semester} {currentCourse?.academicYear}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 mt-0.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  {currentCourse?.name}
                </h1>
                {activePeriod && (
                  <span className="text-[11px] text-slate-400">
                    Praktik: <strong className="text-cyan-300 font-medium">{activePeriod.name}</strong> ({formatPeriodRange(activePeriod.startDate, activePeriod.endDate)})
                  </span>
                )}
              </div>
            </div>

            {/* Student Actions: Course Switcher, Identity Card & Logout Button */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end shrink-0">
              
              {/* Ganti Praktik (Back to Catalog) Button */}
              <button
                onClick={handleOpenCatalog}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/50 text-xs font-semibold transition-all shadow-xs cursor-pointer group"
                title="Lihat katalog mata kuliah praktik lainnya"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Ganti Praktik</span>
              </button>

              <div className="bg-slate-800/80 border border-slate-700/80 px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentStudent.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white leading-tight truncate">{currentStudent.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono leading-tight">
                    NIM: {currentStudent.nim} • Kelas {currentStudent.className}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-1.5 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Keluar dari sesi mahasiswa"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>

          </div>

          {/* Progress Bar Header (Compact) */}
          {currentStudent && (
            <div className="mt-2 pt-1.5 border-t border-slate-800/70 flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Progres Pembelajaran:</span>
                <span className="font-bold text-cyan-300">{progressStats.completed} dari {progressStats.total} Unit Selesai ({progressStats.percentage}%)</span>
              </div>
              
              <div className="w-48 sm:w-64 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/80 shrink-0">
                <div
                  className="bg-gradient-to-r from-blue-500 to-teal-400 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressStats.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Layout (PRD Section 68) */}
      <div className="flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 py-3.5 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-0">
          
          {/* Left Column: Course Outline / Navigation Sidebar */}
          {isOutlineOpen && (
            <div className="lg:col-span-4 xl:col-span-3 h-full min-h-0 flex flex-col transition-all">
            
            {/* Outline Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-0">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Course Outline</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {periodUnits.length} Unit
                </span>
              </div>

              {/* Units List */}
              <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {periodUnits.map((unit, index) => {
                  const status = unitStatusMap.get(unit.id) || 'LOCKED';
                  const isSelected = activeTab === 'UNITS' && currentUnit?.id === unit.id;
                  const isLocked = status === 'LOCKED';

                  return (
                    <button
                      key={unit.id}
                      disabled={isLocked && !currentStudent}
                      onClick={() => {
                        if (!isLocked || currentStudent) {
                          setSelectedUnitId(unit.id);
                          setActiveTab('UNITS');
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-[3px] border-blue-600 text-blue-900 shadow-xs'
                          : isLocked
                          ? 'opacity-60 bg-slate-50/50 cursor-not-allowed hover:bg-slate-100/50'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {/* Status Icon */}
                      <div className="mt-0.5 shrink-0">
                        {status === 'COMPLETED' ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : status === 'AVAILABLE' ? (
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {unit.unitNumber}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Unit {unit.unitNumber}
                          </span>
                          {unit.assignment && (
                            <span className="px-1.5 py-0.5 text-[8.5px] font-bold bg-amber-100 text-amber-800 rounded">
                              Tugas PDF
                            </span>
                          )}
                        </div>
                        <h4 className={`text-[11px] font-semibold mt-0.5 leading-tight ${isSelected ? 'text-blue-950 font-bold' : 'text-slate-800'}`}>
                          {unit.title}
                        </h4>
                      </div>
                    </button>
                  );
                })}

                {/* Final Project Tab Button */}
                <button
                  onClick={() => setActiveTab('FINAL_PROJECT')}
                  className={`w-full text-left px-3 py-2.5 transition-all flex items-start gap-2.5 border-t border-slate-200 ${
                    activeTab === 'FINAL_PROJECT'
                      ? 'bg-indigo-50 border-l-[3px] border-indigo-600 text-indigo-900'
                      : isLearningComplete
                      ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 hover:bg-indigo-50/80 text-slate-700'
                      : 'opacity-60 bg-slate-50 cursor-not-allowed'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isLearningComplete ? (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Final Project
                    </span>
                    <h4 className="text-[11px] font-semibold text-slate-900 mt-0.5 leading-tight">
                      Pengumpulan Berkas Google Drive
                    </h4>
                  </div>
                </button>

                {/* Hasil Penilaian & Feedback Button */}
                <button
                  onClick={() => setActiveTab('GRADE')}
                  className={`w-full text-left px-3 py-2.5 transition-all flex items-start gap-2.5 ${
                    activeTab === 'GRADE'
                      ? 'bg-emerald-50 border-l-[3px] border-emerald-600 text-emerald-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Evaluasi OBE
                    </span>
                    <h4 className="text-[11px] font-semibold text-slate-900 mt-0.5 leading-tight">
                      Nilai Akhir & Catatan Feedback
                    </h4>
                  </div>
                </button>

              </div>
            </div>
          </div>
        )}

          {/* Right Column: Main Content Area with Flexible / Sticky Header */}
          <div className={`${isOutlineOpen ? 'lg:col-span-8 xl:col-span-9' : 'col-span-12'} h-full min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all`}>
            
            {/* Flexible / Sticky Top Header Bar (Course Outline Toggle + Previous/Next) */}
            <div className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 z-20 shadow-xs">
              <button
                type="button"
                onClick={() => setIsOutlineOpen(prev => !prev)}
                className={`inline-flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-lg ${
                  isOutlineOpen
                    ? 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isOutlineOpen ? 'Tutup sidebar Course Outline' : 'Buka sidebar Course Outline'}
              >
                <List className="w-4 h-4 text-slate-700" />
                <span>Course outline</span>
              </button>

              <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-600">
                <button
                  type="button"
                  disabled={isPrevDisabled}
                  onClick={handlePreviousUnit}
                  className="inline-flex items-center gap-1 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors py-1 px-1.5 rounded hover:bg-slate-50"
                  title="Unit Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous unit</span>
                </button>

                <span className="text-slate-300 select-none">|</span>

                <button
                  type="button"
                  disabled={isNextDisabled}
                  onClick={handleNextUnit}
                  className="inline-flex items-center gap-1 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors py-1 px-1.5 rounded hover:bg-slate-50"
                  title="Unit Berikutnya"
                >
                  <span>Next unit</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Material Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-5 sm:p-7">
              <div className="max-w-4xl mx-auto w-full space-y-6">
            
                {/* Identity prompt warning if not logged in */}
                {!currentStudent && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-amber-900">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>
                        Anda sedang melihat mode pratinjau publik. Silakan pilih identitas Nama + NIM untuk mencatat progres pembelajaran dan mengunggah tugas.
                      </span>
                    </div>
                    <button
                      onClick={() => setIsIdentityModalOpen(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shrink-0 transition-colors"
                    >
                      Pilih NIM
                    </button>
                  </div>
                )}

                {/* Tab: Units Content */}
                {activeTab === 'UNITS' && currentUnit && (
                  <div className="space-y-6">
                    
                    {/* Unit Content */}
                    <div>
                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                            Unit Pembelajaran {currentUnit.unitNumber}
                          </span>
                          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
                            {currentUnit.title}
                          </h2>
                        </div>

                        <div className="shrink-0">
                          {isCurrentUnitCompleted ? (
                            <button
                              type="button"
                              onClick={() => currentStudent && toggleUnitCompletion(currentUnit.id)}
                              className="group flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 rounded-full text-xs font-bold border border-emerald-200 hover:border-rose-200 transition-colors cursor-pointer"
                              title="Klik untuk membatalkan status selesai"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
                              <RotateCcw className="w-3.5 h-3.5 text-rose-600 hidden group-hover:inline" />
                              <span className="group-hover:hidden">Selesai</span>
                              <span className="hidden group-hover:inline">Batal Selesai</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => currentStudent && toggleUnitCompletion(currentUnit.id)}
                              className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
                              title="Klik untuk menandai unit ini telah selesai"
                            >
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                              <span>Tandai Selesai</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-3xl">
                        {currentUnit.description}
                      </p>

                  {/* Materials Section */}
                  <div className="mt-7 space-y-5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Materi & Instruksi Praktik</span>
                    </h3>

                    {currentUnit.materials && currentUnit.materials.length > 0 ? (
                      currentUnit.materials.map(mat => (
                        <div key={mat.id} className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/60 shadow-xs">
                          
                          {/* Rich Text Material */}
                          {mat.type === 'RICHTEXT' && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 mb-2">{mat.title}</h4>
                              <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-white p-4 rounded-lg border border-slate-200 font-mono text-[11px]">
                                {mat.contentText}
                              </div>
                            </div>
                          )}

                          {/* YouTube Video Embed (PRD Section 31) - Refined Comfortable Size */}
                          {mat.type === 'YOUTUBE' && (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <PlayCircle className="w-4 h-4 text-red-600" />
                                <h4 className="text-xs font-bold text-slate-800">{mat.title}</h4>
                              </div>
                              <div className="max-w-2xl mx-auto aspect-video w-full rounded-xl overflow-hidden shadow-md bg-slate-950 border border-slate-800">
                                <iframe
                                  src={mat.contentUrl}
                                  title={mat.title}
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              </div>
                              {mat.contentText && (
                                <p className="text-[11px] text-slate-500 text-center italic">{mat.contentText}</p>
                              )}
                            </div>
                          )}

                          {/* PDF Material Preview & Download (PRD Section 30) */}
                          {mat.type === 'PDF' && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800">{mat.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono">{mat.fileSize || 'PDF Document'}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                <button
                                  onClick={() => setPdfModalDoc({ isOpen: true, title: mat.title, url: mat.contentUrl })}
                                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <span>Preview PDF</span>
                                </button>
                                <a
                                  href={mat.contentUrl || '#'}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Unduh</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {/* External Link (PRD Section 32) */}
                          {mat.type === 'EXTERNAL_LINK' && (
                            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{mat.title}</h4>
                                <p className="text-[10px] text-slate-400 truncate max-w-xs">{mat.contentUrl}</p>
                              </div>
                              <a
                                href={mat.contentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200"
                              >
                                <span>Buka Materi</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}

                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Belum ada lampiran materi pada unit ini.</p>
                    )}
                  </div>



                </div>

                {/* Assignment Component if assigned to this unit */}
                {currentUnit.assignment && (
                  <StudentAssignmentCard
                    assignment={currentUnit.assignment}
                    submission={currentAssignmentSubmission}
                    isPeriodExpired={activePeriod?.status === 'COMPLETED'}
                  />
                )}

              </div>
            )}

            {/* Tab: Final Project */}
            {activeTab === 'FINAL_PROJECT' && (
              <StudentFinalProjectCard
                isUnlocked={isLearningComplete}
                driveUrl={activePeriod?.finalProjectDriveUrl}
              />
            )}

            {/* Tab: Grade and Feedback */}
            {activeTab === 'GRADE' && (
              <StudentGradeCard />
            )}

              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Student Identity Modal */}
      <StudentIdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        courseSlug={currentCourse?.slug || 'pemesinan-cnc'}
      />

      {/* PDF Viewer Modal */}
      {pdfModalDoc && (
        <PDFViewerModal
          isOpen={pdfModalDoc.isOpen}
          onClose={() => setPdfModalDoc(null)}
          title={pdfModalDoc.title}
          fileUrl={pdfModalDoc.url}
          authorName={currentStudent?.name}
        />
      )}

    </div>
  );
};
