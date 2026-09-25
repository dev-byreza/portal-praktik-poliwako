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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white text-slate-600 text-xs shadow-sm shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Institutional Title */}
          <div
            onClick={handleHomeAccess}
            className="flex items-center gap-2.5 cursor-pointer group text-left select-none"
            title="Kembali ke Beranda Pilihan Portal"
          >
            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center group-hover:border-blue-300 transition-colors shrink-0">
              <img src="/logo-poliwako.webp" alt="Logo Poliwako" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight group-hover:text-blue-800 transition-colors">
                Portal Praktik Poliwako
              </p>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Politeknik Sorowako • Outcome-Based Education (OBE)
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-600">
            {/* WITA Timezone */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              <Clock className="w-3 h-3 text-blue-700" />
              <span>Asia/Makassar (WITA)</span>
            </div>

            {/* Pilihan Portal (Home) */}
            <button
              onClick={handleHomeAccess}
              className="transition-colors inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer text-xs"
              title="Pilihan Portal"
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Pilihan Portal</span>
            </button>

            {/* Contextual Switch Button */}
            {activeRoute === 'INSTRUCTOR' ? (
              <button
                onClick={handleStudentAccess}
                className="transition-colors inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer text-xs"
                title="Akses Portal Mahasiswa"
              >
                <BookOpen className="w-3 h-3" />
                <span>Portal Mahasiswa</span>
              </button>
            ) : (
              <button
                onClick={handleInstructorAccess}
                className="transition-colors inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 font-semibold cursor-pointer text-xs"
                title="Akses Portal Instruktur (Perlu Autentikasi)"
              >
                <Lock className="w-3 h-3 text-blue-700" />
                <span>Akses Instruktur</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
