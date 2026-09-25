// Instructor Command Center Main Layout with Vertical Collapsible Sidebar

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Menu } from 'lucide-react';
import { InstructorSidebar } from './InstructorSidebar';
import { InstructorHeader } from './InstructorHeader';
const DashboardOverview = lazy(() => import('./DashboardOverview').then(module => ({ default: module.DashboardOverview })));
const MasterStudentManager = lazy(() => import('./MasterStudentManager').then(module => ({ default: module.MasterStudentManager })));
const PracticePeriodManager = lazy(() => import('./PracticePeriodManager').then(module => ({ default: module.PracticePeriodManager })));
const LearningContentStudio = lazy(() => import('./LearningContentStudio').then(module => ({ default: module.LearningContentStudio })));
const AttendanceMatrix = lazy(() => import('./AttendanceMatrix').then(module => ({ default: module.AttendanceMatrix })));
const GradingWorkspace = lazy(() => import('./GradingWorkspace').then(module => ({ default: module.GradingWorkspace })));
const RekapNilaiExport = lazy(() => import('./RekapNilaiExport').then(module => ({ default: module.RekapNilaiExport })));
const AnalyticsView = lazy(() => import('./AnalyticsView').then(module => ({ default: module.AnalyticsView })));
const CourseSettings = lazy(() => import('./CourseSettings').then(module => ({ default: module.CourseSettings })));
const CourseWizardModal = lazy(() => import('./CourseWizardModal').then(module => ({ default: module.CourseWizardModal })));
const CopyCourseModal = lazy(() => import('./CopyCourseModal').then(module => ({ default: module.CopyCourseModal })));
const AIAssistantPanel = lazy(() => import('../common/AIAssistantPanel').then(module => ({ default: module.AIAssistantPanel })));

import { InstructorLoginGate } from './InstructorLoginGate';

interface InstructorCommandCenterProps {
  onOpenLoginModal: () => void;
  isCourseWizardOpen: boolean;
  setIsCourseWizardOpen: (open: boolean) => void;
}

const INSTRUCTOR_TAB_STORAGE_KEY = 'poliwako_instructor_last_tab';
const INSTRUCTOR_TABS = new Set([
  'DASHBOARD',
  'STUDENTS',
  'PERIODS',
  'STUDIO',
  'ATTENDANCE',
  'GRADING',
  'RECAP',
  'ANALYTICS',
  'SETTINGS',
]);

const getInitialInstructorTab = (): string => {
  if (typeof window === 'undefined') return 'DASHBOARD';
  const storedTab = sessionStorage.getItem(INSTRUCTOR_TAB_STORAGE_KEY);
  return storedTab && INSTRUCTOR_TABS.has(storedTab) ? storedTab : 'DASHBOARD';
};

export const InstructorCommandCenter: React.FC<InstructorCommandCenterProps> = ({
  onOpenLoginModal,
  isCourseWizardOpen,
  setIsCourseWizardOpen
}) => {
  const { isInstructorLoggedIn, activeCourse, setRole } = useApp();
  const [activeTab, setActiveTab] = useState<string>(getInitialInstructorTab);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isCopyCourseOpen, setIsCopyCourseOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(INSTRUCTOR_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  if (!isInstructorLoggedIn) {
    return <InstructorLoginGate />;
  }


  return (
    <div className="instructor-shell min-h-screen flex">
      
      {/* Left Collapsible Vertical Sidebar */}
      <InstructorSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onOpenCourseWizard={() => setIsCourseWizardOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Content Area (Offset by sidebar width) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Header */}
        <InstructorHeader
          activeTab={activeTab}
          onOpenCopyCourse={() => setIsCopyCourseOpen(true)}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        />

        {/* Tab Pages */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fadeIn w-full">
          <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Memuat fitur…</div>}>
          {activeTab === 'DASHBOARD' && <DashboardOverview onNavigateTab={tab => setActiveTab(tab)} />}
          {activeTab === 'STUDENTS' && <MasterStudentManager />}
          {activeTab === 'PERIODS' && <PracticePeriodManager />}
          {activeTab === 'STUDIO' && <LearningContentStudio />}
          {activeTab === 'ATTENDANCE' && <AttendanceMatrix />}
          {activeTab === 'GRADING' && <GradingWorkspace />}
          {activeTab === 'RECAP' && <RekapNilaiExport />}
          {activeTab === 'ANALYTICS' && <AnalyticsView />}
          {activeTab === 'SETTINGS' && <CourseSettings />}
          </Suspense>
        </main>
      </div>

      {/* Course Setup Wizard Modal */}
      {isCourseWizardOpen && <Suspense fallback={null}><CourseWizardModal
        isOpen={isCourseWizardOpen}
        onClose={() => setIsCourseWizardOpen(false)}
      /></Suspense>}

      {/* Copy Course Modal */}
      {activeCourse && isCopyCourseOpen && (
        <Suspense fallback={null}><CopyCourseModal
          isOpen={isCopyCourseOpen}
          onClose={() => setIsCopyCourseOpen(false)}
          sourceCourseId={activeCourse.id}
        /></Suspense>
      )}

      {isAiAssistantOpen && <Suspense fallback={null}><AIAssistantPanel
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        title="Asisten AI Portal Praktik"
        context={`Anda membantu instruktur menyiapkan konten untuk mata kuliah ${activeCourse?.name || 'praktik'}. Gunakan bahasa Indonesia yang jelas, formal, dan ramah mahasiswa.`}
      /></Suspense>}

    </div>
  );
};
