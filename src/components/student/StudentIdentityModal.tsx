// Student Authentication Gate & Identity Modal (NIM Login & First-time Password Activation)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  User,
  KeyRound,
  X
} from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

interface StudentIdentityModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  courseSlug: string;
  isEmbedded?: boolean; // When rendered directly inside StudentPortal as a gate
}

export const StudentIdentityModal: React.FC<StudentIdentityModalProps> = ({
  isOpen = true,
  onClose,
  courseSlug,
  isEmbedded = false
}) => {
  const {
    courses,
    periods,
    verifyStudentNim,
    createStudentPassword,
    loginStudentWithPassword
  } = useApp();

  const [step, setStep] = useState<'NIM' | 'CREATE_PASSWORD' | 'LOGIN_PASSWORD'>('NIM');
  const [nimInput, setNimInput] = useState('');
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);

  // Form states for password
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCourse = courses.find(c => c.slug === courseSlug) || courses[0];
  const activePeriod = periods.find(p => p.courseId === activeCourse?.id && p.status === 'ACTIVE') ||
                       periods.find(p => p.courseId === activeCourse?.id);

  if (!isOpen && !isEmbedded) return null;

  // Step 1: Verify NIM
  const handleVerifyNim = (nimToTest?: string) => {
    const nim = (nimToTest || nimInput).trim();
    setErrorMessage(null);

    if (!nim) {
      setErrorMessage('Silakan masukkan Nomor Induk Mahasiswa (NIM) Anda.');
      return;
    }

    const verification = verifyStudentNim(nim, activeCourse?.slug, activePeriod?.id);

    if (!verification.exists || !verification.student) {
      setErrorMessage(verification.message || `NIM "${nim}" tidak terdaftar dalam pangkalan data mahasiswa Politeknik Sorowako.`);
      return;
    }

    setTargetStudent(verification.student);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setErrorMessage(null);

    if (verification.hasCreatedPassword) {
      setStep('LOGIN_PASSWORD');
    } else {
      setStep('CREATE_PASSWORD');
    }
  };

  // Step 2A: Create Password for First-time user
  const handleCreatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !activeCourse || !activePeriod) return;

    setErrorMessage(null);

    if (passwordInput.length < 4) {
      setErrorMessage('Password baru minimal harus 4 karakter.');
      return;
    }

    if (passwordInput !== confirmPasswordInput) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = createStudentPassword(
        targetStudent.id,
        passwordInput,
        activeCourse.slug,
        activePeriod.id
      );

      if (result.success) {
        sessionStorage.removeItem('poliwako_in_workspace');
        if (onClose) onClose();
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2B: Login with Password for returning user
  const handleLoginPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !activeCourse || !activePeriod) return;

    setErrorMessage(null);

    if (!passwordInput) {
      setErrorMessage('Silakan masukkan password akun Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = loginStudentWithPassword(
        targetStudent.nim,
        passwordInput,
        activeCourse.slug,
        activePeriod.id
      );

      if (result.success) {
        sessionStorage.removeItem('poliwako_in_workspace');
        if (onClose) onClose();
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToNim = () => {
    setStep('NIM');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setErrorMessage(null);
  };

  const content = (
    <div className="relative backdrop-blur-3xl bg-slate-900/65 rounded-[2.25rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(56,189,248,0.2)] border border-white/15 ring-1 ring-cyan-500/30 w-full max-w-md overflow-hidden flex flex-col transition-all duration-300">
      {/* Top Glass Specular Reflection Highlight */}
      <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-white/15 via-cyan-500/5 to-transparent pointer-events-none rounded-t-[2.25rem]" />
      
      {/* Subtle Inner Accent Glows */}
      <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

      {/* Body Area */}
      <div className="p-7 sm:p-9 flex-1 flex flex-col relative z-10">
        {onClose && !isEmbedded && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700/60 shadow-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center mx-auto mb-3.5 shadow-xl shadow-cyan-500/25 ring-2 ring-white/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {step === 'CREATE_PASSWORD' ? 'Aktivasi Akun Mahasiswa' : step === 'LOGIN_PASSWORD' ? 'Login Mahasiswa' : 'Portal Praktik Mahasiswa'}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 mx-auto mt-1.5 shadow-xs">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{activeCourse?.name}</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-950/70 backdrop-blur-md border border-rose-500/50 rounded-2xl flex items-start gap-3 text-rose-200 text-xs animate-shake shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: INPUT NIM                                             */}
        {/* ------------------------------------------------------------- */}
        {step === 'NIM' && (
          <div>
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nomor Induk Mahasiswa (NIM)
              </label>
              <p className="text-xs text-slate-400 mb-3.5">
                Masukkan NIM Anda untuk mengakses materi praktik dan penugasan:
              </p>

              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={nimInput}
                  onChange={e => {
                    setNimInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyNim();
                    }
                  }}
                  placeholder="Ketik NIM Anda (contoh: 240001)..."
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleVerifyNim()}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Lanjutkan dengan NIM</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2A: FIRST-TIME REGISTRATION (BUAT PASSWORD BARU)        */}
        {/* ------------------------------------------------------------- */}
        {step === 'CREATE_PASSWORD' && targetStudent && (
          <form onSubmit={handleCreatePassword}>
            {/* Student Info Card */}
            <div className="p-4 bg-amber-950/40 backdrop-blur-md border border-amber-500/30 rounded-2xl mb-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold mb-1">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Kunjungan Pertama Kali — Aktivasi Akun</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/20">
                <div>
                  <h4 className="text-sm font-bold text-white">{targetStudent.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    NIM: {targetStudent.nim} • Kelas {targetStudent.className}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToNim}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Ganti NIM</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Halo <strong className="text-white">{targetStudent.name}</strong>, akun Anda belum memiliki password. Buat password baru untuk melindungi progres dan penilaian praktik Anda:
            </p>

            {/* Input Password Baru */}
            <div className="mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password Baru
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Buat password (min. 4 karakter)..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Input Konfirmasi Password */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Konfirmasi Password Baru
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={e => setConfirmPasswordInput(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Match Status */}
              {confirmPasswordInput && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {passwordInput === confirmPasswordInput ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Password cocok
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Password belum cocok
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetToNim}
                className="px-4 py-3.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-2xl transition-all shadow-xs cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !passwordInput || passwordInput !== confirmPasswordInput}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Simpan Password & Masuk</span>
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2B: RETURNING USER LOGIN (MASUKKAN PASSWORD)             */}
        {/* ------------------------------------------------------------- */}
        {step === 'LOGIN_PASSWORD' && targetStudent && (
          <form onSubmit={handleLoginPassword}>
            {/* Student Info Card */}
            <div className="p-4 bg-cyan-950/40 backdrop-blur-md border border-cyan-500/30 rounded-2xl mb-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-bold mb-1">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Mahasiswa Terdaftar</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyan-500/20">
                <div>
                  <h4 className="text-sm font-bold text-white">{targetStudent.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    NIM: {targetStudent.nim} • Kelas {targetStudent.className}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToNim}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Ganti NIM</span>
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password Akun
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan password Anda..."
                  className="w-full pl-10 pr-10 py-3.5 bg-slate-950/60 backdrop-blur-xl border border-slate-700/80 focus:border-cyan-400 focus:bg-slate-900/90 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal shadow-inner"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                *Jika Anda lupa password, hubungi instruktur mata kuliah untuk mereset akun Anda.
              </p>
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetToNim}
                className="px-4 py-3.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-2xl transition-all shadow-xs cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !passwordInput}
                className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-cyan-500/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Masuk Praktik</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-6 w-full">
        {content}
      </div>
    );
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn overflow-hidden">
        {/* Animated Orbs in Modal Backdrop */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-600/30 blur-[90px] animate-float-slow pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-indigo-600/30 blur-[90px] animate-float-reverse pointer-events-none" />
        <div className="relative z-10 w-full flex items-center justify-center">
          {content}
        </div>
      </div>
    </ModalPortal>
  );
};
