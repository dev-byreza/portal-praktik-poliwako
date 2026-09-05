// Main Application Component for Portal Praktik Poliwako

import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Lock } from 'lucide-react';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthLoginModal } from './components/instructor/AuthLoginModal';
import { InstructorCommandCenter } from './components/instructor/InstructorCommandCenter';
import { StudentPortal } from './components/student/StudentPortal';

export const App: React.FC = () => {
  const { role, setRole, activeCourse, studentSession, currentStudent } = useApp();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCourseWizardOpen, setIsCourseWizardOpen] = useState(false);

  // Check URL path simulation for student slug (e.g. /pemesinan-cnc)
  const [currentSlug, setCurrentSlug] = useState<string>(activeCourse?.slug || 'pemesinan-cnc');

  useEffect(() => {
    if (activeCourse) {
      setCurrentSlug(activeCourse.slug);
    }
  }, [activeCourse]);

  return (
    <div className={`selection:bg-blue-600 selection:text-white ${
      role === 'STUDENT'
        ? 'h-screen w-screen overflow-hidden flex flex-col bg-slate-900'
        : 'min-h-screen bg-slate-100 flex flex-col'
    }`}>
      
      {/* Student Mode Header: Hanya tampil di halaman login */}
      {role === 'STUDENT' && (!studentSession || !currentStudent) && <Navbar />}

      {/* Main Content Area */}
      <div className={role === 'STUDENT' ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : 'flex-1'}>
        {role === 'INSTRUCTOR' ? (
          <InstructorCommandCenter
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            isCourseWizardOpen={isCourseWizardOpen}
            setIsCourseWizardOpen={setIsCourseWizardOpen}
          />
        ) : (
          <StudentPortal courseSlug={currentSlug} />
        )}
      </div>

      {/* Floating System Toasts */}
      <ToastContainer />

      {/* Google OAuth Login Modal */}
      <AuthLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Student View Footer - Product by dev-byreza (Hanya aktif di halaman login) */}
      {role === 'STUDENT' && (!studentSession || !currentStudent) && (
        <footer className="bg-slate-900 border-t border-slate-800/80 py-3 shrink-0 text-xs relative">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3">
            <span className="text-slate-400 text-xs font-normal">Product by</span>
            
            {/* Pill badge: Avatar, dev-byreza, 32.9K, YouTube */}
            <a
              href="https://github.com/dev-byreza"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 rounded-full py-1 px-3 text-white transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <img
                src="https://github.com/dev-byreza.png"
                alt="dev-byreza"
                className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80';
                }}
              />
              <span className="font-semibold text-xs text-white">dev-byreza</span>
              <span className="text-[11px] text-slate-400 font-medium">32.9K</span>
              
              {/* YouTube Icon */}
              <svg className="w-4 h-4 text-red-500 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* Discord Icon */}
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors p-1"
              title="Discord"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
          </div>

          {/* Discreet Instructor Access Switch */}
          <button
            onClick={() => setRole('INSTRUCTOR')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 opacity-25 hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-slate-800"
            title="Akses Instruktur"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </footer>
      )}

    </div>
  );
};
