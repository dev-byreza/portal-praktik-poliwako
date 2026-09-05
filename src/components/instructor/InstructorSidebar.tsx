// Collapsible Vertical Sidebar for Instructor Command Center (PRD Section 11 & 12)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Clock,
  Award,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  CheckCircle2,
  LogOut,
  Layers,
  Sparkles,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

interface InstructorSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenCourseWizard: () => void;
}

export const InstructorSidebar: React.FC<InstructorSidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenCourseWizard
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
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" />, badge: null },
    { id: 'PERIODS', label: 'Periode & Peserta', icon: <Calendar className="w-5 h-5 shrink-0" />, badge: null },
    { id: 'STUDIO', label: 'Materi & Unit LMS', icon: <BookOpen className="w-5 h-5 shrink-0" />, badge: null },
    { id: 'ATTENDANCE', label: 'Presensi & Remedial', icon: <Clock className="w-5 h-5 shrink-0" />, badge: '<75%' },
    { id: 'GRADING', label: 'Grading Workspace', icon: <Award className="w-5 h-5 shrink-0" />, badge: 'OBE' },
    { id: 'RECAP', label: 'Rekap & Export', icon: <FileSpreadsheet className="w-5 h-5 shrink-0" />, badge: 'CSV/XLS' },
    { id: 'ANALYTICS', label: 'Analitik & Evaluasi', icon: <BarChart3 className="w-5 h-5 shrink-0" />, badge: null },
    { id: 'STUDENTS', label: 'Database Mahasiswa', icon: <Users className="w-5 h-5 shrink-0" />, badge: null },
    { id: 'SETTINGS', label: 'Pengaturan Course', icon: <Settings className="w-5 h-5 shrink-0" />, badge: null },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/40">
            <GraduationCap className="w-6 h-6" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <span className="font-bold text-sm tracking-tight text-white block truncate">
                Portal Praktik Poliwako
              </span>
              <p className="text-[10px] text-slate-400 leading-none truncate">Politeknik Sorowako</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Course Switcher Section (PRD Section 11 & 12) */}
      <div className="p-3 border-b border-slate-800 shrink-0">
        {!isCollapsed ? (
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
              Mata Kuliah Aktif
            </label>
            <button
              onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-left transition-all group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-tight">
                    {activeCourse?.name || 'Pilih Mata Kuliah'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {activeCourse?.code} • {activeCourse?.semester} {activeCourse?.academicYear}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0 transition-colors" />
            </button>

            {/* Dropdown Options */}
            {isCourseDropdownOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setIsCourseDropdownOpen(false)}></div>
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                    Daftar Mata Kuliah Saya
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {courses.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveCourseId(c.id);
                          setIsCourseDropdownOpen(false);
                          showToast('Mata Kuliah Aktif', c.name, 'info');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          c.id === activeCourseId ? 'text-cyan-400 font-bold bg-cyan-950/30' : 'text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.code} • {c.semester}</p>
                        </div>
                        {c.id === activeCourseId && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-800 pt-1 mt-1 px-2">
                    <button
                      onClick={() => {
                        setIsCourseDropdownOpen(false);
                        onOpenCourseWizard();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
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
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 flex items-center justify-center transition-colors"
              title={`Mata Kuliah: ${activeCourse?.name}`}
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Menu List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
        {!isCollapsed && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block px-3 mb-1">
            Menu Instruktur
          </span>
        )}

        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Floating Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Instructor Profile Footer */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                {instructor.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-white truncate leading-tight">
                  {instructor.name.split(',')[0]}
                </h5>
                <p className="text-[10px] text-emerald-400 font-mono truncate">
                  @politekniksorowako.ac.id
                </p>
              </div>
            </div>
            <button
              onClick={logoutInstructor}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={logoutInstructor}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
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
