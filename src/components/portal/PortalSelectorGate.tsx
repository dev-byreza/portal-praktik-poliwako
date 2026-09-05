// Portal Choice Landing Gate (PRD Root Selector: Portal Instruktur vs Portal Mahasiswa)
import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PortalSelectorGateProps {
  onSelectRole: (role: 'STUDENT' | 'INSTRUCTOR', path: string) => void;
}

export const PortalSelectorGate: React.FC<PortalSelectorGateProps> = ({ onSelectRole }) => {
  const { isInstructorLoggedIn } = useApp();
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
          className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-35 transition-opacity duration-300"
          style={{
            maskImage: `radial-gradient(circle 500px at ${spotlightX} ${spotlightY}, #000 20%, transparent 80%)`,
            WebkitMaskImage: `radial-gradient(circle 500px at ${spotlightX} ${spotlightY}, #000 20%, transparent 80%)`
          }}
        />

        {/* Pointer Cursor Following Spotlight Aura */}
        {rawMouse.x !== null && rawMouse.y !== null && (
          <div
            className="absolute w-[40rem] h-[40rem] rounded-full bg-cyan-500/15 blur-[110px] pointer-events-none transition-transform duration-100 ease-out will-change-transform"
            style={{
              left: `${rawMouse.x}px`,
              top: `${rawMouse.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

        {/* Parallax Floating Orb 1: Cyan / Blue Glow (Top Left) */}
        <div
          className="absolute -top-20 -left-20 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-transparent blur-[95px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * -70}px, ${(mousePos.y - 0.5) * -70}px)`,
          }}
        />

        {/* Parallax Floating Orb 2: Indigo / Purple Glow (Bottom Right) */}
        <div
          className="absolute -bottom-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tl from-indigo-600/35 via-purple-600/25 to-transparent blur-[110px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * 80}px, ${(mousePos.y - 0.5) * 80}px)`,
          }}
        />

        {/* Floating Micro-sparkle Accents */}
        <div
          className="absolute w-2 h-2 rounded-full bg-cyan-400/80 blur-[0.5px] animate-ping pointer-events-none"
          style={{ top: '20%', left: '20%', animationDuration: '3s' }}
        />
        <div
          className="absolute w-2.5 h-2.5 rounded-full bg-blue-400/70 blur-[0.5px] animate-pulse pointer-events-none"
          style={{ bottom: '25%', right: '22%', animationDuration: '4s' }}
        />
      </div>

      {/* Main Content Container with Subtle 3D Tilt Reaction */}
      <div
        className="relative z-10 w-full max-w-5xl flex flex-col items-center my-auto transition-transform duration-200 ease-out will-change-transform px-2"
        style={{
          transform: `perspective(1000px) rotateY(${(mousePos.x - 0.5) * 3}deg) rotateX(${(mousePos.y - 0.5) * -3}deg)`,
        }}
      >
        {/* Brand Header */}
        <div className="text-center mb-8 sm:mb-10 flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3.5 p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl shadow-cyan-500/15 hover:scale-105 transition-transform shrink-0">
            <img src="/logo-poliwako.webp" alt="Logo Politeknik Sorowako" className="w-full h-full object-contain" />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-xs font-bold text-cyan-300 mb-3.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Politeknik Sorowako • Sistem Pembelajaran Praktik OBE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Portal Praktik Terpadu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Silakan pilih gerbang portal sesuai dengan peran akademik Anda untuk melanjutkan ke materi atau sistem penilaian.
          </p>
        </div>

        {/* Interactive Choice Cards (Grid 2 Kolom dengan Rasio 4:3 yang Memanjang Kesamping) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
          
          {/* CARD 1: PORTAL MAHASISWA */}
          <div
            onClick={() => onSelectRole('STUDENT', '/mahasiswa')}
            className="group relative backdrop-blur-2xl bg-slate-900/75 hover:bg-slate-900/95 rounded-3xl p-7 sm:p-8 border border-white/15 hover:border-cyan-400/60 ring-1 ring-cyan-500/20 hover:ring-2 hover:ring-cyan-400/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] hover:shadow-[0_25px_60px_-15px_rgba(56,189,248,0.25)] transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1.5 overflow-hidden md:aspect-[4/3] min-h-[310px]"
          >
            {/* Top Specular Glow */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent pointer-events-none rounded-t-3xl" />

            <div>
              {/* Top Row: Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 ring-2 ring-white/20 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Untuk Mahasiswa
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white group-hover:text-cyan-300 transition-colors tracking-tight leading-tight mt-3 mb-2">
                Portal Praktik Mahasiswa
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Akses modul materi, presensi praktik harian (WITA), penugasan, instruksi kerja, dan upload laporan menggunakan <strong>NIM</strong>.
              </p>
            </div>

            {/* Action CTA Button */}
            <div className="mt-6 pt-2">
              <div className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 group-hover:from-blue-500 group-hover:to-cyan-500 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2">
                <span>Masuk ke Portal Mahasiswa</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* CARD 2: PORTAL INSTRUKTUR */}
          <div
            onClick={() => onSelectRole('INSTRUCTOR', '/instruktur')}
            className="group relative backdrop-blur-2xl bg-slate-900/75 hover:bg-slate-900/95 rounded-3xl p-7 sm:p-8 border border-white/15 hover:border-indigo-400/60 ring-1 ring-indigo-500/20 hover:ring-2 hover:ring-indigo-400/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] hover:shadow-[0_25px_60px_-15px_rgba(99,102,241,0.25)] transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1.5 overflow-hidden md:aspect-[4/3] min-h-[310px]"
          >
            {/* Top Specular Glow */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none rounded-t-3xl" />

            <div>
              {/* Top Row: Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/20 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Dosen & Instruktur
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white group-hover:text-indigo-300 transition-colors tracking-tight leading-tight mt-3 mb-2">
                Portal Instruktur & Dosen
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Kelola kurikulum praktik, input nilai OBE, rekap export Excel, pemantauan presensi, dan manajemen database mahasiswa.
              </p>
            </div>

            {/* Action CTA Button */}
            <div className="mt-6 pt-2">
              <div className="w-full py-3.5 px-5 bg-slate-800 group-hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 border border-slate-700 group-hover:border-indigo-500">
                <Lock className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                <span>{isInstructorLoggedIn ? 'Buka Command Center' : 'Masuk sebagai Instruktur'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
