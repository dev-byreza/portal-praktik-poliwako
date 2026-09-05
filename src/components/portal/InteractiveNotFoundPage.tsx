// Interactive 404 Page for Invalid Slugs with Cyber Theme, Pointer Reactions, & Course Suggestions
import React, { useState } from 'react';
import {
  Compass,
  ArrowLeft,
  Home,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  Search,
  Sparkles,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface InteractiveNotFoundPageProps {
  invalidPath: string;
  onNavigate: (path: string) => void;
}

export const InteractiveNotFoundPage: React.FC<InteractiveNotFoundPageProps> = ({
  invalidPath,
  onNavigate
}) => {
  const { courses } = useApp();
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [rawMouse, setRawMouse] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
    setRawMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const spotlightX = rawMouse.x !== null ? `${rawMouse.x}px` : '50%';
  const spotlightY = rawMouse.y !== null ? `${rawMouse.y}px` : '50%';

  return (
    <div
      onPointerMove={handlePointerMove}
      onMouseMove={handlePointerMove}
      className="relative flex-1 min-h-0 w-full h-full flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden bg-slate-950 select-none py-10"
    >
      {/* Animated & Pointer-Reactive Background Mesh & Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Ambient Base Cyber Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-20" />

        {/* Dynamic Pointer-Illuminated Spotlight Grid */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#f43f5e_1px,transparent_1px),linear-gradient(to_bottom,#f43f5e_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-25 transition-opacity duration-300"
          style={{
            maskImage: `radial-gradient(circle 500px at ${spotlightX} ${spotlightY}, #000 20%, transparent 80%)`,
            WebkitMaskImage: `radial-gradient(circle 500px at ${spotlightX} ${spotlightY}, #000 20%, transparent 80%)`
          }}
        />

        {/* Pointer Cursor Following Spotlight Aura */}
        {rawMouse.x !== null && rawMouse.y !== null && (
          <div
            className="absolute w-[36rem] h-[36rem] rounded-full bg-rose-500/12 blur-[120px] pointer-events-none transition-transform duration-100 ease-out will-change-transform"
            style={{
              left: `${rawMouse.x}px`,
              top: `${rawMouse.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

        {/* Parallax Floating Orb 1: Rose / Red Glow (Top Left) */}
        <div
          className="absolute -top-20 -left-20 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-rose-600/30 via-purple-600/25 to-transparent blur-[95px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * -70}px, ${(mousePos.y - 0.5) * -70}px)`,
          }}
        />

        {/* Parallax Floating Orb 2: Cyan / Blue Glow (Bottom Right) */}
        <div
          className="absolute -bottom-24 -right-24 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tl from-cyan-600/30 via-blue-600/20 to-transparent blur-[110px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * 80}px, ${(mousePos.y - 0.5) * 80}px)`,
          }}
        />
      </div>

      {/* Main Glassmorphic 404 Container */}
      <div
        className="relative z-10 w-full max-w-xl flex flex-col items-center my-auto transition-transform duration-200 ease-out will-change-transform px-2"
        style={{
          transform: `perspective(1000px) rotateY(${(mousePos.x - 0.5) * 4}deg) rotateX(${(mousePos.y - 0.5) * -4}deg)`,
        }}
      >
        <div className="relative backdrop-blur-3xl bg-slate-900/75 rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(244,63,94,0.15)] border border-white/15 ring-1 ring-rose-500/30 w-full overflow-hidden flex flex-col p-8 sm:p-10 text-center">
          
          {/* Top Glass Specular Reflection Highlight */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/15 via-rose-500/5 to-transparent pointer-events-none rounded-t-[2.5rem]" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 mx-auto mb-4">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>404 • Rute / Slug Tidak Terdaftar</span>
          </div>

          {/* Glitch Numeric 404 Header */}
          <div className="relative my-2 select-none">
            <h1 className="text-7xl sm:text-9xl font-black tracking-tighter bg-gradient-to-b from-white via-rose-200 to-rose-500/60 bg-clip-text text-transparent drop-shadow-sm">
              404
            </h1>
          </div>

          {/* Subtitle & Explanatory Path */}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Slug <span className="font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/60">/{invalidPath}</span> tidak terdaftar di sistem Portal Praktik Poliwako.
          </p>

          {/* Suggested Direct Navigation Buttons */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={() => onNavigate('/mahasiswa')}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Ke Portal Mahasiswa</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/instruktur')}
              className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Ke Portal Instruktur</span>
            </button>
          </div>

          {/* Return to Home Selector Link */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="w-full py-2.5 px-4 bg-slate-950/50 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda Pilihan Portal</span>
            </button>
          </div>

          {/* Available Registered Courses Chips */}
          {courses.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2.5">
                Mata Kuliah Praktik yang Tersedia:
              </span>
              <div className="flex flex-wrap gap-2">
                {courses.map(course => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => onNavigate(`/${course.slug}`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-semibold text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{course.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">/{course.slug}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
