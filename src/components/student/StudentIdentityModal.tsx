// Student Authentication Gate & Identity Modal (NIM Login & First-time Password Activation)

import React, { useEffect, useRef, useState } from 'react';
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
import { getKnownProdiFromClass } from '../../utils/academicUtils';
import { supabase } from '../../services/supabaseClient';

interface StudentIdentityModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  courseSlug?: string;
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

  const [step, setStep] = useState<'NIM' | 'CREATE_PASSWORD' | 'LOGIN_PASSWORD' | 'RESET_PASSWORD'>('NIM');
  const [nimInput, setNimInput] = useState('');
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [targetStudyProgram, setTargetStudyProgram] = useState<{ name: string; code: string } | null>(null);
  const [targetPeriodId, setTargetPeriodId] = useState<string>('');
  const [targetCourseSlug, setTargetCourseSlug] = useState<string>('');

  // Form states for password
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSessionReady, setIsResetSessionReady] = useState(false);
  const verificationRequestRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  // The NIM lookup returns the database-derived program label without exposing
  // the student's name or class before login or password creation.
  const targetStudentProdi = (targetStudyProgram
    ? getKnownProdiFromClass(undefined, targetStudyProgram.name)
    : null) || getKnownProdiFromClass(targetStudent?.className);

  const activeCourse = courseSlug ? courses.find(c => c.slug === courseSlug) : undefined;
  const activePeriod = activeCourse
    ? periods.find(p => p.courseId === activeCourse.id && p.status === 'ACTIVE') ||
      periods.find(p => p.courseId === activeCourse.id)
    : undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('student_reset') !== '1' || !supabase) return;

    setStep('RESET_PASSWORD');
    let isCurrent = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('Token reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.');
        const email = data.session.user.email?.trim().toLowerCase() || '';
        if (!email.endsWith('@politekniksorowako.ac.id')) {
          throw new Error('Tautan reset harus dibuka menggunakan email resmi mahasiswa.');
        }
        setIsResetSessionReady(true);
      } catch (error) {
        await supabase.auth.signOut();
        if (isCurrent) {
          setErrorMessage(error instanceof Error ? error.message : 'Token reset tidak dapat diverifikasi.');
        }
      } finally {
        if (isCurrent) setIsSubmitting(false);
      }
    })();

    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (isEmbedded || !isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const firstFocusable = dialog?.querySelector<HTMLElement>('[autofocus], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isEmbedded, isOpen]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && onClose) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusableElements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ) || []).filter(element => element.getClientRects().length > 0);
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
    } else if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen && !isEmbedded) return null;

  // Step 1: Verify NIM
  const handleVerifyNim = async (nimToTest?: string) => {
    const nim = (nimToTest || nimInput).trim();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nim) {
      setErrorMessage('Silakan masukkan Nomor Induk Mahasiswa (NIM) Anda.');
      return;
    }

    const requestId = ++verificationRequestRef.current;
    setTargetStudent(null);
    setTargetStudyProgram(null);
    setTargetPeriodId('');
    setTargetCourseSlug('');
    setIsSubmitting(true);
    try {
      const verification = await verifyStudentNim(nim, courseSlug, activePeriod?.id);
      if (requestId !== verificationRequestRef.current) return;

      if (!verification.exists || !verification.isEnrolled) {
        setErrorMessage(verification.message || `NIM "${nim}" tidak terdaftar dalam pangkalan data mahasiswa Politeknik Sorowako.`);
        return;
      }

      if (verification.student && verification.student.nim.trim().toLowerCase() !== nim.toLowerCase()) {
        setErrorMessage('NIM yang dikembalikan server tidak cocok dengan NIM yang dimasukkan. Silakan coba lagi.');
        return;
      }

      setTargetStudent(verification.student || {
        id: '',
        nim: nim.trim(),
        name: '',
        className: '',
        createdAt: new Date().toISOString(),
      });
      setTargetStudyProgram(verification.studyProgramName && verification.studyProgramCode
        ? { name: verification.studyProgramName, code: verification.studyProgramCode }
        : null);
      setTargetPeriodId(verification.periodId || activePeriod?.id || '');
      setTargetCourseSlug(
        verification.courseSlug ||
        (verification.periodId && periods.find(period => period.id === verification.periodId)
          ? courses.find(course => course.id === periods.find(period => period.id === verification.periodId)?.courseId)?.slug
          : undefined) || courseSlug || ''
      );
      setPasswordInput('');
      setConfirmPasswordInput('');
      setErrorMessage(null);

      if (verification.hasCreatedPassword) {
        setStep('LOGIN_PASSWORD');
      } else {
        setStep('CREATE_PASSWORD');
      }
    } finally {
      if (requestId === verificationRequestRef.current) setIsSubmitting(false);
    }
  };

  // Step 2A: Create Password for First-time user
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;

    setErrorMessage(null);

    if (passwordInput.trim().length < 8) {
      setErrorMessage('Password baru minimal harus 8 karakter.');
      return;
    }

    if (passwordInput !== confirmPasswordInput) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createStudentPassword(
        targetStudent.nim,
        passwordInput,
        targetCourseSlug || courseSlug || '',
        targetPeriodId || activePeriod?.id || ''
      );

      if (result.success) {
        sessionStorage.removeItem('poliwako_in_workspace');
        window.history.pushState(null, '', '/mahasiswa/unit');
        window.dispatchEvent(new PopStateEvent('popstate'));
        if (onClose) onClose();
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2B: Login with Password for returning user
  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!passwordInput) {
      setErrorMessage('Silakan masukkan password akun Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginStudentWithPassword(
        targetStudent.nim,
        passwordInput,
        targetCourseSlug || courseSlug || '',
        targetPeriodId || activePeriod?.id || ''
      );

      if (result.success) {
        sessionStorage.removeItem('poliwako_in_workspace');
        window.history.pushState(null, '', '/mahasiswa/unit');
        window.dispatchEvent(new PopStateEvent('popstate'));
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
    setTargetStudyProgram(null);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleRequestPasswordReset = async () => {
    if (!targetStudent || !supabase) {
      setErrorMessage('Layanan email reset belum tersedia. Silakan hubungi instruktur.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const email = `${targetStudent.nim.trim()}@politekniksorowako.ac.id`.toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/mahasiswa?student_reset=1`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSuccessMessage('Jika akun terkait dapat menerima email, tautan untuk mengatur ulang kata sandi telah dikirim ke alamat email institusi Anda. Silakan periksa kotak masuk atau folder spam.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Email reset gagal dikirim. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetStudentPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !isResetSessionReady) return;
    setErrorMessage(null);
    if (passwordInput.trim().length < 8) {
      setErrorMessage('Password baru minimal harus 8 karakter.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('student_auth_reset_own_password', {
        p_password: passwordInput,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Password belum dapat direset.');
      await supabase.auth.signOut();
      window.history.replaceState(null, '', '/mahasiswa');
      window.dispatchEvent(new PopStateEvent('popstate'));
      setIsResetSessionReady(false);
      setPasswordInput('');
      setConfirmPasswordInput('');
      setStep('NIM');
      setSuccessMessage('Password berhasil direset. Silakan masuk menggunakan NIM dan password baru.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Password belum dapat direset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <section className="student-identity-card relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex-1 p-5 sm:p-7">
        {onClose && !isEmbedded && (
          <button
            onClick={onClose}
            aria-label="Tutup dialog login mahasiswa"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="mb-6 text-left">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-800">
            {step === 'CREATE_PASSWORD' ? 'Aktivasi akun' : step === 'LOGIN_PASSWORD' ? 'Akun mahasiswa' : step === 'RESET_PASSWORD' ? 'Reset password' : 'Masuk ke portal'}
          </p>
          <h2 id="student-identity-dialog-title" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {step === 'CREATE_PASSWORD' || step === 'RESET_PASSWORD' ? 'Buat password baru' : step === 'LOGIN_PASSWORD' ? 'Masukkan password' : 'Verifikasi NIM Anda'}
          </h2>
          {activeCourse?.name && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activeCourse.name}</span>
            </div>
          )}
          {step === 'NIM' && <p className="mt-2 text-sm leading-5 text-slate-600">Gunakan NIM untuk menemukan akun mahasiswa dan mata kuliah Anda.</p>}
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900 animate-shake">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-900">
            {successMessage}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: INPUT NIM                                             */}
        {/* ------------------------------------------------------------- */}
        {step === 'NIM' && (
          <div>
            <div className="mb-6">
              <label htmlFor="student-identity-nim" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Nomor Induk Mahasiswa (NIM)
              </label>
              <p className="mb-3.5 text-xs leading-5 text-slate-500">
                Masukkan NIM untuk melanjutkan ke materi praktik dan penugasan.
              </p>

              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="student-identity-nim"
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
                  className="ui-field w-full border-slate-300 bg-white pl-10 pr-4 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleVerifyNim()}
              className="ui-button ui-button-primary w-full text-sm group"
            >
              <span>Lanjutkan dengan NIM</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2A: FIRST-TIME REGISTRATION (BUAT PASSWORD BARU)        */}
        {/* ------------------------------------------------------------- */}
        {step === 'CREATE_PASSWORD' && targetStudent && (
          <form onSubmit={handleCreatePassword}>
            {/* Student Info Card */}
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>Kunjungan Pertama Kali — Aktivasi Akun</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/20">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{targetStudent.name}</h4>
                  <p className="font-mono text-xs text-slate-600">
                    NIM: {targetStudent.nim}{targetStudent.className ? ` • Kelas ${targetStudent.className}` : ''}
                  </p>
                  {targetStudentProdi && <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-sans text-[11px] font-semibold ${targetStudentProdi.badgeClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${targetStudentProdi.dotColor}`} />
                    {targetStudyProgram?.code || targetStudentProdi.code} <span aria-hidden="true">•</span> {targetStudentProdi.name}
                  </span>}
                </div>
                <button
                  type="button"
                  onClick={handleResetToNim}
                  className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-blue-800 hover:bg-amber-100"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Ganti NIM</span>
                </button>
              </div>
            </div>

            <p className="mb-4 text-sm leading-5 text-slate-600">
              Akun ini belum memiliki password. Buat password minimal 8 karakter, lalu konfirmasi password Anda:
            </p>

            {/* Input Password Baru */}
            <div className="mb-3">
              <label htmlFor="student-new-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Password Baru
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="student-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Buat password (min. 8 karakter)..."
                  className="ui-field w-full border-slate-300 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Input Konfirmasi Password */}
            <div className="mb-5">
              <label htmlFor="student-confirm-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Konfirmasi Password Baru
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="student-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={e => setConfirmPasswordInput(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className="ui-field w-full border-slate-300 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Match Status */}
              {confirmPasswordInput && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {passwordInput === confirmPasswordInput ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Password cocok
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-rose-800">
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
                className="ui-button ui-button-secondary"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !passwordInput || passwordInput !== confirmPasswordInput}
                className="ui-button ui-button-primary flex-1 bg-emerald-700 text-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                <Lock className="h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
                <span>Mahasiswa Terdaftar</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyan-500/20">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{targetStudent.name}</h4>
                  <p className="font-mono text-xs text-slate-600">
                    NIM: {targetStudent.nim}{targetStudent.className ? ` • Kelas ${targetStudent.className}` : ''}
                  </p>
                  {targetStudentProdi && <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-sans text-[11px] font-semibold ${targetStudentProdi.badgeClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${targetStudentProdi.dotColor}`} />
                    {targetStudyProgram?.code || targetStudentProdi.code} <span aria-hidden="true">•</span> {targetStudentProdi.name}
                  </span>}
                </div>
                <button
                  type="button"
                  onClick={handleResetToNim}
                  className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Ganti NIM</span>
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="student-login-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Password Akun
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="student-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan password Anda..."
                  className="ui-field w-full border-slate-300 bg-white py-3.5 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="button" onClick={() => void handleRequestPasswordReset()} disabled={isSubmitting} className="mt-2 min-h-10 text-left text-xs font-semibold text-blue-800 underline decoration-blue-300 underline-offset-2 hover:text-blue-950 disabled:opacity-60">
                {isSubmitting ? 'Mengirim tautan reset…' : 'Lupa password? Kirim token reset ke email NIM Anda'}
              </button>
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetToNim}
                className="ui-button ui-button-secondary"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !passwordInput}
                className="ui-button ui-button-primary flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>Masuk Praktik</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        )}

        {step === 'RESET_PASSWORD' && (
          <form onSubmit={handleResetStudentPassword}>
            <p className="mb-5 text-sm leading-5 text-slate-600">
              Token email telah diverifikasi. Buat password baru minimal 8 karakter.
            </p>
            <div className="mb-3">
              <label htmlFor="student-reset-password" className="mb-1.5 block text-xs font-semibold text-slate-700">Password Baru</label>
              <input id="student-reset-password" type="password" value={passwordInput} onChange={event => setPasswordInput(event.target.value)} autoComplete="new-password" className="ui-field w-full border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" required minLength={8} disabled={!isResetSessionReady || isSubmitting} />
            </div>
            <div className="mb-5">
              <label htmlFor="student-reset-password-confirm" className="mb-1.5 block text-xs font-semibold text-slate-700">Konfirmasi Password Baru</label>
              <input id="student-reset-password-confirm" type="password" value={confirmPasswordInput} onChange={event => setConfirmPasswordInput(event.target.value)} autoComplete="new-password" className="ui-field w-full border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" required minLength={8} disabled={!isResetSessionReady || isSubmitting} />
            </div>
            <button type="submit" disabled={!isResetSessionReady || isSubmitting || !passwordInput || passwordInput !== confirmPasswordInput} className="ui-button ui-button-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? 'Memproses…' : 'Simpan Password Baru'}
            </button>
          </form>
        )}

      </div>
    </section>
  );

  if (isEmbedded) {
    return (
      <div className="flex w-full items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <ModalPortal>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-identity-dialog-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px] animate-fadeIn"
      >
        <div className="relative z-10 w-full flex items-center justify-center">
          {content}
        </div>
      </div>
    </ModalPortal>
  );
};
