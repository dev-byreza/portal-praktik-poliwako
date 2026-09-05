// Instructor Authentication Full-Page Gate with Pointer-Reactive Cyber Mesh, Glassmorphism, & Presets
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  AlertCircle,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  User,
  Loader2,
  CheckCircle2,
  Building
} from 'lucide-react';

export const InstructorLoginGate: React.FC = () => {
  const { loginInstructor, signUpInstructor, setRole } = useApp();
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupDepartment, setSignupDepartment] = useState('Rekayasa Perancangan Mekanik');
  const [signupNip, setSignupNip] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Status & Interactive Pointer State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [rawMouse, setRawMouse] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
    setRawMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await loginInstructor(loginEmail, loginPassword);
      if (!result.success) {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat masuk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = signupEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
      setErrorMsg('Hanya email resmi berdomain @politekniksorowako.ac.id yang diizinkan mendaftar.');
      return;
    }

    if (!signupName.trim()) {
      setErrorMsg('Nama lengkap dan gelar wajib diisi.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUpInstructor({
        email: cleanEmail,
        password: signupPassword,
        name: signupName.trim(),
        department: signupDepartment,
        nip: signupNip.trim() || undefined
      });

      if (!result.success) {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mendaftar akun baru');
    } finally {
      setIsLoading(false);
    }
  };

  const spotlightX = rawMouse.x !== null ? `${rawMouse.x}px` : '50%';
  const spotlightY = rawMouse.y !== null ? `${rawMouse.y}px` : '50%';

  return (
    <div
      onPointerMove={handlePointerMove}
      onMouseMove={handlePointerMove}
      className="relative flex-1 min-h-0 w-full h-full flex flex-col justify-center items-center p-4 overflow-y-auto overflow-x-hidden bg-slate-950 select-none py-8 sm:py-12"
    >
      {/* Animated & Pointer-Reactive Background Mesh & Glow Orbs (Identik dengan Student Portal) */}
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
            className="absolute w-[38rem] h-[38rem] rounded-full bg-cyan-500/18 blur-[110px] pointer-events-none transition-transform duration-100 ease-out will-change-transform"
            style={{
              left: `${rawMouse.x}px`,
              top: `${rawMouse.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

        {/* Parallax Floating Orb 1: Cyan / Blue Glow (Top Left) */}
        <div
          className="absolute -top-20 -left-20 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-transparent blur-[95px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * -70}px, ${(mousePos.y - 0.5) * -70}px)`,
          }}
        />

        {/* Parallax Floating Orb 2: Indigo / Purple Glow (Bottom Right) */}
        <div
          className="absolute -bottom-24 -right-24 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tl from-indigo-600/35 via-purple-600/25 to-transparent blur-[110px] pointer-events-none transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translate(${(mousePos.x - 0.5) * 80}px, ${(mousePos.y - 0.5) * 80}px)`,
          }}
        />

        {/* Pulsing Central Deep Blue Glow with subtle Parallax */}
        <div
          className="absolute top-1/2 left-1/2 w-[36rem] h-[36rem] rounded-full bg-blue-500/15 blur-[130px] pointer-events-none transition-transform duration-500 ease-out will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${(mousePos.x - 0.5) * 35}px), calc(-50% + ${(mousePos.y - 0.5) * 35}px))`,
          }}
        />

        {/* Floating Micro-sparkle Accents moving with pointer */}
        <div
          className="absolute w-2 h-2 rounded-full bg-cyan-400/80 blur-[0.5px] animate-ping pointer-events-none transition-transform duration-300 ease-out"
          style={{
            top: '25%',
            left: '22%',
            animationDuration: '3s',
            transform: `translate(${(mousePos.x - 0.5) * -35}px, ${(mousePos.y - 0.5) * -35}px)`
          }}
        />
        <div
          className="absolute w-2.5 h-2.5 rounded-full bg-blue-400/70 blur-[0.5px] animate-pulse pointer-events-none transition-transform duration-300 ease-out"
          style={{
            bottom: '28%',
            right: '25%',
            animationDuration: '4s',
            transform: `translate(${(mousePos.x - 0.5) * 45}px, ${(mousePos.y - 0.5) * 45}px)`
          }}
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-indigo-400/70 blur-[0.5px] animate-ping pointer-events-none transition-transform duration-300 ease-out"
          style={{
            top: '68%',
            left: '28%',
            animationDuration: '5s',
            transform: `translate(${(mousePos.x - 0.5) * -25}px, ${(mousePos.y - 0.5) * -25}px)`
          }}
        />
      </div>

      {/* Login Gate Frame with subtle 3D tilt reaction */}
      <div
        className="relative z-10 w-full flex items-center justify-center transition-transform duration-200 ease-out will-change-transform my-auto"
        style={{
          transform: `perspective(1000px) rotateY(${(mousePos.x - 0.5) * 4}deg) rotateX(${(mousePos.y - 0.5) * -4}deg)`,
        }}
      >
        {/* Glassmorphism Dark Card */}
        <div className="relative backdrop-blur-3xl bg-slate-900/65 rounded-[2.25rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(56,189,248,0.2)] border border-white/15 ring-1 ring-cyan-500/30 w-full max-w-md overflow-hidden flex flex-col transition-all duration-300">
          
          {/* Top Glass Specular Reflection Highlight */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-white/15 via-cyan-500/5 to-transparent pointer-events-none rounded-t-[2.25rem]" />

          {/* Subtle Inner Accent Glows */}
          <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          {/* Body Area */}
          <div className="p-7 sm:p-9 flex-1 flex flex-col relative z-10">
            
            {/* Header / Brand Icon */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center mx-auto mb-3.5 shadow-xl shadow-cyan-500/25 ring-2 ring-white/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Portal Praktik Instruktur
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 mx-auto mt-1.5 shadow-xs">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Politeknik Sorowako • Dosen & Instruktur</span>
              </div>
            </div>

            {/* Dual Tabs: Masuk / Daftar Akun */}
            <div className="mb-5 flex bg-slate-950/70 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 max-w-xs mx-auto w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'LOGIN'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('SIGNUP');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'SIGNUP'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar Akun</span>
              </button>
            </div>

            {/* Error Alert Box */}
            {errorMsg && (
              <div className="mb-4 p-3.5 bg-rose-950/70 backdrop-blur-md border border-rose-500/50 rounded-2xl flex items-start gap-3 text-rose-200 text-xs animate-shake shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {activeTab === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Resmi Institusi
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => {
                        setLoginEmail(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="nama@politekniksorowako.ac.id"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Domain wajib: <strong>@politekniksorowako.ac.id</strong></span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => {
                        setLoginPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Masukkan kata sandi..."
                      required
                      className="w-full pl-10 pr-11 py-3 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Command Center</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: SIGNUP FORM */}
            {activeTab === 'SIGNUP' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Nama Lengkap & Gelar
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      placeholder="Contoh: Ir. Budi Santoso, S.T., M.T."
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Email Resmi Institusi
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="nama@politekniksorowako.ac.id"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Program Studi
                    </label>
                    <select
                      value={signupDepartment}
                      onChange={e => setSignupDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all"
                    >
                      <option value="Rekayasa Perancangan Mekanik">Rek. Perancangan Mekanik</option>
                      <option value="Teknik Perawatan Mesin">Teknik Perawatan Mesin</option>
                      <option value="Teknik Otomasi Industri">Teknik Otomasi Industri</option>
                      <option value="Teknik Pengolahan Hasil Tambang">Pengolahan Hasil Tambang</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      NIP / NIDN (Opsional)
                    </label>
                    <input
                      type="text"
                      value={signupNip}
                      onChange={e => setSignupNip(e.target.value)}
                      placeholder="1987..."
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Password (Min. 6 Karakter)
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Konfirmasi Password
                  </label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={e => setSignupConfirmPassword(e.target.value)}
                    placeholder="Ulangi password di atas"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-cyan-500/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                      <span>Mendaftarkan Akun...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Daftar & Masuk Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Back to Student Portal Link */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setRole('STUDENT');
                  window.history.pushState(null, '', '/mahasiswa');
                }}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Portal Praktik Mahasiswa</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
