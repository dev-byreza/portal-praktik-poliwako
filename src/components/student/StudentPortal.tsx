import { StudentDashboard } from './StudentDashboard';
// Student Progressive Learning Workspace & Portal (PRD Section 28-40, 68)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Lock,
  PlayCircle,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  User,
  GraduationCap,
  Award,
  Layers,
  HelpCircle,
  FolderArchive,
  LogOut,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StudentIdentityModal } from './StudentIdentityModal';
import { StudentAssignmentCard } from './StudentAssignmentCard';
import { StudentFinalProjectCard } from './StudentFinalProjectCard';
import { StudentGradeCard } from './StudentGradeCard';
import { StudentCourseCatalog } from './StudentCourseCatalog';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { FooterBranding } from '../common/FooterBranding';
import { formatPeriodRange } from '../../utils/dateUtils';
import { toYouTubeEmbedUrl } from '../../utils/youtubeUtils';
import { hasSuccessfulSubmission } from '../../utils/studentProgress';
import { sanitizeRichTextHtml } from '../../utils/richText';
import { CountdownLockedPanel, CountdownModal, getCountdownEndAt, isCountdownLocked } from './StudentCountdownGate';
import { getUnitAssignments } from '../../utils/learningAssignments';
import { InteractiveQuiz } from './InteractiveQuiz';

