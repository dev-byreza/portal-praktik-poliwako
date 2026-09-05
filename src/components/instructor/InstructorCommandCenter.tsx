// Instructor Command Center Main Layout with Vertical Collapsible Sidebar

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, ChevronRight } from 'lucide-react';
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
  const { isInstructorLoggedIn, activeCourse } = useApp();
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isCopyCourseOpen, setIsCopyCourseOpen] = useState<boolean>(false);

  if (!isInstructorLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4 font-bold">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Akses Khusus Instruktur Politeknik Sorowako</h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto mt-2 leading-relaxed">
            Silakan masuk menggunakan akun Google institusi resmi (domain <strong>@politekniksorowako.ac.id</strong>) untuk mengelola mata kuliah, mahasiswa, dan penilaian OBE.
          </p>
          <button
            onClick={onOpenLoginModal}
            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <span>Login dengan Akun Institusi</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
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
      />

      {/* Main Content Area (Offset by sidebar width) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Header */}
        <InstructorHeader
          activeTab={activeTab}
          onOpenCopyCourse={() => setIsCopyCourseOpen(true)}
        />

        {/* Tab Pages */}
        <main className="flex-1 p-6 lg:p-8 animate-fadeIn max-w-7xl w-full mx-auto">
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
