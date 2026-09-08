// Instructor Command Center Main Layout with Vertical Collapsible Sidebar

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Menu } from 'lucide-react';
import { InstructorSidebar } from './InstructorSidebar';
import { InstructorHeader } from './InstructorHeader';
import { DashboardOverview } from './DashboardOverview';
import { MasterStudentManager } from './MasterStudentManager';
import { PracticePeriodManager } from './PracticePeriodManager';
import { LearningContentStudio } from './LearningContentStudio';
import { AttendanceMatrix } from './AttendanceMatrix';
import { GradingWorkspace } from './GradingWorkspace';
import { RekapNilaiExport } from './RekapNilaiExport';
import { AnalyticsView } from './AnalyticsView';
import { CourseSettings } from './CourseSettings';
import { CourseWizardModal } from './CourseWizardModal';
import { CopyCourseModal } from './CopyCourseModal';

import { InstructorLoginGate } from './InstructorLoginGate';

interface InstructorCommandCenterProps {
  onOpenLoginModal: () => void;
  isCourseWizardOpen: boolean;
  setIsCourseWizardOpen: (open: boolean) => void;
}

export const InstructorCommandCenter: React.FC<InstructorCommandCenterProps> = ({
  onOpenLoginModal,
  isCourseWizardOpen,
  setIsCourseWizardOpen
}) => {
  const { isInstructorLoggedIn, activeCourse, setRole } = useApp();
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isCopyCourseOpen, setIsCopyCourseOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!isInstructorLoggedIn) {
    return <InstructorLoginGate />;
  }


  return (
    <div className="min-h-screen bg-slate-100 flex">
      
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
          className="fixed inset-0 z-30 bg-slate-950/60 md:hidden"
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
        />

        {/* Tab Pages */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fadeIn w-full">
          {activeTab === 'DASHBOARD' && <DashboardOverview onNavigateTab={tab => setActiveTab(tab)} />}
          {activeTab === 'STUDENTS' && <MasterStudentManager />}
          {activeTab === 'PERIODS' && <PracticePeriodManager />}
          {activeTab === 'STUDIO' && <LearningContentStudio />}
          {activeTab === 'ATTENDANCE' && <AttendanceMatrix />}
          {activeTab === 'GRADING' && <GradingWorkspace />}
          {activeTab === 'RECAP' && <RekapNilaiExport />}
          {activeTab === 'ANALYTICS' && <AnalyticsView />}
          {activeTab === 'SETTINGS' && <CourseSettings />}
        </main>
      </div>

      {/* Course Setup Wizard Modal */}
      <CourseWizardModal
        isOpen={isCourseWizardOpen}
        onClose={() => setIsCourseWizardOpen(false)}
      />

      {/* Copy Course Modal */}
      {activeCourse && (
        <CopyCourseModal
          isOpen={isCopyCourseOpen}
          onClose={() => setIsCopyCourseOpen(false)}
          sourceCourseId={activeCourse.id}
        />
      )}

    </div>
  );
};
