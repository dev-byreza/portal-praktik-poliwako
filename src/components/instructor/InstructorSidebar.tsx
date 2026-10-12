// Collapsible Vertical Sidebar for Instructor Command Center
// Clean Modern Minimalist Design matching user reference specification with Dark Mode Support

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutGrid,
  Users,
  Calendar,
  BookOpen,
  Clock,
  Award,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ChevronDown,
  Plus,
  CheckCircle2,
  LogOut,
  Layers,
  PanelLeftClose,
  PanelLeft,
  X,
  Sun,
  Moon
} from 'lucide-react';

interface InstructorSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenCourseWizard: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAiAssistant?: () => void;
}

// Minimal circular speech bubble icon matching screenshot
const SpeechBubbleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const InstructorSidebar: React.FC<InstructorSidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenCourseWizard,
  isMobileOpen = false,
  onCloseMobile,
  onOpenAiAssistant
}) => {
  const {
    instructor,
    courses,
    activeCourseId,
    setActiveCourseId,
    activeCourse,
    logoutInstructor,
    showToast
  } = useApp();

  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  // Initialize dark mode from localStorage or documentElement
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('poliwako_theme');
    if (stored) return stored === 'dark';
    return document.documentElement.classList.contains('dark') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Sync dark class on documentElement and persist to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('poliwako_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('poliwako_theme', 'light');
    }
  }, [isDarkMode]);

  // Modern navigation items matching the clean SaaS style
  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutGrid className="w-5 h-5 shrink-0" />, badge: null, hasChevron: false },
    { id: 'PERIODS', label: 'Periode & Peserta', icon: <Calendar className="w-5 h-5 shrink-0" />, badge: null, hasChevron: true },
    { id: 'STUDIO', label: 'Materi & Unit LMS', icon: <BookOpen className="w-5 h-5 shrink-0" />, badge: null, hasChevron: false },
    { id: 'ATTENDANCE', label: 'Presensi & Remedial', icon: <Clock className="w-5 h-5 shrink-0" />, badge: '<75%', hasChevron: false },
    { id: 'GRADING', label: 'Grading Workspace', icon: <Award className="w-5 h-5 shrink-0" />, badge: 'OBE', hasChevron: false },
    { id: 'RECAP', label: 'Rekap & Export', icon: <FileSpreadsheet className="w-5 h-5 shrink-0" />, badge: 'CSV/XLS', hasChevron: true },
    { id: 'ANALYTICS', label: 'Analitik & Evaluasi', icon: <BarChart3 className="w-5 h-5 shrink-0" />, badge: null, hasChevron: true },
    { id: 'STUDENTS', label: 'Database Mahasiswa', icon: <Users className="w-5 h-5 shrink-0" />, badge: null, hasChevron: false },
    { id: 'SETTINGS', label: 'Pengaturan Course', icon: <Settings className="w-5 h-5 shrink-0" />, badge: null, hasChevron: false },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 bg-[#f4f5f7] dark:bg-[#0f172a] border-r border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      {/* Brand Header */}
      <div className={`relative h-20 flex items-center shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 overflow-hidden'}`}>
          {/* Logo Poliwako */}
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1.5 flex items-center justify-center shrink-0 shadow-sm group">
            <img
              src="/logo-poliwako.webp"
              alt="Logo Politeknik Sorowako"
              className="w-full h-full object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block truncate">
                Portal Praktik
              </span>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-none truncate">Politeknik Sorowako</p>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0 p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 ${
            isCollapsed ? 'absolute -right-3 top-7 z-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700' : ''
          }`}
          title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          aria-label={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => onCloseMobile?.()}
          aria-label="Tutup menu navigasi"
          className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Course Switcher Card */}
      <div className="px-3 pb-2 shrink-0">
        {!isCollapsed ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 text-left transition-all shadow-xs group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {activeCourse?.name || 'Pilih Mata Kuliah'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                    {activeCourse?.code} • {activeCourse?.semester} {activeCourse?.academicYear}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Options */}
            {isCourseDropdownOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setIsCourseDropdownOpen(false)}></div>
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    Daftar Mata Kuliah Saya
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {courses.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveCourseId(c.id);
                          setIsCourseDropdownOpen(false);
                          showToast('Mata Kuliah Aktif', c.name, 'info');
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors ${
                          c.id === activeCourseId ? 'text-blue-600 dark:text-cyan-400 font-bold bg-blue-50/50 dark:bg-cyan-950/30' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{c.code} • {c.semester}</p>
                        </div>
                        {c.id === activeCourseId && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1 px-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCourseDropdownOpen(false);
                        onOpenCourseWizard();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Mata Kuliah</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-cyan-400 flex items-center justify-center transition-colors shadow-xs"
              title={`Mata Kuliah: ${activeCourse?.name}`}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Menu List */}
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1.5 scrollbar-thin">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setActiveTab(item.id); onCloseMobile?.(); }}
              className={`w-full flex items-center transition-all duration-150 group relative ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-slate-900/5 dark:ring-white/10 rounded-2xl px-3.5 py-3'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-2xl px-3.5 py-2.5'
              } ${isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between'}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-3.5'}`}>
                <span className={`transition-colors ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className={`text-sm truncate ${isActive ? 'font-bold text-slate-900 dark:text-white' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600'
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.hasChevron && (
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                  )}
                </div>
              )}

              {/* Floating Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Controls Area (Chat button & Theme toggle & Instructor profile) */}
      <div className="p-3 border-t border-slate-200/70 dark:border-slate-800/80 shrink-0 flex flex-col gap-2.5">
        
        {/* Controls Row: Circular Chat Bubble & Vertical Theme Pill */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between px-1'}`}>
          <div className="flex items-center gap-2">
            {/* Circular Speech Bubble Button */}
            <button
              type="button"
              onClick={() => onOpenAiAssistant?.()}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:shadow hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group"
              title="Buka Asisten AI & Bantuan"
              aria-label="Asisten AI & Bantuan"
            >
              <SpeechBubbleIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
            </button>
          </div>

          {/* Vertical Pill Theme Toggle */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const next = !isDarkMode;
              setIsDarkMode(next);
              showToast('Mode Tampilan', next ? 'Mode Gelap Aktif' : 'Mode Terang Aktif', 'info');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                const next = !isDarkMode;
                setIsDarkMode(next);
                showToast('Mode Tampilan', next ? 'Mode Gelap Aktif' : 'Mode Terang Aktif', 'info');
              }
            }}
            className="w-8 py-1 rounded-full bg-slate-200/90 dark:bg-slate-850 border border-slate-300/60 dark:border-slate-700 flex flex-col items-center gap-1 shadow-inner cursor-pointer hover:bg-slate-300/70 dark:hover:bg-slate-700 transition-all select-none"
            title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
            aria-label={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
          >
            {/* Moon Icon */}
            <div className={`p-1 rounded-full transition-all ${isDarkMode ? 'bg-slate-900 text-cyan-400 shadow-xs ring-1 ring-cyan-500/30' : 'text-slate-400 hover:text-slate-700'}`}>
              <Moon className="w-3.5 h-3.5" />
            </div>
            {/* Sun Icon */}
            <div className={`p-1 rounded-full transition-all ${!isDarkMode ? 'bg-white text-slate-800 shadow-xs ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-300'}`}>
              <Sun className="w-3.5 h-3.5 text-slate-700 dark:text-slate-400" />
            </div>
          </div>
        </div>

        {/* Instructor Profile Card */}
        {!isCollapsed ? (
          <div className="p-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {instructor.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {instructor.name.split(',')[0]}
                </h5>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                  @politekniksorowako.ac.id
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logoutInstructor}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={logoutInstructor}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title={`Logout (${instructor.name})`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </aside>
  );
};
