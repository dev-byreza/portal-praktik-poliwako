// Instructor Authentication Full-Page Gate with Pointer-Reactive Cyber Mesh, Glassmorphism, & Presets
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  AlertCircle,
  Lock,
  ArrowRight,
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
  const { loginInstructor, signUpInstructor } = useApp();
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

  // Authentication status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <div
      className="instructor-login-shell relative flex min-h-0 h-full w-full flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-6 text-slate-800 sm:px-8 sm:py-10"
    >
      {/* Login Gate Frame with subtle 3D tilt reaction */}
      <div
        className="relative z-10 my-auto flex w-full items-center justify-center"
      >
        <div className="instructor-login-card relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">

          {/* Body Area */}
          <div className="relative z-10 flex flex-1 flex-col p-5 sm:p-7">
            
            {/* Header / Brand Icon */}
            <div className="text-center mb-5">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                <img src="/logo-poliwako.webp" alt="Logo Politeknik Sorowako" className="h-full w-full object-contain" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Portal Praktik Instruktur
              </h2>
              <p className="mt-1 text-sm text-slate-500">Politeknik Sorowako</p>
            </div>

            {/* Dual Tabs: Masuk / Daftar Akun */}
            <div className="instructor-login-tabs mb-5 flex max-w-xs w-full mx-auto rounded-lg border p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'LOGIN'
                    ? 'instructor-login-tab-active bg-blue-700 text-white'
                    : 'instructor-login-tab-inactive text-slate-600 hover:bg-white'
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
                    ? 'instructor-login-tab-active bg-blue-700 text-white'
                    : 'instructor-login-tab-inactive text-slate-600 hover:bg-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar Akun</span>
              </button>
            </div>

            {/* Error Alert Box */}
            {errorMsg && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900 animate-shake">
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
                  className="ui-button ui-button-primary mt-2 w-full text-sm disabled:cursor-wait disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke dashboard instruktur</span>
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
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all truncate"
                    >
                      <option value="Perawatan dan Perbaikan Mesin">Perawatan dan Perbaikan Mesin</option>
                      <option value="Rekayasa Perancangan Mekanik">Rekayasa Perancangan Mekanik</option>
                      <option value="Teknologi Rekayasa Pengelasan dan Fabrikasi">Teknologi Rekayasa Pengelasan dan Fabrikasi</option>
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
                  className="ui-button ui-button-primary mt-2 w-full disabled:cursor-wait disabled:opacity-70"
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

          </div>
        </div>
      </div>
    </div>
  );
};
