// Instructor Top Header Bar (Breadcrumbs, WITA clock, Role Switcher)

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  RotateCcw,
  Copy,
  BookOpen,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';
import { formatIndonesianDate, getWitaDateString } from '../../utils/dateUtils';

interface InstructorHeaderProps {
  activeTab: string;
  onOpenCopyCourse: () => void;
}

export const InstructorHeader: React.FC<InstructorHeaderProps> = ({
  activeTab,
  onOpenCopyCourse
}) => {
  const { role, setRole, activeCourse, resetToDefaultData, isLiveBackend } = useApp();

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
        
        {/* Backend Mode Status Badge */}
        <div
          className={`hidden lg:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
            isLiveBackend
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
          title={isLiveBackend ? 'Terhubung ke PostgreSQL Supabase' : 'Mode Offline / LocalStorage'}
        >
          <Database className={`w-3.5 h-3.5 ${isLiveBackend ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{isLiveBackend ? 'Supabase Live' : 'Local Storage'}</span>
        </div>

        {/* WITA Date Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{formatIndonesianDate(todayWita)} (WITA)</span>
        </div>

        {/* Copy Course Shortcut */}
        <button
          onClick={onOpenCopyCourse}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
          title="Salin mata kuliah ke semester baru"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Salin Course</span>
        </button>

        {/* Reset Demo Data Button */}
        <button
          onClick={resetToDefaultData}
          title="Reset data demo ke awal"
          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Role Switcher */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button
            onClick={() => setRole('INSTRUCTOR')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              role === 'INSTRUCTOR'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instruktur</span>
          </button>
          <button
            onClick={() => setRole('STUDENT')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              role === 'STUDENT'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mahasiswa</span>
          </button>
        </div>

      </div>

    </header>
  );
};
