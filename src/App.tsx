import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { FooterBranding } from './components/common/FooterBranding';
import { Lock, ArrowLeft, Home } from 'lucide-react';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthLoginModal } from './components/instructor/AuthLoginModal';
import { InstructorCommandCenter } from './components/instructor/InstructorCommandCenter';
import { StudentPortal } from './components/student/StudentPortal';
import { PortalSelectorGate } from './components/portal/PortalSelectorGate';
import { InteractiveNotFoundPage } from './components/portal/InteractiveNotFoundPage';

type ActiveRoute = 'ROOT_SELECTOR' | 'STUDENT' | 'INSTRUCTOR' | 'NOT_FOUND';

export const App: React.FC = () => {
  const {
    role,
    setRole,
    activeCourse,
    courses,
    setActiveCourseId,
    studentSession,
    currentStudent,
    isInstructorLoggedIn,
    clearStudentIdentity
  } = useApp();

  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('ROOT_SELECTOR');
  const [invalidSlug, setInvalidSlug] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCourseWizardOpen, setIsCourseWizardOpen] = useState(false);

  // Check URL path simulation for student slug (default cad-1-1 or activeCourse)
  const [currentSlug, setCurrentSlug] = useState<string>(activeCourse?.slug || 'cad-1-1');

  // Handle URL Path & Query Parameters Routing
  useEffect(() => {
    const handleUrlRouting = () => {
      const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
      const path = rawPath.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role')?.toLowerCase();
      const courseParam = params.get('course')?.toLowerCase();

      // Case 1: Root path (/) -> Opsi Pilihan Portal (Portal Instruktur & Portal Mahasiswa)
      if (!path) {
        setActiveRoute('ROOT_SELECTOR');
        return;
      }

      // Case 2: Match course slug in URL path (legacy /cad-1-1 or /mahasiswa/cad-1-1).
      const pathParts = path.split('/').filter(Boolean);
      const coursePathSlug = pathParts[0] === 'mahasiswa'
        ? (['dashboard', 'unit', 'final-project', 'nilai'].includes(pathParts[1]) ? pathParts[2] : pathParts[1])
        : pathParts[0];
      const matchedCourse = courses.find(
        c => c.slug.toLowerCase() === coursePathSlug || c.slug.toLowerCase() === courseParam
      );

      // On a hard refresh the Supabase course list arrives asynchronously.
      // Keep canonical student routes in the student shell while that list is
      // loading; only show 404 after courses have been loaded and no slug
      // matches.
      const isCanonicalStudentRoute = pathParts[0] === 'mahasiswa'
        && ['dashboard', 'unit', 'final-project', 'nilai'].includes(pathParts[1])
        && Boolean(pathParts[2]);
      if (!matchedCourse && isCanonicalStudentRoute && courses.length === 0) {
        setActiveRoute('STUDENT');
        setRole('STUDENT');
        setCurrentSlug(pathParts[2] || '');
        return;
      }

      if (matchedCourse) {
        setActiveRoute('STUDENT');
        setRole('STUDENT');
        setActiveCourseId(matchedCourse.id);
        setCurrentSlug(matchedCourse.slug);
        return;
      }

      // Case 3: Match student portal routes (e.g. /mahasiswa, /portal-mahasiswa, /student)
      if (
        path === 'mahasiswa' ||
        path === 'portal-mahasiswa' ||
        path === 'student' ||
        (pathParts[0] === 'mahasiswa' && (!pathParts[1] || (['dashboard', 'unit', 'final-project', 'nilai'].includes(pathParts[1]) && !pathParts[2]))) ||
        roleParam === 'student' ||
        roleParam === 'mahasiswa'
      ) {
        if (path === 'mahasiswa' || path === 'portal-mahasiswa' || path === 'student') {
          sessionStorage.removeItem('poliwako_in_workspace');
        }
        setActiveRoute('STUDENT');
        setRole('STUDENT');
        return;
      }

      // Case 4: Match instructor portal routes (e.g. /instruktur, /instructor, /dosen)
      if (
        path === 'instruktur' ||
        path === 'instructor' ||
        path === 'dosen' ||
        roleParam === 'instructor' ||
        roleParam === 'instruktur'
      ) {
        setActiveRoute('INSTRUCTOR');
        setRole('INSTRUCTOR');
        return;
      }

      // Case 5: Invalid Slug -> Interactive 404 Page!
      setInvalidSlug(rawPath);
      setActiveRoute('NOT_FOUND');
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, [courses]);

  useEffect(() => {
    if (activeCourse) {
      setCurrentSlug(activeCourse.slug);
    }
  }, [activeCourse]);

  const navigateTo = (targetPath: string) => {
    window.history.pushState(null, '', targetPath);
    const rawPath = targetPath.replace(/^\/+|\/+$/g, '');
    const path = rawPath.toLowerCase();

    if (!path) {      if (path === 'mahasiswa' || path === 'portal-mahasiswa' || path === 'student') {
        sessionStorage.removeItem('poliwako_in_workspace');
        clearStudentIdentity();
      }

      setActiveRoute('ROOT_SELECTOR');
      return;
    }

    const pathParts = path.split('/').filter(Boolean);
    const coursePathSlug = pathParts[0] === 'mahasiswa' ? pathParts[1] : pathParts[0];
    const matchedCourse = courses.find(c => c.slug.toLowerCase() === coursePathSlug);
    if (matchedCourse) {
      setActiveRoute('STUDENT');
      setRole('STUDENT');
      setActiveCourseId(matchedCourse.id);
      setCurrentSlug(matchedCourse.slug);
      return;
    }

    if (path === 'mahasiswa' || path === 'portal-mahasiswa' || path === 'student' || (pathParts[0] === 'mahasiswa' && !pathParts[1])) {
      setActiveRoute('STUDENT');
      setRole('STUDENT');
      return;
    }

    if (path === 'instruktur' || path === 'instructor' || path === 'dosen') {
      setActiveRoute('INSTRUCTOR');
      setRole('INSTRUCTOR');
      return;
    }

    setInvalidSlug(rawPath);
    setActiveRoute('NOT_FOUND');
  };

  const isDarkFullscreenGate = activeRoute !== 'INSTRUCTOR' || !isInstructorLoggedIn;

  return (
    <div className={`selection:bg-blue-600 selection:text-white ${
      isDarkFullscreenGate
        ? 'portal-shell-background h-screen h-[100dvh] w-screen overflow-hidden flex flex-col'
        : 'min-h-screen bg-slate-100 flex flex-col'
    }`}>
      
      {/* Header Utama: Hanya aktif untuk portal instruktur sebelum login (halaman mahasiswa dimatikan sesuai permintaan) */}
      {activeRoute === 'INSTRUCTOR' && !isInstructorLoggedIn && (
        <Navbar
          activeRoute={activeRoute}
          onNavigate={navigateTo}
          onOpenInstructorLogin={() => setIsLoginModalOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <div className={isDarkFullscreenGate ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : 'flex-1'}>
        {/* ROOT: PILIHAN PORTAL (Portal Instruktur & Portal Mahasiswa) */}
        {activeRoute === 'ROOT_SELECTOR' && (
          <PortalSelectorGate
            onSelectRole={(selectedRole, path) => {
              setRole(selectedRole);
              navigateTo(path);
            }}
          />
        )}

        {/* 404: INTERACTIVE 404 PAGE JIKA SLUG SALAH */}
        {activeRoute === 'NOT_FOUND' && (
          <InteractiveNotFoundPage
            invalidPath={invalidSlug}
            onNavigate={(path) => navigateTo(path)}
          />
        )}

        {/* STUDENT PORTAL (/mahasiswa atau /:courseSlug) */}
        {activeRoute === 'STUDENT' && (
          <StudentPortal courseSlug={currentSlug} />
        )}

        {/* INSTRUCTOR COMMAND CENTER (/instruktur) */}
        {activeRoute === 'INSTRUCTOR' && (
          <InstructorCommandCenter
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            isCourseWizardOpen={isCourseWizardOpen}
            setIsCourseWizardOpen={setIsCourseWizardOpen}
          />
        )}
      </div>

      {/* Floating System Toasts */}
      <ToastContainer />

      {/* Google OAuth Login Modal */}
      <AuthLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Shared View Footer - Product by dev-byreza (Aktif di halaman login & gate) */}
      {(activeRoute === 'NOT_FOUND' ||
        (activeRoute === 'INSTRUCTOR' && !isInstructorLoggedIn)) && (
        <footer className="relative z-20 shrink-0 border-t border-white/10 bg-transparent py-3 text-xs">
          <div className="max-w-7xl mx-auto px-4">
            <FooterBranding theme="dark" />
          </div>

          {/* Contextual Navigation Buttons */}
          {activeRoute === 'INSTRUCTOR' && (
            <button
              onClick={() => navigateTo('/mahasiswa')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all px-2.5 py-1 rounded-lg hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Pindah ke Portal Mahasiswa"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal Mahasiswa</span>
            </button>
          )}


        </footer>
      )}

    </div>
  );
};
