import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  RotateCcw,
  Copy,
  ChevronRight,
  Share2
} from 'lucide-react';
import { formatIndonesianDate, getWitaDateString } from '../../utils/dateUtils';
import { SharePortalModal } from './SharePortalModal';

interface InstructorHeaderProps {
  activeTab: string;
  onOpenCopyCourse: () => void;
}

export const InstructorHeader: React.FC<InstructorHeaderProps> = ({
  activeTab,
  onOpenCopyCourse
}) => {
  const { activeCourse, resetToDefaultData } = useApp();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const tabTitleMap: Record<string, string> = {
    DASHBOARD: 'Dashboard Command Center',
    STUDENTS: 'Database Mahasiswa',
    PERIODS: 'Periode Praktik & Peserta',
    STUDIO: 'Materi & Unit Pembelajaran LMS',
    ATTENDANCE: 'Presensi 5 Hari & Remedial',
    GRADING: 'OBE Grading Workspace',
    RECAP: 'Rekap Nilai & Export',
    ANALYTICS: 'Analitik Mutu & Kurva Performa',
    SETTINGS: 'Pengaturan Mata Kuliah & Feedback',
  };

  const todayWita = getWitaDateString();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      
      {/* Breadcrumb Title */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-slate-400">Portal Praktik</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
          {activeCourse?.name || 'Mata Kuliah'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <h1 className="font-extrabold text-slate-900 text-sm">
          {tabTitleMap[activeTab] || 'Dashboard'}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        
        {/* WITA Date Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{formatIndonesianDate(todayWita)} (WITA)</span>
        </div>

        {/* Bagikan Link Portal ke Mahasiswa */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-sm shadow-cyan-600/25 hover:shadow-cyan-600/40 transition-all cursor-pointer"
          title="Bagikan link portal ke mahasiswa"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Bagikan ke Mahasiswa</span>
        </button>

        {/* Copy Course Shortcut */}
        <button
          onClick={onOpenCopyCourse}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          title="Salin mata kuliah ke semester baru"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Salin Course</span>
        </button>

        {/* Reset Demo Data Button */}
        <button
          onClick={resetToDefaultData}
          title="Reset data demo ke awal"
          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

      </div>

      {/* Share Portal Modal */}
      <SharePortalModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

    </header>
  );
};
