// Public / Student Top Header for Portal Praktik Poliwako (Transferred from Footer)

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Lock } from 'lucide-react';

interface NavbarProps {
  onOpenInstructorLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenInstructorLogin }) => {
  const { setRole, isInstructorLoggedIn } = useApp();

  const handleInstructorAccess = () => {
    if (isInstructorLoggedIn) {
      setRole('INSTRUCTOR');
    } else {
      if (onOpenInstructorLogin) {
        onOpenInstructorLogin();
      }
      setRole('INSTRUCTOR');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          
          {/* Institutional Title & OBE System */}
          <div>
            <p className="font-bold text-slate-200 text-sm sm:text-base tracking-tight">
              Portal Praktik Poliwako — Politeknik Sorowako
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Practice Learning & Outcome-Based Education (OBE) Assessment System
            </p>
          </div>

          {/* Timezone & Discreet Instructor Access */}
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-slate-400">
            <span>
              Zona Waktu Sistem: <strong className="text-slate-200">Asia/Makassar (WITA, UTC+8)</strong>
            </span>
            <span className="text-slate-700">•</span>
            <button
              onClick={handleInstructorAccess}
              className="hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 cursor-pointer"
              title="Akses Portal Instruktur (Perlu Autentikasi)"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Akses Instruktur</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

