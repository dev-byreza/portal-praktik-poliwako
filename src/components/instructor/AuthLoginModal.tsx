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
  const [loginEmail, setLoginEmail] = useState('rezaf@politekniksorowako.ac.id');
  const [loginPassword, setLoginPassword] = useState('732401#Jhe');
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

  const setPresetEmail = (sampleEmail: string, samplePass: string = '') => {
    setLoginEmail(sampleEmail);
    setLoginPassword(samplePass);
    setErrorMsg(null);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-8 transition-all">
          
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white text-center relative overflow-hidden">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-blue-500/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">Portal Praktik Poliwako</h2>
            <p className="text-xs text-blue-200 mt-1 font-medium">Politeknik Sorowako • Akses Khusus Instruktur & Dosen</p>

            {/* Tab Navigation */}
            <div className="mt-5 flex bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'LOGIN'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
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
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'SIGNUP'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar Akun</span>
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8">
            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* TAB: LOGIN */}
            {activeTab === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Resmi Institusi
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="nama@politekniksorowako.ac.id"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Domain @politekniksorowako.ac.id</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="Masukkan password"
                      required
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Testing Preset Buttons */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Akun Instruktur Terdaftar:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPresetEmail('rezaf@politekniksorowako.ac.id', '732401#Jhe')}
                      className="p-2 text-left bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-lg text-blue-900 transition-colors"
                    >
                      <p className="font-bold text-[11px] text-blue-900">Reza Febriadi Rauf</p>
                      <p className="text-[10px] text-blue-700 truncate">rezaf@politekniksorowako.ac.id</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetEmail('dosen.tpm@politekniksorowako.ac.id', 'password123')}
                      className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 transition-colors"
                    >
                      <p className="font-bold text-[11px]">Dosen Rekayasa</p>
                      <p className="text-[10px] text-slate-500 truncate">dosen.tpm@...</p>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nama Lengkap & Gelar
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      placeholder="Contoh: Ir. Budi Santoso, S.T., M.T."
                      required
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Resmi Institusi
                  </label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="nama@politekniksorowako.ac.id"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Wajib @politekniksorowako.ac.id</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Program Studi
                    </label>
                    <select
                      value={signupDepartment}
                      onChange={e => setSignupDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                    >
                      <option value="Rekayasa Perancangan Mekanik">Rek. Perancangan Mekanik</option>
                      <option value="Teknik Perawatan Mesin">Teknik Perawatan Mesin</option>
                      <option value="Teknik Otomasi Industri">Teknik Otomasi Industri</option>
                      <option value="Teknik Pengolahan Hasil Tambang">Pengolahan Hasil Tambang</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      NIP / NIDN (Opsional)
                    </label>
                    <input
                      type="text"
                      value={signupNip}
                      onChange={e => setSignupNip(e.target.value)}
                      placeholder="1987..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Password (Minimal 6 Karakter)
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Konfirmasi Password
                  </label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={e => setSignupConfirmPassword(e.target.value)}
                    placeholder="Ulangi password di atas"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
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
