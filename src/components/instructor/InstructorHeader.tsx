import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Copy,
  ChevronRight,
  Share2,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
import { formatIndonesianDate, getWitaDateString } from '../../utils/dateUtils';
import { SharePortalModal } from './SharePortalModal';

interface InstructorHeaderProps {
  activeTab: string;
  onOpenCopyCourse: () => void;
  onOpenMobileMenu: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const InstructorHeader: React.FC<InstructorHeaderProps> = ({
  activeTab,
  onOpenCopyCourse,
  onOpenMobileMenu,
  isDarkMode,
  onToggleTheme,
}) => {
  const { activeCourse } = useApp();
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
    <header className="h-16 glass-header border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
      
      <button type="button" onClick={onOpenMobileMenu} aria-label="Buka menu navigasi" className="md:hidden p-2 -ml-2 mr-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb Title with Modern Clean Course Title Badge */}
      <div className="flex items-center gap-2 sm:gap-2.5 text-xs min-w-0">
        <span className="hidden sm:inline font-bold text-slate-400 dark:text-slate-500">Portal Praktik</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:inline" />
        
        {/* Modern & Clean Course Badge that seamlessly blends into the theme */}
        <div
          title={`Mata kuliah aktif: ${activeCourse?.name || 'Mata Kuliah'}`}
          className="inline-flex max-w-[10rem] sm:max-w-[18rem] shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all"
        >
          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
          <span className="truncate whitespace-nowrap">{activeCourse?.name || 'Mata Kuliah'}</span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        <h1 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[9rem] sm:max-w-none">
          {tabTitleMap[activeTab] || 'Dashboard'}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        
        {/* WITA Date Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
          <span>{formatIndonesianDate(todayWita)} (WITA)</span>
        </div>

        {/* Bagikan Link Portal ke Mahasiswa */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all cursor-pointer"
          title="Bagikan link portal ke mahasiswa"
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Bagikan ke Mahasiswa</span>
        </button>

        {/* Copy Course Shortcut */}
        <button
          onClick={onOpenCopyCourse}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all cursor-pointer"
          title="Salin mata kuliah ke semester baru"
        >
          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Salin Course</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
          aria-label={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
