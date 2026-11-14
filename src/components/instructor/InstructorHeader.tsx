import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Copy,
  ChevronRight,
  Share2,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
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

  return (
    <header className="mx-4 sm:mx-6 lg:mx-8 mt-3 h-16 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/85 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-3 z-30 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-all">
      
      <button type="button" onClick={onOpenMobileMenu} aria-label="Buka menu navigasi" className="md:hidden p-2 -ml-2 mr-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:outline-none">
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb Title with Modern Clean Course Title Badge */}
      <div className="flex items-center gap-2 sm:gap-2.5 text-xs min-w-0 flex-1">
        <span className="hidden sm:inline font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">Portal Praktik</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:inline shrink-0" />
        
        {/* Modern & Clean Course Badge that seamlessly blends into the theme */}
        <div
          title={`Mata kuliah aktif: ${activeCourse?.name || 'Mata Kuliah'}`}
          className="inline-flex max-w-[10rem] sm:max-w-[16rem] shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all"
        >
          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
          <span className="truncate whitespace-nowrap">{activeCourse?.name || 'Mata Kuliah'}</span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
        <h1 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate min-w-0">
          {tabTitleMap[activeTab] || 'Dashboard'}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        
        {/* Bagikan Link Portal ke Mahasiswa */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:outline-none"
          title="Bagikan link portal ke mahasiswa"
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>Bagikan ke Mahasiswa</span>
        </button>

        {/* Copy Course Shortcut */}
        <button
          onClick={onOpenCopyCourse}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:outline-none"
          title="Salin mata kuliah ke semester baru"
        >
          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>Salin Course</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
          aria-label={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:outline-none"
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
