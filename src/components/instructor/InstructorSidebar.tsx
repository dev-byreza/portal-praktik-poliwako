// Floating Collapsible Vertical Sidebar for Instructor Command Center
// Modern Floating Island / Bento SaaS Design with Dark Mode Support

import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  LogOut,
  Layers,
  X,
} from 'lucide-react';

interface InstructorSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenCourseWizard: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const InstructorSidebar: React.FC<InstructorSidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenCourseWizard,
  isMobileOpen = false,
  onCloseMobile
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

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutGrid className="w-[18px] h-[18px] shrink-0" />, badge: null },
    { id: 'PERIODS', label: 'Periode & Peserta', icon: <Calendar className="w-[18px] h-[18px] shrink-0" />, badge: null },
    { id: 'STUDIO', label: 'Materi & Unit LMS', icon: <BookOpen className="w-[18px] h-[18px] shrink-0" />, badge: null },
    { id: 'ATTENDANCE', label: 'Presensi & Remedial', icon: <Clock className="w-[18px] h-[18px] shrink-0" />, badge: '<75%' },
    { id: 'GRADING', label: 'Grading Workspace', icon: <Award className="w-[18px] h-[18px] shrink-0" />, badge: 'OBE' },
    { id: 'RECAP', label: 'Rekap & Export', icon: <FileSpreadsheet className="w-[18px] h-[18px] shrink-0" />, badge: 'XLS' },
    { id: 'ANALYTICS', label: 'Analitik & Evaluasi', icon: <BarChart3 className="w-[18px] h-[18px] shrink-0" />, badge: null },
    { id: 'STUDENTS', label: 'Database Mahasiswa', icon: <Users className="w-[18px] h-[18px] shrink-0" />, badge: null },
    { id: 'SETTINGS', label: 'Pengaturan Course', icon: <Settings className="w-[18px] h-[18px] shrink-0" />, badge: null },
  ];

  return (
    <aside
      className={`instructor-sidebar-floating fixed top-3 bottom-3 left-3 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/85 dark:border-slate-800 rounded-[26px] shadow-[0_12px_36px_-8px_rgba(15,23,42,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65)] text-slate-800 dark:text-slate-100 flex flex-col transition-all duration-300 ease-out ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      } ${isMobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)] md:translate-x-0'}`}
    >
      {/* Minimalist Floating Collapse/Expand Handle on Edge */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex items-center justify-center absolute -right-2.5 top-8 z-20 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-all duration-150 focus:outline-none focus-visible:outline-none cursor-pointer"
        title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        aria-label={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 stroke-[2.25]" />
        ) : (
          <ChevronLeft className="w-3 h-3 stroke-[2.25]" />
        )}
      </button>

      {/* Brand Header */}
      <div className={`relative h-[4.25rem] flex items-center shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 overflow-hidden'}`}>
          {/* Logo Poliwako */}
          <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1.5 flex items-center justify-center shrink-0 shadow-2xs group">
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
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-none truncate mt-0.5">
                Politeknik Sorowako
              </p>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => onCloseMobile?.()}
          aria-label="Tutup menu navigasi"
          className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus:outline-none focus-visible:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Course Switcher Card */}
      <div className="px-3 pb-2 shrink-0">
        {!isCollapsed ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-left transition-all group focus:outline-none focus-visible:outline-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-blue-600/10 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/50">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {activeCourse?.name || 'Pilih Mata Kuliah'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">
                    {activeCourse?.code} • {activeCourse?.semester} {activeCourse?.academicYear}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 transition-transform duration-200 ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Options */}
            {isCourseDropdownOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setIsCourseDropdownOpen(false)}></div>
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    Daftar Mata Kuliah Saya
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {courses.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveCourseId(c.id);
                          setIsCourseDropdownOpen(false);
                          showToast('Mata Kuliah Aktif', c.name, 'info');
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors focus:outline-none focus-visible:outline-none ${
                          c.id === activeCourseId ? 'text-blue-600 dark:text-cyan-400 font-bold bg-blue-50/60 dark:bg-cyan-950/30' : 'text-slate-600 dark:text-slate-300'
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
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-xs focus:outline-none focus-visible:outline-none"
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
              className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-cyan-400 flex items-center justify-center transition-colors focus:outline-none focus-visible:outline-none"
              title={`Mata Kuliah: ${activeCourse?.name}`}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Menu List - overflow-visible when collapsed so tooltips pop out and no scrollbar ever appears */}
      <div
        className={`instructor-sidebar-nav flex-1 min-h-0 py-1.5 space-y-1 ${
          isCollapsed
            ? 'overflow-visible px-2 flex flex-col items-center'
            : 'overflow-y-auto overflow-x-hidden px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }`}
      >
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setActiveTab(item.id); onCloseMobile?.(); }}
              className={`flex items-center transition-all duration-150 group relative focus:outline-none focus-visible:outline-none ${
                isCollapsed
                  ? 'w-10 h-10 justify-center rounded-2xl'
                  : 'w-full justify-between rounded-2xl px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                  : 'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/85 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <span className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className={`text-[13px] truncate ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
              </div>

              {!isCollapsed && item.badge && (
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white border border-white/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              )}

              {/* Floating Tooltip when collapsed */}
              {isCollapsed && (
                <div className="
                  absolute left-full ml-3 px-2.5 py-1.5
                  bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold
                  rounded-xl shadow-lg whitespace-nowrap
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-150 z-50 border border-white/10
                ">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Profile Card */}
      <div className="instructor-sidebar-footer p-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
        {!isCollapsed ? (
          <div className="min-w-0 p-2 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
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
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:outline-none"
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
              className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:outline-none"
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