interface StudentPortalProps {
  courseSlug?: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ courseSlug = 'pemesinan-cnc' }) => {
  const {
    courses,
    activeCourseId,
    periods,
    learningUnits,
    participants,
    submissions,
    studentSession,
    currentStudent,
    isInitialDataLoaded,
    initialDataError,
    setStudentIdentity,
    clearStudentIdentity
  } = useApp();

  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [activeTab, setActiveTabState] = useState<'DASHBOARD' | 'UNITS' | 'FINAL_PROJECT' | 'GRADE'>('DASHBOARD');
  const setActiveTab = (tab: 'DASHBOARD' | 'UNITS' | 'FINAL_PROJECT' | 'GRADE') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined' && !isViewingCatalog) {
      const suffix = tab === 'DASHBOARD' ? 'dashboard' : tab === 'FINAL_PROJECT' ? 'final-project' : tab === 'GRADE' ? 'nilai' : 'unit';
      const target = suffix === 'dashboard' ? `/mahasiswa/dashboard/${selectedCourseSlug}` : suffix === 'unit'
        ? `/mahasiswa/unit/${selectedCourseSlug}`
        : suffix === 'final-project'
          ? `/mahasiswa/final-project/${selectedCourseSlug}`
          : `/mahasiswa/nilai/${selectedCourseSlug}`;
      if (window.location.pathname !== target) window.history.pushState(null, '', target);
    }
  };
  const [pdfModalDoc, setPdfModalDoc] = useState<{ isOpen: boolean; title: string; url?: string } | null>(null);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const [countdownDialog, setCountdownDialog] = useState<{ title: string; endAt: number } | null>(null);
  const autoOpenedUnitCountdown = React.useRef<string | null>(null);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));

  React.useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Keep the course outline closed when a desktop window is narrowed into
  // the mobile layout. It can still be opened manually from the compact menu.
  React.useEffect(() => {
    const handleViewportResize = () => {
      if (window.innerWidth < 1024) setIsOutlineOpen(false);
    };
    handleViewportResize();
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

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

  const enrolledCourseIds = useMemo(() => {
    if (!currentStudent) return new Set<string>();
    return new Set(
      periods
        .filter(period => participants.some(participant =>
          participant.periodId === period.id && participant.studentId === currentStudent.id
        ))
        .map(period => period.courseId)
    );
  }, [periods, participants, currentStudent?.id]);
  const isCurrentCourseEnrolled = Boolean(currentCourse && enrolledCourseIds.has(currentCourse.id));

  // Active period
  const activePeriod = (studentSession?.periodId
    ? periods.find(p => p.id === studentSession.periodId && p.courseId === currentCourse?.id)
    : undefined)
    || periods.find(p => p.courseId === currentCourse?.id && p.status === 'ACTIVE')
    || periods.find(p => p.courseId === currentCourse?.id);

  // Units for this period
  const periodUnits = useMemo(() => {
    if (!activePeriod) return [];
    return learningUnits
      .filter(u => u.periodId === activePeriod.id)
      .sort((a, b) => a.unitNumber - b.unitNumber);
  }, [learningUnits, activePeriod]);

  // Keep the last opened unit isolated per student, course, and practice
  // period so a refresh returns to the same course-outline item.
  const selectedUnitStorageKey = `poliwako_student_last_unit:${currentStudent?.id || 'anonymous'}:${currentCourse?.id || selectedCourseSlug}:${activePeriod?.id || 'none'}`;

  // Handler to switch course from catalog
  React.useEffect(() => {
    const syncStudentSlug = () => {
      const parts = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
      if (parts[0] !== 'mahasiswa') return;
      if (!parts[1]) {
        sessionStorage.removeItem('poliwako_in_workspace');
        setIsViewingCatalog(false);
        return;
      }
      const isCanonicalRoute = ['dashboard', 'unit', 'final-project', 'nilai'].includes(parts[1]);
      const slug = isCanonicalRoute ? parts[2] : parts[1];
      const section = isCanonicalRoute ? parts[1] : parts[2];
      setIsViewingCatalog(!slug);
      if (slug) setSelectedCourseSlug(slug);
      if (section === 'dashboard') setActiveTabState('DASHBOARD');
      else if (section === 'final-project') setActiveTabState('FINAL_PROJECT');
      else if (section === 'nilai') setActiveTabState('GRADE');
      else if (section === 'unit') setActiveTabState('UNITS');
    };
    window.addEventListener('popstate', syncStudentSlug);
    syncStudentSlug();
    return () => window.removeEventListener('popstate', syncStudentSlug);
  }, []);

  const handleSelectCourse = (slug: string) => {
    const targetCourse = courses.find(c => c.slug === slug);
    if (!targetCourse || !enrolledCourseIds.has(targetCourse.id)) return;
    const enrolledPeriods = periods.filter(period => period.courseId === targetCourse.id && participants.some(participant =>
      participant.periodId === period.id && participant.studentId === currentStudent?.id
    ));
    const targetPeriod = enrolledPeriods.find(period => period.id === studentSession?.periodId) ||
                         enrolledPeriods.find(period => period.status === 'ACTIVE') ||
                         enrolledPeriods[0] ||
                         periods.find(period => period.courseId === targetCourse.id && period.status === 'ACTIVE') ||
                         periods.find(period => period.courseId === targetCourse.id);
    setSelectedCourseSlug(slug);
    setIsViewingCatalog(false);
    window.history.pushState(null, '', `/mahasiswa/dashboard/${slug}`);
    setActiveTabState('DASHBOARD');
    sessionStorage.setItem('poliwako_in_workspace', 'true');
    if (currentStudent && targetCourse && targetPeriod) {
      setStudentIdentity(currentStudent.id, targetCourse.slug, targetPeriod.id);
    }
  };

  const handleOpenCatalog = () => {
    sessionStorage.removeItem('poliwako_in_workspace');
    setIsViewingCatalog(true);
    window.history.pushState(null, '', '/mahasiswa/unit');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('poliwako_in_workspace');
    clearStudentIdentity();
  };

  // Restore the last selected unit after the active period has loaded. If it
  // was removed or is not part of this period, safely fall back to unit one.
  React.useEffect(() => {
    if (periodUnits.length === 0) return;
    const storedUnitId = sessionStorage.getItem(selectedUnitStorageKey);
    const storedUnit = storedUnitId && periodUnits.some(unit => unit.id === storedUnitId)
      ? storedUnitId
      : '';
    const selectedUnitIsValid = periodUnits.some(unit => unit.id === selectedUnitId);

    if (storedUnit && storedUnit !== selectedUnitId) {
      setSelectedUnitId(storedUnit);
    } else if (!selectedUnitIsValid) {
      setSelectedUnitId(periodUnits[0].id);
    }
  }, [periodUnits, selectedUnitStorageKey]);

  // Persist changes made through the outline, next/previous controls, or the
  // dashboard's "Pelajari" action so the choice survives a page refresh.
  React.useEffect(() => {
    if (!selectedUnitId || !periodUnits.some(unit => unit.id === selectedUnitId)) return;
    sessionStorage.setItem(selectedUnitStorageKey, selectedUnitId);
  }, [periodUnits, selectedUnitId, selectedUnitStorageKey]);

  // If no unit is selected, select the first available or in-progress unit
  const currentUnit = periodUnits.find(u => u.id === selectedUnitId) || periodUnits[0];
  const currentUnitCountdownEndAt = getCountdownEndAt(currentUnit || {});
  const currentUnitCountdownLocked = isCountdownLocked(currentUnit || {}, countdownNow);

  // A countdown belongs to the unit, so open one large gate as soon as the
  // selected unit becomes available in the workspace.
  React.useEffect(() => {
    if (!currentUnit || !currentUnitCountdownLocked || !currentUnitCountdownEndAt) return;
    if (autoOpenedUnitCountdown.current === currentUnit.id) return;
    autoOpenedUnitCountdown.current = currentUnit.id;
    setCountdownDialog({
      title: `Unit ${currentUnit.unitNumber}: ${currentUnit.title}`,
      endAt: currentUnitCountdownEndAt,
    });
  }, [currentUnit?.id, currentUnit?.unitNumber, currentUnit?.title, currentUnitCountdownLocked, currentUnitCountdownEndAt]);

  // Unit access is always open. A completed state is shown only after the
  // student's uploaded file has been saved successfully.
  const unitStatusMap = useMemo(() => {
    const map = new Map<string, 'COMPLETED' | 'AVAILABLE'>();
    const currentSubmissions = studentSession
      ? submissions.filter(s => s.studentId === studentSession.studentId && s.periodId === studentSession.periodId)
      : [];
    periodUnits.forEach(unit => {
      map.set(
        unit.id,
        getUnitAssignments(unit).length > 0 && getUnitAssignments(unit).every(assignment => hasSuccessfulSubmission(currentSubmissions, assignment.id))
          ? 'COMPLETED' : 'AVAILABLE'
      );
    });
    return map;
  }, [periodUnits, studentSession, submissions]);

  // Progress is driven by successfully saved uploads, never by navigation.
  const progressStats = useMemo(() => {
    const progressAssignments = periodUnits.flatMap(getUnitAssignments);
    const currentSubmissions = studentSession
      ? submissions.filter(s => s.studentId === studentSession.studentId && s.periodId === studentSession.periodId)
      : [];
    const total = progressAssignments.length;
    const completed = progressAssignments.filter(assignment => hasSuccessfulSubmission(currentSubmissions, assignment.id)).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [periodUnits, submissions, studentSession]);

  const isFinalProjectActive = activePeriod?.finalProjectEnabled === true;

  const currentUnitAssignments = useMemo(() => getUnitAssignments(currentUnit), [currentUnit]);
  const currentUnitMaterials = useMemo(
    () => currentUnit?.materials.filter(material => material.type !== 'QUIZ') || [],
    [currentUnit]
  );
  const currentUnitQuizzes = useMemo(
    () => currentUnit?.materials.filter(material => material.type === 'QUIZ') || [],
    [currentUnit]
  );

  const currentUnitIndex = periodUnits.findIndex(u => u.id === currentUnit?.id);

  const isPrevDisabled = useMemo(() => {
    if (activeTab === 'DASHBOARD') return true;
    if (activeTab === 'UNITS') {
      return currentUnitIndex <= 0;
    }
    return false; // Can navigate back from FINAL_PROJECT or GRADE
  }, [activeTab, currentUnitIndex]);

  const isNextDisabled = useMemo(() => {
    if (activeTab === 'DASHBOARD') return true;
    if (activeTab === 'GRADE') return true;
    if (activeTab === 'FINAL_PROJECT') return false;
    if (activeTab === 'UNITS') {
      return periodUnits.length === 0;
    }
    return false;
  }, [activeTab, periodUnits.length]);

  const handleNextUnit = () => {
    if (activeTab === 'UNITS') {
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

  React.useEffect(() => {
    if (currentStudent && window.location.pathname.replace(/^\/+|\/+$/g, '') === 'mahasiswa') {
      window.history.pushState(null, '', '/mahasiswa/unit');
      sessionStorage.removeItem('poliwako_in_workspace');
      setIsViewingCatalog(true);
    }
  }, [currentStudent]);

  // Never expose a workspace for a course in which this student is not enrolled.
  // Returning to the catalog also keeps manually entered unauthorized slugs from working.
  const unauthorizedCourse = Boolean(
    currentStudent && studentSession && !isViewingCatalog && currentCourse && !isCurrentCourseEnrolled
  );
  React.useEffect(() => {
    if (!unauthorizedCourse || typeof window === 'undefined') return;
    sessionStorage.removeItem('poliwako_in_workspace');
    setIsViewingCatalog(true);
    if (window.location.pathname !== '/mahasiswa/unit') {
      window.history.replaceState(null, '', '/mahasiswa/unit');
    }
  }, [unauthorizedCourse]);
  if (unauthorizedCourse) {
    return <StudentCourseCatalog onSelectCourse={handleSelectCourse} />;
  }

  if (currentStudent && studentSession && !isInitialDataLoaded) {
    return (
      <section aria-busy="true" aria-live="polite" className="min-h-[60vh] space-y-4 bg-slate-100 p-4 sm:p-8" role="status">
        <span className="sr-only">Memuat aktivitas, tenggat, dan nilai dari server…</span>
        <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      </section>
    );
  }

  // Gate check: Keep the student login focused and calm, with no decorative motion.
  if (!currentStudent || !studentSession) {
    return (
      <div className="student-login-shell relative flex min-h-0 flex-1 flex-col overflow-y-auto text-slate-800">
        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:gap-16 lg:py-12">
          <section className="mx-auto w-full max-w-xl lg:mx-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <img src="/logo-poliwako.webp" alt="" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-800">Politeknik Sorowako</p>
                <p className="mt-0.5 text-sm text-slate-500">Portal praktik mahasiswa</p>
              </div>
            </div>

            <div className="mt-6 max-w-lg sm:mt-8 lg:mt-12">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-800">Pembelajaran vokasi</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Materi, tugas, dan progres praktik.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                Masuk dengan NIM untuk membuka materi, mengumpulkan tugas, dan melihat umpan balik instruktur.
              </p>
            </div>

            <ol className="mt-7 hidden max-w-md divide-y divide-slate-200 border-y border-slate-200 sm:block lg:mt-9">
              {[
                ['01', 'Buka materi praktik', 'Ikuti unit dan instruksi dari mata kuliah Anda.'],
                ['02', 'Kirim hasil pekerjaan', 'Unggah tugas dan pantau status pemeriksaannya.'],
                ['03', 'Tinjau umpan balik', 'Lihat nilai dan perbaiki pekerjaan bila diminta.'],
              ].map(([number, title, description]) => (
                <li key={number} className="flex gap-4 py-3.5">
                  <span className="pt-0.5 font-mono text-xs font-semibold text-blue-700">{number}</span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="w-full">
            <StudentIdentityModal
              // Initial login is course-agnostic; the student selects an
              // enrolled course after NIM verification succeeds.
              courseSlug={undefined}
              isEmbedded={true}
            />
          </div>
        </main>
        <footer className="w-full shrink-0 border-t border-slate-200/80 bg-white/70 px-4 py-2.5 text-center">
          <FooterBranding theme="light" compact />
        </footer>
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
      {initialDataError && (
        <div role="alert" className="flex flex-col gap-2 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>{initialDataError}</span>
          <button type="button" onClick={() => window.location.reload()} className="min-h-10 self-start rounded-lg border border-amber-400 bg-white px-3 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 sm:self-auto">Muat ulang</button>
        </div>
      )}
      
      {/* Top Compact Banner & Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white text-slate-800 shadow-sm shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
            
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo Institusi Poliwako */}
              <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0">
                <img src="/logo-poliwako.webp" alt="Logo Poliwako" className="w-full h-full object-contain" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-100 rounded">
                    Learning Workspace
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">
                    {currentCourse?.code} • {currentCourse?.semester} {currentCourse?.academicYear}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 mt-0.5">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                    {currentCourse?.name}
                  </h1>
                  {activePeriod && (
                    <span className="text-[11px] text-slate-500">
                      Praktik: <strong className="text-blue-800 font-semibold">{activePeriod.name.replace(/\s*\([^)]*\)/, '')}</strong> ({formatPeriodRange(activePeriod.startDate, activePeriod.endDate)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Student Actions: Course Switcher, Identity Card & Logout Button */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end shrink-0">
              
              {/* Ganti Praktik (Back to Catalog) Button */}
              <button
                onClick={handleOpenCatalog}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-800 border border-slate-200 hover:border-blue-300 text-xs font-semibold transition-colors cursor-pointer group"
                title="Lihat katalog mata kuliah praktik lainnya"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-blue-700" />
                <span>Ganti Praktik</span>
              </button>

              <div className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 min-w-0 flex-1 md:flex-none md:max-w-none">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentStudent.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">{currentStudent.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono leading-tight truncate whitespace-nowrap" title={`NIM: ${currentStudent.nim} • Kelas ${currentStudent.className}`}>
                    NIM: {currentStudent.nim} • Kelas {currentStudent.className}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-1.5 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Keluar dari sesi mahasiswa"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            </div>

          </div>

          {/* Progress Bar Header (Compact) */}
          {currentStudent && (
            <div className="mt-2 pt-1.5 border-t border-slate-200 flex flex-col items-stretch gap-2 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-slate-500">Progres upload tugas:</span>
                <span className="font-bold text-blue-800">{progressStats.completed} dari {progressStats.total} tugas tersimpan ({progressStats.percentage}%)</span>
              </div>

              <div className="w-full sm:w-48 lg:w-64 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                <div
                  className="bg-blue-700 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressStats.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Layout (PRD Section 68) */}
      <div className="flex-1 min-h-0 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-3.5 overflow-x-hidden overflow-y-hidden">
        <div className={`grid grid-cols-1 lg:grid-cols-12 ${isOutlineOpen ? 'xl:grid-cols-[320px_minmax(0,1fr)]' : 'xl:grid-cols-1'} gap-5 h-full min-h-0`}>
          
          {/* Left Column: Course Outline / Navigation Sidebar */}
          {isOutlineOpen && (
            <div className="lg:col-span-3 xl:col-span-1 h-full min-h-0 flex flex-col transition-all">
            
            {/* Outline Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-0">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Course Outline</span>
                </div>
                <div className="flex items-center gap-2"><span className="text-[10px] font-semibold text-slate-400">{periodUnits.length} Unit</span><button type="button" onClick={() => setIsOutlineOpen(false)} aria-label="Tutup Course Outline" className="md:hidden inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-600 border border-slate-200 shadow-sm"><ChevronUp className="w-3.5 h-3.5" /> Tutup</button></div>
              </div>

              {/* Units List */}
              <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {periodUnits.map((unit) => {
                  const status = unitStatusMap.get(unit.id) || 'AVAILABLE';
                  const isSelected = activeTab === 'UNITS' && currentUnit?.id === unit.id;

                  return (
                    <button
                      key={unit.id}
                      onClick={() => {
                        setSelectedUnitId(unit.id);
                        setActiveTab('UNITS');
                      }}
                      className={`w-full text-left px-3 py-2.5 transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-[3px] border-blue-600 text-blue-900 shadow-xs'
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
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Unit {unit.unitNumber}
                          </span>
                          {getUnitAssignments(unit).length > 0 && (
                            <span className="px-1.5 py-0.5 text-[8.5px] font-bold bg-amber-100 text-amber-800 rounded">
                              {getUnitAssignments(unit).length === 1 ? 'Tugas' : `${getUnitAssignments(unit).length} Tugas`}
                            </span>
                          )}
                          {unit.countdownEnabled && (
                            <span className="px-1.5 py-0.5 text-[8.5px] font-bold bg-indigo-100 text-indigo-800 rounded">
                              Countdown
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
                  disabled={!isFinalProjectActive}
                  onClick={() => {
                    if (isFinalProjectActive) setActiveTab('FINAL_PROJECT');
                  }}
                  className={`w-full text-left px-3 py-2.5 transition-all flex items-start gap-2.5 border-t border-slate-200 ${
                    activeTab === 'FINAL_PROJECT'
                      ? 'bg-indigo-50 border-l-[3px] border-indigo-600 text-indigo-900'
                      : isFinalProjectActive
                      ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 hover:bg-indigo-50/80 text-slate-700'
                      : 'opacity-60 bg-slate-50 cursor-not-allowed'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isFinalProjectActive ? (
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
                      {isFinalProjectActive ? 'Final Project' : 'Berkas Akhir Dikunci'}
                    </span>
                    <h4 className="text-[11px] font-semibold text-slate-900 mt-0.5 leading-tight">
                      {isFinalProjectActive ? 'Pengumpulan Berkas Google Drive' : 'Menunggu aktivasi instruktur'}
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
          <div className={`${isOutlineOpen ? 'lg:col-span-9 xl:col-span-1' : 'col-span-12 xl:col-span-1'} h-full min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all`}>
            
            <nav aria-label="Navigasi mahasiswa" className="grid grid-cols-4 border-b border-slate-200 px-2 sm:px-4 shrink-0">
              {([
                { key: 'DASHBOARD', label: 'Beranda' },
                { key: 'UNITS', label: 'Materi' },
                { key: 'FINAL_PROJECT', label: 'Berkas Akhir' },
                { key: 'GRADE', label: 'Nilai' },
              ] as const).map(item => (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.key === 'FINAL_PROJECT' && !isFinalProjectActive}
                  onClick={() => {
                    if (item.key === 'FINAL_PROJECT' && !isFinalProjectActive) return;
                    setActiveTab(item.key);
                  }}
                  aria-current={activeTab === item.key ? 'page' : undefined}
                  className={`relative min-h-11 sm:min-h-10 px-2 text-xs sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40 ${activeTab === item.key ? 'font-semibold text-slate-900' : 'font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  {item.label}
                  {activeTab === item.key && (
                    <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-blue-600" />
                  )}
                </button>
              ))}
            </nav>
            {/* Flexible / Sticky Top Header Bar (Course Outline Toggle + Previous/Next) */}
            {(activeTab !== 'DASHBOARD' || !isOutlineOpen) && (
            <div className="bg-white border-b border-slate-200/90 px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 shrink-0 z-20">
              {!isOutlineOpen && (
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
                {isOutlineOpen ? <ChevronUp className="w-4 h-4 text-slate-700" /> : <ChevronDown className="w-4 h-4 text-slate-700" />}
                <span className="hidden sm:inline">{isOutlineOpen ? 'Tutup Course Outline' : 'Buka Course Outline'}</span>
                <span className="sm:hidden">{isOutlineOpen ? 'Tutup menu' : 'Buka menu'}</span>
              </button>
              )}

              {activeTab !== 'DASHBOARD' && (
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-medium text-slate-600">
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
              )}
            </div>
            )}

            {/* Scrollable Material Content Area */}
            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto no-scrollbar p-4 sm:p-7 lg:p-5 xl:p-6">
              <div className="max-w-4xl lg:max-w-5xl mx-auto w-full space-y-6">
            
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

                {activeTab === 'DASHBOARD' && <StudentDashboard course={currentCourse} period={activePeriod} units={periodUnits} onLearn={id => {if(id) setSelectedUnitId(id);setActiveTab('UNITS');}} onGrade={() => setActiveTab('GRADE')} onProject={() => setActiveTab('FINAL_PROJECT')}/>}
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

                      </div>

                      {currentUnitCountdownLocked ? (
                        <CountdownLockedPanel
                          title={`Unit ${currentUnit.unitNumber}: ${currentUnit.title}`}
                          onOpen={() => {
                            if (currentUnitCountdownEndAt) {
                              setCountdownDialog({
                                title: `Unit ${currentUnit.unitNumber}: ${currentUnit.title}`,
                                endAt: currentUnitCountdownEndAt,
                              });
                            }
                          }}
                        />
                      ) : (
                        <>
                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-3xl">
                        {currentUnit.description}
                      </p>

                  {/* Materials Section */}
                  <div className="mt-7 space-y-5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Materi & Instruksi Praktik</span>
                    </h3>

                    {currentUnitMaterials.length > 0 ? (
                      currentUnitMaterials.map(mat => (
                        <div key={mat.id} className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/60 shadow-xs">
                          <>
                          {/* Rich Text Material */}
                          {mat.type === 'RICHTEXT' && (
                            <div>
                              {mat.title?.trim() && <h4 className="text-xs font-bold text-slate-800 mb-2">{mat.title}</h4>}
                              <div
                                className="rich-text-content rounded-lg border border-slate-200 bg-white p-4 text-[13px] leading-relaxed text-slate-700"
                                dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(mat.contentText) }}
                              />
                            </div>
                          )}

                          {/* YouTube Video Embed (PRD Section 31) - Refined Comfortable Size */}
                          {mat.type === 'YOUTUBE' && (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <PlayCircle className="w-4 h-4 text-red-600" />
                                <h4 className="text-xs font-bold text-slate-800">{mat.title}</h4>
                              </div>
                              {toYouTubeEmbedUrl(mat.contentUrl) ? (
                                <div className="max-w-2xl mx-auto aspect-video w-full rounded-xl overflow-hidden shadow-md bg-slate-950 border border-slate-800">
                                  <iframe
                                    src={toYouTubeEmbedUrl(mat.contentUrl) || undefined}
                                    title={mat.title}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
                                  ></iframe>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                                  Link YouTube belum valid. Silakan buka kembali materi atau hubungi instruktur.
                                </div>
                              )}
                              {mat.contentUrl && (
                                <a href={mat.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800">
                                  Buka video di YouTube <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
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
                            <a
                              href={mat.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Buka materi ${mat.title}`}
                              className="group mx-auto flex w-full max-w-3xl items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                                <ExternalLink className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-xs font-bold text-slate-800 transition-colors group-hover:text-blue-700">{mat.title}</h4>
                                <p className="truncate text-[10px] text-slate-400">{mat.contentUrl}</p>
                              </div>
                              <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600" />
                            </a>
                          )}
                          </>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Belum ada lampiran materi pada unit ini.</p>
                    )}
                  </div>
                        </>
                      )}

                  {countdownDialog && (
                    <CountdownModal
                      title={countdownDialog.title}
                      endAt={countdownDialog.endAt}
                      onClose={() => setCountdownDialog(null)}
                    />
                  )}



                </div>

                {/* Assignment Component if assigned to this unit */}
                {!currentUnitCountdownLocked && currentUnitAssignments.map(assignment => (
                  <StudentAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    submission={studentSession
                      ? submissions.find(submission => submission.assignmentId === assignment.id
                        && submission.studentId === studentSession.studentId
                        && submission.periodId === studentSession.periodId)
                      : undefined}
                  />
                ))}

                {/* Quiz is intentionally the final activity in every unit. */}
                {!currentUnitCountdownLocked && currentUnitQuizzes.length > 0 && (
                  <div className="mt-7 space-y-4 border-t border-slate-200 pt-6">
                    <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Quiz Interaktif</span>
                    </h3>
                    {currentUnitQuizzes.map(quiz => (
                      <InteractiveQuiz
                        key={quiz.id}
                        material={quiz}
                        studentId={studentSession?.studentId}
                        periodId={studentSession?.periodId}
                        sessionToken={studentSession?.sessionToken}
                      />
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* Tab: Final Project */}
            {activeTab === 'FINAL_PROJECT' && (
              <StudentFinalProjectCard
                isActive={isFinalProjectActive}
                driveUrl={activePeriod?.finalProjectDriveUrl}
                description={activePeriod?.finalProjectDescription}
              />
            )}

            {/* Tab: Grade and Feedback */}
            {activeTab === 'GRADE' && (
              <StudentGradeCard />
            )}

              </div>
              <footer className="mt-6 border-t border-slate-200 pt-4 pb-1 text-center">
            <FooterBranding theme="light" compact />
          </footer>
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
