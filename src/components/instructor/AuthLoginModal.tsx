// Instructor Authentication Modal: Login & Signup with Institutional Domain Check (PRD Section 8.1 & 93)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  X,
  Building,
  User,
  Loader2
} from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

interface AuthLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'LOGIN' | 'SIGNUP';

export const AuthLoginModal: React.FC<AuthLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginInstructor, signUpInstructor } = useApp();
  const [activeTab, setActiveTab] = useState<AuthTab>('LOGIN');

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

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await loginInstructor(loginEmail, loginPassword);
      if (result.success) {
        onClose();
      } else {
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

      if (result.success) {
        onClose();
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mendaftar akun baru');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
        <div className="relative backdrop-blur-3xl bg-slate-900/90 rounded-[2.25rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(56,189,248,0.2)] border border-white/15 ring-1 ring-cyan-500/30 w-full max-w-md overflow-hidden flex flex-col my-8 transition-all duration-300">
          
          {/* Top Glass Specular Reflection Highlight */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-white/15 via-cyan-500/5 to-transparent pointer-events-none rounded-t-[2.25rem]" />

          {/* Subtle Inner Accent Glows */}
          <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors z-20 cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-6 sm:p-8 text-white text-center relative z-10 pb-0">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-2 flex items-center justify-center mx-auto mb-3.5 shadow-xl shadow-cyan-500/15 ring-2 ring-white/20">
              <img src="/logo-poliwako.webp" alt="Logo Politeknik Sorowako" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">Portal Praktik Poliwako</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 mx-auto mt-1.5 shadow-xs">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Akses Khusus Instruktur & Dosen</span>
            </div>

            {/* Tab Navigation */}
            <div className="mt-4 flex bg-slate-950/70 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 max-w-xs mx-auto w-full">
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
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8 relative z-10 flex-1">
            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3.5 bg-rose-950/70 backdrop-blur-md border border-rose-500/50 rounded-2xl flex items-start gap-3 text-rose-200 text-xs animate-shake shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* TAB: LOGIN */}
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
                    <span>Domain @politekniksorowako.ac.id</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Password
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
                      placeholder="Masukkan password..."
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
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-cyan-500/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk sebagai Instruktur</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('SIGNUP');
                      setErrorMsg(null);
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    Belum punya akun? <span className="underline">Daftar akun instruktur baru</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: SIGNUP */}
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 shadow-inner"
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 shadow-inner"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Wajib @politekniksorowako.ac.id</span>
                  </p>
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
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Password (Minimal 6 Karakter)
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

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('LOGIN');
                      setErrorMsg(null);
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    Sudah memiliki akun? <span className="underline">Masuk di sini</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};
