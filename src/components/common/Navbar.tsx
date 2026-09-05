// Public Top Header for Portal Praktik Poliwako (Active on Student & Instructor Login Pages)
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, GraduationCap, Home, BookOpen, Clock, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeRoute?: 'ROOT_SELECTOR' | 'STUDENT' | 'INSTRUCTOR' | 'NOT_FOUND';
  onNavigate?: (path: string) => void;
  onOpenInstructorLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRoute,
  onNavigate,
  onOpenInstructorLogin
}) => {
  const { setRole, isInstructorLoggedIn } = useApp();

  const handleInstructorAccess = () => {
    if (onNavigate) {
      onNavigate('/instruktur');
    } else {
      if (isInstructorLoggedIn) {
        setRole('INSTRUCTOR');
      } else {
        if (onOpenInstructorLogin) onOpenInstructorLogin();
        setRole('INSTRUCTOR');
      }
    }
  };

  const handleStudentAccess = () => {
    if (onNavigate) {
      onNavigate('/mahasiswa');
    } else {
      setRole('STUDENT');
    }
  };

  const handleHomeAccess = () => {
    if (onNavigate) {
      onNavigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-400 text-xs shadow-md shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Institutional Title */}
          <div
            onClick={handleHomeAccess}
            className="flex items-center gap-2.5 cursor-pointer group text-left select-none"
            title="Kembali ke Beranda Pilihan Portal"
          >
            <div className="w-8 h-8 rounded-xl bg-white/10 p-1 flex items-center justify-center shadow-md shadow-cyan-500/10 ring-1 ring-white/20 group-hover:scale-105 transition-transform shrink-0">
              <img src="/logo-poliwako.webp" alt="Logo Poliwako" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-xs sm:text-sm tracking-tight group-hover:text-cyan-300 transition-colors">
                Portal Praktik Poliwako
              </p>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Politeknik Sorowako • Outcome-Based Education (OBE)
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-400">
            {/* WITA Timezone */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Asia/Makassar (WITA)</span>
            </div>

            {/* Pilihan Portal (Home) */}
            <button
              onClick={handleHomeAccess}
              className="hover:text-white transition-colors inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 cursor-pointer text-xs"
              title="Pilihan Portal"
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Pilihan Portal</span>
            </button>

            {/* Contextual Switch Button */}
            {activeRoute === 'INSTRUCTOR' ? (
              <button
                onClick={handleStudentAccess}
                className="hover:text-white transition-colors inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold cursor-pointer text-xs shadow-xs"
                title="Akses Portal Mahasiswa"
              >
                <BookOpen className="w-3 h-3" />
                <span>Portal Mahasiswa</span>
              </button>
            ) : (
              <button
                onClick={handleInstructorAccess}
                className="hover:text-white transition-colors inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold cursor-pointer text-xs shadow-xs"
                title="Akses Portal Instruktur (Perlu Autentikasi)"
              >
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>Akses Instruktur</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
