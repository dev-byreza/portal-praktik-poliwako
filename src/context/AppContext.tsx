import { isSubmissionClosed, submissionDeadline } from '../utils/submissionDeadline';
// Central React Context for Portal Praktik Poliwako

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  UserRole,
  InstructorProfile,
  PublicInstructorProfile,
  Student,
  Course,
  PracticePeriod,
  PracticeParticipant,
  LearningUnit,
  LearningMaterial,
  Assignment,
  UnitProgress,
  Submission,
  AttendanceRecord,
  AttendanceStatus,
  Assessment,
  RemedialAssignment,
  FeedbackRule,
  Announcement,
} from '../types';
import { StorageService } from '../services/storageService';
import { isSupabaseConfigured, uploadSubmissionPDF } from '../services/supabaseClient';
import { ApiService } from '../services/apiService';
import { computeAttendanceStats, calculateWeightedFinalScore, getFeedbackForScore } from '../utils/gradeCalculators';
import { computePeriodEndDate, computePeriodStatus, getWitaDateString } from '../utils/dateUtils';
import { getRealtimeWitaDateString, fetchInternetNetworkTime } from '../services/networkTimeService';

const parseAssignmentDeadline = (value: string): number | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw
    .replace(/\s*WITA\s*$/i, '+08:00')
    .replace(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2})?$/,
      (_match, date, time, seconds = '00', timezone = '+08:00') => `${date}T${time}:${seconds}${timezone}`
    );
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
};

interface ToastInfo {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  // Roles & Auth
  role: UserRole;
  setRole: (role: UserRole) => void;
  instructor: InstructorProfile;
  isInstructorLoggedIn: boolean;
  isLiveBackend: boolean;
  loginInstructor: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  signUpInstructor: (params: {
    email: string;
    password: string;
    name: string;
    department?: string;
    nip?: string;
  }) => Promise<{ success: boolean; message: string }>;
  logoutInstructor: () => void;

  // Active View & Course
  activeCourseId: string;
  setActiveCourseId: (id: string) => void;
  activeCourse: Course | null;
  courses: Course[];
  instructorDirectory: Record<string, PublicInstructorProfile>;

  // Data
  students: Student[];
  periods: PracticePeriod[];
  participants: PracticeParticipant[];
  learningUnits: LearningUnit[];
  unitProgress: UnitProgress[];
  submissions: Submission[];
  attendance: AttendanceRecord[];
  assessments: Assessment[];
  remedials: RemedialAssignment[];
  feedbackRules: FeedbackRule[];
  announcements: Announcement[];

  // Student Session & Authentication
  studentSession: { studentId: string; courseSlug: string; periodId: string } | null;
  currentStudent: Student | null;
  verifyStudentNim: (nim: string, courseSlug?: string, periodId?: string) => Promise<{
    exists: boolean;
    student?: Student;
    isEnrolled: boolean;
    periodId?: string;
    courseSlug?: string;
    hasCreatedPassword: boolean;
    message?: string;
  }>;
  createStudentPassword: (studentId: string, password: string, courseSlug: string, periodId: string, nim?: string) => Promise<{
    success: boolean;
    message: string;
  }>;
  loginStudentWithPassword: (nim: string, password: string, courseSlug: string, periodId: string) => Promise<{
    success: boolean;
    message: string;
  }>;
  resetStudentPassword: (studentId: string) => void;
  setStudentIdentity: (studentId: string, courseSlug: string, periodId: string) => void;
  clearStudentIdentity: () => void;

  // Student Actions
  submitAssignment: (assignmentId: string, file: File, submissionType?: 'ASSIGNMENT' | 'REPORT' | 'POST_TEST', allowedFileType?: 'PDF' | 'IMAGE' | 'ZIP' | 'RAR' | 'ANY') => Promise<{ success: boolean; message?: string }>;
  reviewSubmission: (submissionId: string, status: 'REVISION_REQUIRED' | 'ACCEPTED', feedback: string) => Promise<void>;
  confirmFinalProject: (url: string) => Promise<void>;
  reviewFinalProject: (participantId: string, status: 'REVISION_REQUIRED' | 'ACCEPTED', feedback: string) => Promise<void>;
  submitStudentRemedial: (remedialId: string, file: File) => Promise<void>;

  // Instructor Actions
  createCourse: (course: Partial<Course>) => Course;
  copyCourse: (sourceCourseId: string, newName: string, academicYear: string, semester: 'Ganjil' | 'Genap') => Course;
  updateCourse: (course: Course) => Promise<void>;
  deleteCourse: (courseId: string) => void;

  createPeriod: (period: Partial<PracticePeriod>) => PracticePeriod;
  duplicatePeriod: (sourcePeriodId: string, newName: string, startDate: string) => PracticePeriod;
  updatePeriod: (period: PracticePeriod) => void;
  deletePeriod: (periodId: string) => void;
  syncAllPeriodsStatus: () => Promise<{ changedCount: number; todayStr: string }>;

  addParticipantsBulk: (periodId: string, nims: string[]) => { added: number; duplicates: number; notFound: string[] };
  updateParticipant: (participant: PracticeParticipant) => void;
  removeParticipant: (participantId: string) => void;

  addStudent: (student: Omit<Student, 'id' | 'createdAt'>) => Student;
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  importStudentsCSV: (students: Omit<Student, 'id' | 'createdAt'>[]) => { importedCount: number; duplicateCount: number };

  createLearningUnit: (unit: Partial<LearningUnit>) => LearningUnit;
  updateLearningUnit: (unit: LearningUnit) => void;
  deleteLearningUnit: (unitId: string) => void;
  copyLearningUnits: (sourceUnitIds: string[], targetPeriodIds: string[], overwrite?: boolean) => { copiedCount: number; targetCount: number };

  updateAttendanceCell: (periodId: string, studentId: string, day: 'day1' | 'day2' | 'day3' | 'day4' | 'day5', status: AttendanceStatus) => void;
  autoInitializeAttendanceForPeriod: (periodId: string) => Promise<void>;
  setAllPeriodAttendanceStatus: (periodId: string, status?: AttendanceStatus) => Promise<void>;
  saveAssessment: (assessment: Assessment) => void;
  publishPeriodGrades: (periodId: string) => { publishedCount: number; blockedCount: number };
  unpublishPeriodGrades: (periodId: string) => void;

  createRemedialTask: (remedial: Partial<RemedialAssignment>) => Promise<RemedialAssignment>;
  gradeRemedialTask: (remedialId: string, status: 'LULUS' | 'BELUM_LULUS') => Promise<void>;

  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => Promise<Announcement>;
  deleteAnnouncement: (announcementId: string) => Promise<void>;

  saveCustomFeedbackRules: (rules: FeedbackRule[]) => void;
  resetToDefaultData: () => void;

  // Toast
  toasts: ToastInfo[];
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const newEntityId = (prefix: string): string => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isLiveBackend = useMemo(() => isSupabaseConfigured(), []);
  const [isInstructorLoggedIn, setIsInstructorLoggedIn] = useState<boolean>(() => StorageService.isInstructorLoggedIn());
  const [role, setRole] = useState<UserRole>(() => (StorageService.isInstructorLoggedIn() ? 'INSTRUCTOR' : 'STUDENT'));
  const [instructor, setInstructor] = useState<InstructorProfile>(StorageService.getInstructor());
  const [instructorDirectory, setInstructorDirectory] = useState<Record<string, PublicInstructorProfile>>(() => {
    if (isLiveBackend) return {};
    const profile = StorageService.getInstructor();
    return profile?.id
      ? { [profile.id]: { id: profile.id, name: profile.name, department: profile.department, avatarUrl: profile.avatarUrl } }
      : {};
  });
  // Supabase is authoritative in live mode. Do not paint the previous account's local course cache while the authenticated scope is loading.
  const [courses, setCourses] = useState<Course[]>(() => (isLiveBackend ? [] : StorageService.getCourses()));
  const [activeCourseId, setActiveCourseIdState] = useState<string>(() => (
    isLiveBackend
      ? StorageService.getActiveCourseId(instructor.id)
      : StorageService.getActiveCourseId()
  ));
  const [students, setStudents] = useState<Student[]>(StorageService.getStudents());
  const [periods, setPeriods] = useState<PracticePeriod[]>(StorageService.getPeriods());
  const [participants, setParticipants] = useState<PracticeParticipant[]>(() => (isLiveBackend ? [] : StorageService.getParticipants()));
  const [learningUnits, setLearningUnits] = useState<LearningUnit[]>(() => (
    isLiveBackend ? [] : StorageService.getLearningUnits()
  ));
  const [unitProgress, setUnitProgress] = useState<UnitProgress[]>(StorageService.getUnitProgress());
  const [submissions, setSubmissions] = useState<Submission[]>(StorageService.getSubmissions());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(StorageService.getAttendance());
  const [assessments, setAssessments] = useState<Assessment[]>(StorageService.getAssessments());
  const [remedials, setRemedials] = useState<RemedialAssignment[]>(StorageService.getRemedials());
  const [feedbackRules, setFeedbackRules] = useState<FeedbackRule[]>(StorageService.getFeedbackRules());
  const [announcements, setAnnouncements] = useState<Announcement[]>(StorageService.getAnnouncements());
  const [studentSession, setStudentSessionState] = useState(StorageService.getStudentSession());
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Synchronize live data from Supabase backend & reconcile period statuses with realtime internet time
  useEffect(() => {
    let isMounted = true;
    const syncBackendData = async () => {
      try {
        // Kick off authoritative internet time fetch
        fetchInternetNetworkTime().catch(() => {});

        if (!isLiveBackend) return;
        const authInstructorId = await ApiService.getCurrentInstructorId();
        const courseScope = authInstructorId || (role === 'STUDENT' && !isInstructorLoggedIn ? undefined : null);
        const [liveCourses, liveStudents, livePeriods, liveParticipants, liveUnits, liveAttendance, liveSubmissions, liveAssessments, liveInstructorDirectory, liveRemedials, liveAnnouncements] = await Promise.all([
          courseScope === null ? Promise.resolve([]) : ApiService.getCourses(courseScope),
          ApiService.getStudents(),
          ApiService.getPeriods(),
          ApiService.getParticipants(),
          ApiService.getLearningUnits(),
          ApiService.getAttendance(),
          ApiService.getSubmissions(),
          ApiService.getAssessments(),
          ApiService.getInstructorDirectory(),
          ApiService.getRemedials().catch(() => null),
          ApiService.getAnnouncements(),
        ]);
        if (!isMounted) return;
        if (liveRemedials) setRemedials(liveRemedials);
        if (liveAnnouncements) setAnnouncements(liveAnnouncements);
        if (liveCourses) {
          setCourses(liveCourses);
          if (liveCourses.length === 0) {
            setActiveCourseIdState('');
          } else if (authInstructorId || isInstructorLoggedIn) {
            const scopedInstructorId = authInstructorId || instructor.id;
            const restoredId = StorageService.getActiveCourseId(scopedInstructorId, liveCourses);
            setActiveCourseIdState(restoredId);
            if (restoredId) StorageService.setActiveCourseId(restoredId, scopedInstructorId);
          }
        }
        if (liveStudents) setStudents(liveStudents);

        if (livePeriods && livePeriods.length > 0) {
          const todayStr = getRealtimeWitaDateString();
          let needsUpdate = false;
          const reconciledPeriods = livePeriods.map(p => {
            if (p.autoStatus !== false) {
              const expectedStatus = computePeriodStatus(p.startDate, p.endDate, todayStr);
              if (p.status !== expectedStatus) {
                needsUpdate = true;
                return { ...p, status: expectedStatus, autoStatus: true };
              }
            }
            return p;
          });
          setPeriods(reconciledPeriods);
          if (needsUpdate) {
            ApiService.savePeriodsBulk(reconciledPeriods);
          }
        }

        if (liveParticipants) setParticipants(liveParticipants);
        if (liveUnits) setLearningUnits(liveUnits);
        if (liveAttendance) setAttendance(liveAttendance);
        if (liveSubmissions) setSubmissions(liveSubmissions);
        if (liveAssessments) setAssessments(liveAssessments);
        if (liveInstructorDirectory) setInstructorDirectory(liveInstructorDirectory);
      } catch (e) {
        console.warn('Sync from Supabase notice:', e);
      }
    };

    // Keep shared period settings, assignments, and instructor submissions
    // fresh when either portal stays open while another user makes a change.
    const refreshLiveData = async () => {
      if (!isLiveBackend || document.visibilityState === 'hidden') return;
      try {
        const [latestPeriods, latestUnits, latestSubmissions, latestAnnouncements] = await Promise.all([
          ApiService.getPeriods(),
          ApiService.getLearningUnits(),
          role === 'INSTRUCTOR' ? ApiService.getSubmissions() : Promise.resolve(null),
          ApiService.getAnnouncements(),
        ]);
        if (!isMounted) return;
        if (latestPeriods.length > 0) setPeriods(latestPeriods);
        setLearningUnits(latestUnits);
        if (latestSubmissions) setSubmissions(latestSubmissions);
        setAnnouncements(latestAnnouncements);
      } catch (error) {
        console.warn('Refresh data portal notice:', error);
      }
    };
    const handleWindowFocus = () => { void refreshLiveData(); };
    const refreshTimer = window.setInterval(() => { void refreshLiveData(); }, 30000);

    syncBackendData();
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [isLiveBackend, isInstructorLoggedIn, instructor.id, role]);

  // Sync to LocalStorage on changes
  useEffect(() => {
    StorageService.saveCourses(courses);
  }, [courses]);

  useEffect(() => {
    StorageService.saveStudents(students);
  }, [students]);

  useEffect(() => {
    StorageService.savePeriods(periods);
  }, [periods]);

  useEffect(() => {
    StorageService.saveLearningUnits(learningUnits);
  }, [learningUnits]);

  useEffect(() => {
    StorageService.saveParticipants(participants);
  }, [participants]);

  useEffect(() => {
    StorageService.saveUnitProgress(unitProgress);
  }, [unitProgress]);

  useEffect(() => {
    StorageService.saveSubmissions(submissions);
  }, [submissions]);

  useEffect(() => {
    StorageService.saveAttendance(attendance);
  }, [attendance]);

  useEffect(() => {
    StorageService.saveAssessments(assessments);
  }, [assessments]);

  useEffect(() => {
    StorageService.saveRemedials(remedials);
  }, [remedials]);

  useEffect(() => {
    StorageService.saveFeedbackRules(feedbackRules);
  }, [feedbackRules]);

  useEffect(() => {
    StorageService.saveAnnouncements(announcements);
  }, [announcements]);

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const setActiveCourseId = (id: string) => {
    setActiveCourseIdState(id);
    StorageService.setActiveCourseId(id, isInstructorLoggedIn ? instructor.id : undefined);
  };

  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === activeCourseId) || courses[0] || null;
  }, [courses, activeCourseId]);

  const currentStudent = useMemo(() => {
    if (!studentSession) return null;
    return students.find(s => s.id === studentSession.studentId) || null;
  }, [studentSession, students]);

  // Migrate passwords created by older builds from the legacy browser cache
  // exactly once per session. This lets an already-logged-in student carry
  // their existing password to Supabase without asking them to activate again.
  const legacyPasswordSyncKey = `${studentSession?.studentId || ''}:${studentSession?.courseSlug || ''}:${studentSession?.periodId || ''}`;
  const legacyPasswordSyncRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!isLiveBackend || !studentSession || !currentStudent?.password || !legacyPasswordSyncKey) return;
    if (legacyPasswordSyncRef.current === legacyPasswordSyncKey) return;
    legacyPasswordSyncRef.current = legacyPasswordSyncKey;
    ApiService.studentAuthSetPassword(
      currentStudent.id,
      currentStudent.nim,
      currentStudent.password,
      studentSession.courseSlug,
      studentSession.periodId,
    ).catch(error => {
      console.warn('Legacy student password migration notice:', error);
    });
  }, [isLiveBackend, currentStudent?.id, currentStudent?.nim, currentStudent?.password, legacyPasswordSyncKey, studentSession?.courseSlug, studentSession?.periodId]);

  // Auth
  const loginInstructor = async (email: string, password?: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
      showToast('Akses Ditolak', 'Hanya email berdomain @politekniksorowako.ac.id yang diizinkan untuk akun instruktur.', 'error');
      return { success: false, message: 'Domain email tidak diizinkan. Gunakan akun institusi Politeknik Sorowako.' };
    }

    let authInstructorId: string | null = null;

    // Try live Supabase authentication first if password provided
    if (ApiService.isLiveBackend() && password) {
      const { error } = await ApiService.loginInstructor(cleanEmail, password);
      if (error) {
        console.warn('Supabase auth notice:', error.message);
        const message = error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')
          ? 'Email atau password salah. Silakan periksa kembali.'
          : 'Login Supabase gagal. Periksa koneksi dan akun Anda.';
        showToast('Login Gagal', message, 'error');
        return { success: false, message };
      }
      authInstructorId = await ApiService.getCurrentInstructorId();
    } else if (cleanEmail === 'rezaf@politekniksorowako.ac.id' && password && password !== '732401#Jhe') {
      showToast('Password Salah', 'Password yang dimasukkan tidak cocok.', 'error');
      return { success: false, message: 'Password salah. Silakan periksa kembali password akun Anda.' };
    }

    let profileName = 'Reza Febriadi Rauf';
    let department = 'Rekayasa Perancangan Mekanik';
    let nip = '198709122015041002';

    if (cleanEmail !== 'rezaf@politekniksorowako.ac.id') {
      profileName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    let updated: InstructorProfile = {
      ...instructor,
      id: 'inst-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '-'),
      email: cleanEmail,
      name: profileName,
      department,
      nip
    };
    if (authInstructorId) {
      const liveProfile = await ApiService.getInstructorProfile(authInstructorId);
      updated = { ...liveProfile, id: authInstructorId, email: cleanEmail };
      setCourses([]);
      setActiveCourseIdState('');
      const [liveCourses, liveStudents] = await Promise.all([
        ApiService.getCourses(authInstructorId),
        ApiService.getStudents(),
      ]);
      setCourses(liveCourses);
      setStudents(liveStudents);
      if (liveCourses[0]) {
        const restoredId = StorageService.getActiveCourseId(authInstructorId, liveCourses);
        setActiveCourseIdState(restoredId);
        StorageService.setActiveCourseId(restoredId, authInstructorId);
      }
    }
    setInstructor(updated);
    StorageService.saveInstructor(updated);
    StorageService.setInstructorLoggedIn(true);
    setIsInstructorLoggedIn(true);
    setRole('INSTRUCTOR');
    showToast('Login Berhasil', `Selamat datang, ${updated.name}`, 'success');
    return { success: true, message: 'Login berhasil' };
  };

  const signUpInstructor = async (params: {
    email: string;
    password: string;
    name: string;
    department?: string;
    nip?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
      showToast('Akses Ditolak', 'Hanya email berdomain @politekniksorowako.ac.id yang diizinkan.', 'error');
      return { success: false, message: 'Hanya email berdomain @politekniksorowako.ac.id yang diizinkan.' };
    }

    if (!params.name.trim()) {
      return { success: false, message: 'Nama lengkap wajib diisi.' };
    }

    if (params.password.length < 6) {
      return { success: false, message: 'Password minimal harus 6 karakter.' };
    }

    try {
      const { user, error } = await ApiService.signUpInstructor(
        cleanEmail,
        params.password,
        params.name.trim(),
        params.department || 'Rekayasa Perancangan Mekanik',
        params.nip
      );

      if (error) {
        showToast('Pendaftaran Gagal', error.message, 'error');
        return { success: false, message: error.message };
      }

      const authInstructorId = user?.id || await ApiService.getCurrentInstructorId();
      if (ApiService.isLiveBackend() && !authInstructorId) {
        showToast('Pendaftaran Berhasil', 'Akun dibuat. Silakan masuk setelah verifikasi email selesai.', 'success');
        return { success: true, message: 'Akun dibuat. Silakan masuk setelah verifikasi email.' };
      }

      const newProfile: InstructorProfile = {
        id: authInstructorId || 'inst-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '-'),
        email: cleanEmail,
        name: params.name.trim(),
        department: params.department || 'Rekayasa Perancangan Mekanik',
        nip: params.nip || undefined
      };

      setInstructor(newProfile);
      StorageService.saveInstructor(newProfile);
      StorageService.setInstructorLoggedIn(true);
      setIsInstructorLoggedIn(true);
      setRole('INSTRUCTOR');
      if (authInstructorId) {
        setCourses([]);
        setActiveCourseIdState('');
        const [liveCourses, liveStudents] = await Promise.all([
          ApiService.getCourses(authInstructorId),
          ApiService.getStudents(),
        ]);
        setCourses(liveCourses);
        setStudents(liveStudents);
        if (liveCourses[0]) {
          const restoredId = StorageService.getActiveCourseId(authInstructorId, liveCourses);
          setActiveCourseIdState(restoredId);
          StorageService.setActiveCourseId(restoredId, authInstructorId);
        }
      }
      showToast('Pendaftaran Berhasil', `Selamat datang, ${newProfile.name}! Akun Anda telah aktif.`, 'success');
      return { success: true, message: 'Akun instruktur berhasil didaftarkan!' };
    } catch (err: any) {
      showToast('Terjadi Kesalahan', err.message || 'Gagal mendaftar', 'error');
      return { success: false, message: err.message || 'Gagal mendaftar akun baru.' };
    }
  };


  const logoutInstructor = () => {
    setIsInstructorLoggedIn(false);
    StorageService.setInstructorLoggedIn(false);
    setRole('STUDENT');
    setCourses([]);
    setActiveCourseIdState('');
    showToast('Logout', 'Anda telah keluar dari Portal Instruktur.', 'info');
  };


  // Student Authentication & Identity Handlers
  const verifyStudentNim = async (nim: string, courseSlug?: string, periodId?: string) => {
    const cleanNim = nim.trim().toLowerCase();
    if (!cleanNim) {
      return {
        exists: false,
        isEnrolled: false,
        periodId: undefined,
        hasCreatedPassword: false,
        message: 'Silakan masukkan NIM Anda.'
      };
    }

    if (isLiveBackend) {
      try {
        const remote = await ApiService.studentAuthLookup(cleanNim, courseSlug, periodId);
        const remoteStudent = remote.student;
        if (remoteStudent) {
          setStudents(previous => [
            ...previous.filter(student => student.id !== remoteStudent.id),
            { ...remoteStudent, hasCreatedPassword: remote.hasCreatedPassword },
          ]);
          const cachedStudents = [
            ...StorageService.getStudents().filter(student => student.id !== remoteStudent.id),
            { ...remoteStudent, hasCreatedPassword: remote.hasCreatedPassword },
          ];
          StorageService.saveStudents(cachedStudents);
        }
        return remote;
      } catch (error) {
        console.error('Student authentication lookup failed:', error);
        return {
          exists: false,
          isEnrolled: false,
          periodId: undefined,
          hasCreatedPassword: false,
          message: 'Data mahasiswa belum dapat diverifikasi ke Supabase. Coba lagi.'
        };
      }
    }

    const std = students.find(s => s.nim.toLowerCase() === cleanNim);
    if (!std) {
      return {
        exists: false,
        isEnrolled: false,
        periodId: undefined,
        hasCreatedPassword: false,
        message: `NIM "${nim.trim()}" tidak terdaftar dalam pangkalan data mahasiswa Politeknik Sorowako.`
      };
    }

    const course = courseSlug ? courses.find(item => item.slug === courseSlug) : undefined;
    const coursePeriodIds = new Set(
      periods.filter(period => !course || period.courseId === course.id).map(period => period.id)
    );
    const enrolledPeriodIds = participants
      .filter(participant => participant.studentId === std.id && coursePeriodIds.has(participant.periodId))
      .map(participant => participant.periodId);
    const selectedPeriodIsEnrolled = periodId ? enrolledPeriodIds.includes(periodId) : false;
    const preferredPeriod = periods.find(period => selectedPeriodIsEnrolled && period.id === periodId)
      || periods.find(period => enrolledPeriodIds.includes(period.id) && period.status === 'ACTIVE')
      || periods.find(period => enrolledPeriodIds.includes(period.id));
    const isEnrolled = enrolledPeriodIds.length > 0;
    const hasCreatedPassword = Boolean(std.hasCreatedPassword || (std.password && std.password.length > 0));

    return {
      exists: true,
      student: std,
      isEnrolled,
      periodId: preferredPeriod?.id,
      hasCreatedPassword,
      message: isEnrolled ? undefined : 'Mahasiswa belum terdaftar pada mata kuliah atau periode praktik ini.'
    };
  };

  const createStudentPassword = async (studentId: string, password: string, courseSlug: string, periodId: string, nim?: string) => {
    const std = students.find(s => s.id === studentId);
    if (!std) {
      return { success: false, message: 'Data mahasiswa tidak ditemukan.' };
    }
    if (!password || password.trim().length < 4) {
      return { success: false, message: 'Password harus minimal 4 karakter.' };
    }

    if (isLiveBackend) {
      try {
        const result = await ApiService.studentAuthSetPassword(studentId, nim || std.nim, password, courseSlug, periodId);
        if (!result.success) return { success: false, message: result.message };
        const remoteStudent = result.student || std;
        const updatedStudent = { ...remoteStudent, hasCreatedPassword: true };
        setStudents(previous => [
          ...previous.filter(student => student.id !== updatedStudent.id),
          updatedStudent,
        ]);
        StorageService.saveStudents([
          ...StorageService.getStudents().filter(student => student.id !== updatedStudent.id),
          updatedStudent,
        ]);
        const session = { studentId: updatedStudent.id, courseSlug, periodId: result.periodId || periodId };
        setStudentSessionState(session);
        StorageService.setStudentSession(session);
        setRole('STUDENT');
        showToast('Aktivasi Berhasil', `Password berhasil dibuat! Selamat datang, ${updatedStudent.name}.`, 'success');
        return { success: true, message: result.message };
      } catch (error: any) {
        console.error('Student password persistence failed:', error);
        return { success: false, message: 'Password belum tersimpan ke Supabase. Coba lagi.' };
      }
    }

    const trimmedPassword = password.trim();
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        return { ...s, password: trimmedPassword, hasCreatedPassword: true };
      }
      return s;
    });

    setStudents(updatedStudents);
    StorageService.saveStudents(updatedStudents);

    // Establish session
    const session = { studentId, courseSlug, periodId };
    setStudentSessionState(session);
    StorageService.setStudentSession(session);
    setRole('STUDENT');

    showToast('Aktivasi Berhasil', `Password berhasil dibuat! Selamat datang, ${std.name}.`, 'success');
    return { success: true, message: 'Password berhasil dibuat dan sesi aktif.' };
  };

  const loginStudentWithPassword = async (nim: string, password: string, courseSlug: string, periodId: string) => {
    const cleanNim = nim.trim().toLowerCase();

    if (isLiveBackend) {
      try {
        const result = await ApiService.studentAuthLogin(cleanNim, password, courseSlug, periodId);
        if (!result.success || !result.student) return { success: false, message: result.message };
        const remoteStudent = { ...result.student, hasCreatedPassword: true };
        setStudents(previous => [
          ...previous.filter(student => student.id !== remoteStudent.id),
          remoteStudent,
        ]);
        StorageService.saveStudents([
          ...StorageService.getStudents().filter(student => student.id !== remoteStudent.id),
          remoteStudent,
        ]);
        const session = { studentId: remoteStudent.id, courseSlug, periodId: result.periodId || periodId };
        setStudentSessionState(session);
        StorageService.setStudentSession(session);
        setRole('STUDENT');
        showToast('Login Berhasil', `Selamat datang kembali, ${remoteStudent.name}!`, 'success');
        return { success: true, message: result.message };
      } catch (error: any) {
        console.error('Student password login failed:', error);
        return { success: false, message: 'Login belum dapat diverifikasi ke Supabase. Coba lagi.' };
      }
    }

    const std = students.find(s => s.nim.toLowerCase() === cleanNim);
    if (!std) {
      return { success: false, message: `NIM "${nim.trim()}" tidak ditemukan.` };
    }

    const hasCreatedPassword = Boolean(std.hasCreatedPassword || (std.password && std.password.length > 0));
    if (!hasCreatedPassword) {
      return { success: false, message: 'Akun Anda belum memiliki password. Silakan buat password terlebih dahulu.' };
    }

    if (std.password !== password.trim()) {
      return { success: false, message: 'Password salah. Periksa kembali password Anda.' };
    }

    // Establish session
    const session = { studentId: std.id, courseSlug, periodId };
    setStudentSessionState(session);
    StorageService.setStudentSession(session);
    setRole('STUDENT');

    showToast('Login Berhasil', `Selamat datang kembali, ${std.name}!`, 'success');
    return { success: true, message: 'Login berhasil.' };
  };

  const resetStudentPassword = (studentId: string) => {
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        return { ...s, password: '', hasCreatedPassword: false };
      }
      return s;
    });
    setStudents(updatedStudents);
    StorageService.saveStudents(updatedStudents);

    const std = students.find(s => s.id === studentId);
    showToast('Password Direset', `Akun ${std?.name || 'Mahasiswa'} berhasil direset. Mahasiswa dapat membuat password baru saat login berikutnya.`, 'info');
  };

  // Student Identity
  const setStudentIdentity = (studentId: string, courseSlug: string, periodId: string) => {
    const session = { studentId, courseSlug, periodId };
    setStudentSessionState(session);
    StorageService.setStudentSession(session);
    setRole('STUDENT');

    // Enrollment is managed by instructors. Selecting a course only establishes the session.
    setParticipants(prev => prev.map(p => {
      if (p.periodId === periodId && p.studentId === studentId && p.progressStatus === 'NOT_STARTED') {
        return { ...p, progressStatus: 'IN_PROGRESS' };
      }
      return p;
    }));

    const std = students.find(s => s.id === studentId);
    showToast('Selamat Datang', `Praktik aktif untuk ${std?.name || 'Mahasiswa'} (NIM: ${std?.nim})`, 'success');
  };

  const clearStudentIdentity = () => {
    setStudentSessionState(null);
    StorageService.setStudentSession(null);
    showToast('Sesi Selesai', 'Anda telah keluar dari ruang praktik mahasiswa.', 'info');
  };

  // Student Assignment Submission
  const submitAssignment = async (assignmentId: string, file: File, submissionType: 'ASSIGNMENT' | 'REPORT' | 'POST_TEST' = 'ASSIGNMENT', allowedFileType: 'PDF' | 'IMAGE' | 'ZIP' | 'RAR' | 'ANY' = 'PDF'): Promise<{ success: boolean; message?: string }> => {
    if (!studentSession) return { success: false, message: 'Sesi mahasiswa tidak ditemukan. Silakan login kembali.' };
    const { studentId, periodId } = studentSession;
    const period = periods.find((item) => item.id === periodId);
    if (!period) return { success: false, message: 'Periode praktik tidak ditemukan.' };

    // Re-check the currently synchronized assignment deadline immediately
    // before uploading. This prevents late submissions even when a student
    // leaves a file selected while the countdown expires. If the instructor
    // edits the deadline in Supabase, the updated assignment in state is used.
    const assignment = learningUnits.find(
      (unit) => unit.periodId === periodId && unit.assignment?.id === assignmentId
    )?.assignment;
    const deadlineTimestamp = assignment ? parseAssignmentDeadline(assignment.deadline) : null;
    const existing = submissions.find((item) => item.assignmentId === assignmentId && item.studentId === studentId && item.periodId === periodId);
    const isRequestedRevision = existing?.status === 'REVISION_REQUIRED';
    if (deadlineTimestamp !== null && Date.now() >= deadlineTimestamp && !isRequestedRevision) {
      const message = 'Batas waktu pengumpulan sudah berakhir. Tunggu instruktur memperbarui deadline sebelum mengunggah.';
      showToast('Tenggat Berakhir', message, 'error');
      return { success: false, message };
    }

    const upload = await uploadSubmissionPDF(file, {
      courseId: period.courseId,
      periodId,
      studentId,
      assignmentId,
      submissionType,
      allowedFileType,
      replaceStoragePath: existing?.storagePath,
    });
    if (upload.error || !upload.storagePath || !upload.publicUrl) {
      const message = upload.error?.message || 'File tidak dapat disimpan ke Supabase Storage.';
      showToast('Unggah Gagal', message, 'error');
      return { success: false, message };
    }

    const submission: Submission = {
      id: existing?.id || crypto.randomUUID(), assignmentId, studentId, periodId,
      fileName: file.name, fileUrl: upload.publicUrl, fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB', submissionType,
      storagePath: upload.storagePath, submittedAt: new Date().toISOString(), status: 'SUBMITTED',
      reviewFeedback: undefined, reviewedAt: undefined, revisionNumber: (existing?.revisionNumber || 0) + 1,
    };

    try {
      const savedSubmission = await ApiService.saveSubmission(submission);
      setSubmissions((previous) => [...previous.filter((item) => !(item.assignmentId === assignmentId && item.studentId === studentId && item.periodId === periodId)), savedSubmission]);
      showToast('Tugas Terkirim', 'File ' + file.name + ' tersimpan dan siap diperiksa instruktur.', 'success');
      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Data tugas tidak dapat disimpan ke Supabase.';
      showToast('Unggah Gagal', message, 'error');
      return { success: false, message };
    }
  };

  // Student Final Project Confirmation
  const confirmFinalProject = async (url: string) => {
    if (!studentSession) throw new Error('Silakan masuk kembali.');
    const link = new URL(url);
    if (link.protocol !== 'https:' || link.hostname !== 'drive.google.com') throw new Error('Gunakan tautan Google Drive HTTPS untuk hasil pekerjaan Anda.');
    const participant = participants.find(p => p.studentId === studentSession.studentId && p.periodId === studentSession.periodId);
    if (!participant) throw new Error('Pendaftaran peserta tidak ditemukan.');
    if (participant.finalProjectReviewStatus === 'ACCEPTED') throw new Error('Proyek sudah diterima. Hubungi instruktur untuk perubahan.');
    const updated: PracticeParticipant = {...participant, finalProjectUrl: link.href, finalProjectConfirmed: true, finalProjectReviewStatus: 'SUBMITTED', finalProjectSubmittedAt: new Date().toISOString(), progressStatus: participant.progressStatus === 'PUBLISHED' || participant.progressStatus === 'ASSESSED' ? participant.progressStatus : 'PROJECT_SUBMITTED'};
    await ApiService.saveFinalProject(updated);
    setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
    showToast('Proyek disimpan', isLiveBackend ? 'Menunggu pemeriksaan instruktur.' : 'Tautan tersimpan lokal di perangkat ini.', 'success');
  };

  const reviewFinalProject = async (participantId: string, status: 'REVISION_REQUIRED' | 'ACCEPTED', feedback: string) => {
    if (!isInstructorLoggedIn) throw new Error('Masuk sebagai instruktur terlebih dahulu.');
    const participant = participants.find(p => p.id === participantId);
    if (!participant?.finalProjectUrl) throw new Error('Tautan proyek belum tersedia.');
    if (status === 'REVISION_REQUIRED' && !feedback.trim()) throw new Error('Tuliskan instruksi revisi.');
    const updated = {...participant, finalProjectReviewStatus: status, finalProjectFeedback: feedback.trim()};
    await ApiService.saveFinalProject(updated);
    setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // Student Remedial Submission
  const submitStudentRemedial = async (remedialId: string, file: File) => {
    if (!studentSession) throw new Error('Silakan masuk kembali.');
    const remedial = remedials.find(r => r.id === remedialId && r.studentId === studentSession.studentId && r.periodId === studentSession.periodId);
    const period = periods.find(p => p.id === studentSession.periodId);
    if (!remedial || !period || !['PENDING_SUBMISSION', 'BELUM_LULUS'].includes(remedial.status)) throw new Error('Tugas tambahan tidak tersedia.');
    if (isSubmissionClosed(remedial.deadline)) throw new Error('Batas waktu remedial sudah lewat. Hubungi instruktur.');
    const upload = await uploadSubmissionPDF(file, {courseId: period.courseId, periodId: period.id, studentId: studentSession.studentId, assignmentId: remedial.id, submissionType:'REMEDIAL', allowedFileType:'PDF'});
    if (upload.error || !upload.publicUrl) throw upload.error || new Error('Berkas gagal diunggah.');
    const fileUrl = upload.publicUrl;
    const updated: RemedialAssignment = {...remedial, submissionFileName: file.name, submissionFileUrl: fileUrl, submissionStoragePath: upload.storagePath || undefined, submittedAt: new Date().toISOString(), status: 'SUBMITTED'};
    await ApiService.saveRemedial(updated);
    setRemedials(prev => prev.map(r => r.id === remedialId ? updated : r));
    showToast('Tugas Tambahan Disimpan', isLiveBackend ? 'Menunggu verifikasi instruktur.' : 'Berkas tersimpan lokal di perangkat ini.', 'success');
  };

  // Instructor Course Operations
  const createCourse = (courseData: Partial<Course>): Course => {
    const newCourse: Course = {
      id: newEntityId('course'),
      instructorId: instructor.id,
      name: courseData.name || 'Mata Kuliah Praktik Baru',
      code: courseData.code || 'MES-100',
      academicYear: courseData.academicYear || '2026/2027',
      semester: courseData.semester || 'Ganjil',
      slug: courseData.slug || `praktik-${Date.now()}`,
      description: courseData.description || '',
      department: courseData.department || 'Perawatan dan Perbaikan Mesin',
      status: 'PUBLISHED',
      createdAt: getWitaDateString(),
      subCpmks: courseData.subCpmks || [
        { id: `cpmk-${Date.now()}-1`, code: 'Sub-CPMK 1', description: 'Mampu memahami dan menerapkan prosedur praktik sesuai standar industri.' }
      ],
      qualityRubrics: courseData.qualityRubrics || [
        { id: `rub-q-${Date.now()}`, name: 'Ketepatan Prosedur & Hasil Kerja', category: 'QUALITY', description: 'Standar kualitas pekerjaan teknis dan toleransi hasil' },
        { id: `rub-s-${Date.now()}`, name: 'Sikap & Kedisiplinan K3', category: 'ATTITUDE', description: 'Kepatuhan APD, ketepatan waktu, dan tanggung jawab lingkungan' },
        { id: `rub-c-${Date.now()}`, name: 'Inisiatif & Kreativitas', category: 'CREATIVITY', description: 'Kemampuan eksplorasi solusi dan pemecahan kendala' },
        { id: `rub-r-${Date.now()}`, name: 'Laporan Praktik', category: 'REPORT', description: 'Sistematika penulisan laporan dan kelengkapan data pengukuran' },
      ]
    };

    setCourses(prev => [newCourse, ...prev]);
    setActiveCourseId(newCourse.id);
    void ApiService.saveCourse(newCourse).then(saved => {
      setCourses(prev => prev.map(course => course.id === newCourse.id ? saved : course));
      setActiveCourseId(saved.id);
    }).catch(error => {
      showToast('Sinkronisasi Gagal', `Mata kuliah tersimpan lokal, tetapi gagal dikirim ke Supabase: ${error.message}`, 'error');
    });
    showToast('Mata Kuliah Dibuat', `Mata Kuliah "${newCourse.name}" berhasil dibuat dan siap digunakan.`, 'success');
    return newCourse;
  };

  const copyCourse = (sourceCourseId: string, newName: string, academicYear: string, semester: 'Ganjil' | 'Genap'): Course => {
    const source = courses.find(c => c.id === sourceCourseId);
    if (!source) throw new Error('Course not found');

    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCourse: Course = {
      ...source,
      id: newEntityId('course'),
      name: newName,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      academicYear,
      semester,
      createdAt: getWitaDateString(),
      status: 'PUBLISHED'
    };

    setCourses(prev => [newCourse, ...prev]);
    setActiveCourseId(newCourse.id);
    void ApiService.saveCourse(newCourse).then(saved => {
      setCourses(prev => prev.map(course => course.id === newCourse.id ? saved : course));
      setActiveCourseId(saved.id);
    }).catch(error => {
      showToast('Sinkronisasi Gagal', `Salinan mata kuliah tersimpan lokal, tetapi gagal dikirim ke Supabase: ${error.message}`, 'error');
    });
    showToast('Mata Kuliah Disalin', `Struktur "${source.name}" berhasil disalin ke "${newCourse.name}".`, 'success');
    return newCourse;
  };

  const updateCourse = async (updated: Course) => {
    const saved = await ApiService.saveCourse(updated);
    const idMap = new Map([
      ...updated.subCpmks.map((s, i) => [s.id, saved.subCpmks[i].id] as const),
      ...updated.qualityRubrics.map((r, i) => [r.id, saved.qualityRubrics[i].id] as const),
    ]);
    const coursePeriodIds = new Set(periods.filter(p => p.courseId === saved.id).map(p => p.id));
    // Keep locally stored assessment scores attached when legacy IDs become UUIDs.
    setAssessments(prev => prev.map(a => {
      if (!coursePeriodIds.has(a.periodId)) return a;
      const remap = (scores: Assessment['qualityScores']) => scores?.map(s => ({
        ...s, criterionId: idMap.get(s.criterionId) || s.criterionId,
      }));
      return { ...a, qualityScores: remap(a.qualityScores), attitudeScores: remap(a.attitudeScores),
        creativityScores: remap(a.creativityScores), reportScores: remap(a.reportScores) };
    }));
    setCourses(prev => prev.map(c => c.id === saved.id ? saved : c));
  };

  const deleteCourse = (courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    if (activeCourseId === courseId) {
      const remaining = courses.filter(c => c.id !== courseId);
      if (remaining.length > 0) {
        setActiveCourseId(remaining[0].id);
      }
    }
    showToast('Mata Kuliah Dihapus', 'Mata kuliah dan relasi terkait telah dihapus.', 'info');
  };

  // Instructor Period Operations
  const createPeriod = (periodData: Partial<PracticePeriod>): PracticePeriod => {
    const courseId = periodData.courseId || activeCourseId;
    const existing = periods.filter(p => p.courseId === courseId);
    const periodNumber = existing.length + 1;
    const startDate = periodData.startDate || getWitaDateString();
    const endDate = periodData.endDate || computePeriodEndDate(startDate, 5);
    const status = computePeriodStatus(startDate, endDate);

    const newPeriod: PracticePeriod = {
      id: newEntityId('period'),
      courseId,
      name: periodData.name || `Minggu Praktik ke-${periodNumber} (${startDate})`,
      periodNumber,
      startDate,
      endDate,
      status,
      autoStatus: periodData.autoStatus ?? true,
      finalProjectDriveUrl: periodData.finalProjectDriveUrl || undefined,
      finalProjectDescription: periodData.finalProjectDescription || undefined,
      finalProjectEnabled: periodData.finalProjectEnabled === true,
      createdAt: getWitaDateString()
    };

    setPeriods(prev => {
      const next = [...prev, newPeriod];
      void ApiService.savePeriod(newPeriod).catch(error => {
        showToast('Sinkronisasi Gagal', `Periode belum tersimpan ke Supabase: ${error.message}`, 'error');
      });
      return next;
    });

    // Copy learning units from the template or previous period if available
    const templateUnits = learningUnits.filter(u => u.periodId === existing[0]?.id);
    if (templateUnits.length > 0) {
      const copiedUnits: LearningUnit[] = templateUnits.map(u => ({
        ...u,
        id: `unit-${Date.now()}-${Math.random()}`,
        periodId: newPeriod.id,
        materials: u.materials.map(m => ({ ...m, id: newEntityId('mat') })),
        assignment: u.assignment ? { ...u.assignment, id: newEntityId('assign'), periodId: newPeriod.id } : undefined
      }));
      setLearningUnits(prev => [...prev, ...copiedUnits]);
    }

    showToast('Periode Dibuat', `Periode "${newPeriod.name}" berhasil dibuat (${newPeriod.startDate} s/d ${newPeriod.endDate}) [Status: ${newPeriod.status}].`, 'success');
    return newPeriod;
  };

  const duplicatePeriod = (sourcePeriodId: string, newName: string, startDate: string): PracticePeriod => {
    const source = periods.find(p => p.id === sourcePeriodId);
    if (!source) throw new Error('Source period not found');

    const endDate = computePeriodEndDate(startDate, 5);
    const status = computePeriodStatus(startDate, endDate);
    const newPeriod: PracticePeriod = {
      ...source,
      id: newEntityId('period'),
      name: newName,
      startDate,
      endDate,
      status,
      autoStatus: true,
      createdAt: getWitaDateString()
    };

    // Duplicate learning units
    const sourceUnits = learningUnits.filter(u => u.periodId === sourcePeriodId);
    const duplicatedUnits: LearningUnit[] = sourceUnits.map(u => ({
      ...u,
      id: `unit-${Date.now()}-${Math.random()}`,
      periodId: newPeriod.id,
      materials: u.materials.map(m => ({ ...m, id: newEntityId('mat') })),
      assignment: u.assignment ? { ...u.assignment, id: newEntityId('assign'), periodId: newPeriod.id } : undefined
    }));

    setPeriods(prev => {
      const next = [...prev, newPeriod];
      void ApiService.savePeriod(newPeriod).catch(error => {
        showToast('Sinkronisasi Gagal', `Periode belum tersimpan ke Supabase: ${error.message}`, 'error');
      });
      return next;
    });
    setLearningUnits(prev => [...prev, ...duplicatedUnits]);
    showToast('Periode Diduplikasi', `Struktur materi dan tugas dari "${source.name}" berhasil disalin ke periode baru.`, 'success');
    return newPeriod;
  };

  const updatePeriod = (updated: PracticePeriod) => {
    const isAuto = updated.autoStatus !== false;
    const status = isAuto
      ? computePeriodStatus(updated.startDate, updated.endDate)
      : (updated.status || computePeriodStatus(updated.startDate, updated.endDate));
    const finalUpdated = { ...updated, status, autoStatus: isAuto };

    setPeriods(prev => {
      let nextList: PracticePeriod[];
      if (finalUpdated.status === 'ACTIVE') {
        nextList = prev.map(p => {
          if (p.id === finalUpdated.id) return finalUpdated;
          if (p.courseId === finalUpdated.courseId && p.status === 'ACTIVE') {
            return { ...p, status: 'UPCOMING' };
          }
          return p;
        });
      } else {
        nextList = prev.map(p => p.id === finalUpdated.id ? finalUpdated : p);
      }
      void ApiService.savePeriodsBulk(nextList).catch(error => {
        showToast('Sinkronisasi Gagal', `Perubahan periode belum tersimpan ke Supabase: ${error.message}`, 'error');
      });
      return nextList;
    });
    showToast('Periode Diperbarui', `Periode "${finalUpdated.name}" berhasil diperbarui (${finalUpdated.startDate} s/d ${finalUpdated.endDate}) [Status: ${finalUpdated.status}].`, 'success');
  };

  const syncAllPeriodsStatus = async (): Promise<{ changedCount: number; todayStr: string }> => {
    const netInfo = await fetchInternetNetworkTime(true).catch(() => null);
    const todayStr = netInfo?.dateString || getRealtimeWitaDateString();
    let changedCount = 0;

    const nextPeriods = periods.map(p => {
      const autoComputed = computePeriodStatus(p.startDate, p.endDate, todayStr);
      if (p.status !== autoComputed) {
        changedCount++;
        return { ...p, status: autoComputed, autoStatus: true };
      }
      return p;
    });

    if (changedCount > 0) {
      setPeriods(nextPeriods);
      await ApiService.savePeriodsBulk(nextPeriods);
      showToast(
        'Sinkronisasi Realtime Internet Berhasil',
        `${changedCount} status gelombang otomatis diperbarui sesuai tanggal hari ini (${todayStr} WITA).`,
        'success'
      );
    } else {
      showToast(
        'Status Gelombang Sudah Akurat',
        `Semua status gelombang telah tersinkronisasi dengan waktu internet realtime (${todayStr} WITA).`,
        'info'
      );
    }

    return { changedCount, todayStr };
  };

  const deletePeriod = (periodId: string) => {
    setPeriods(prev => prev.filter(p => p.id !== periodId));
    setParticipants(prev => prev.filter(p => p.periodId !== periodId));
    setLearningUnits(prev => prev.filter(u => u.periodId !== periodId));
    void ApiService.deletePeriod(periodId).catch(error => {
      showToast('Sinkronisasi Gagal', `Periode hanya terhapus di layar: ${error.message}`, 'error');
    });
    showToast('Periode Dihapus', 'Periode praktik dan relasi terkait berhasil dihapus.', 'info');
  };

  // Add Participants Bulk with NIM lookup
  const addParticipantsBulk = (periodId: string, nims: string[]) => {
    const existingParticipants = participants.filter(p => p.periodId === periodId);
    const existingStudentIds = new Set(existingParticipants.map(p => p.studentId));

    let added = 0;
    let duplicates = 0;
    const notFound: string[] = [];
    const newParticipants: PracticeParticipant[] = [];
    const newAttendances: AttendanceRecord[] = [];

    const cleanNims = Array.from(new Set(nims.map(n => n.trim()).filter(Boolean)));

    for (const nim of cleanNims) {
      const student = students.find(s => s.nim.toLowerCase() === nim.toLowerCase());
      if (!student) {
        notFound.push(nim);
        continue;
      }
      if (existingStudentIds.has(student.id)) {
        duplicates++;
        continue;
      }

      const participant: PracticeParticipant = {
        id: newEntityId('part'),
        periodId,
        studentId: student.id,
        student,
        enrolledAt: getWitaDateString(),
        progressStatus: 'NOT_STARTED',
        finalProjectConfirmed: false
      };
      newParticipants.push(participant);
      existingStudentIds.add(student.id);
      added++;

      // Default attendance: 100% Hadir for all 5 days (PRD Section 54)
      const attRecord: AttendanceRecord = {
        id: newEntityId('att'),
        periodId,
        studentId: student.id,
        day1: 'HADIR',
        day2: 'HADIR',
        day3: 'HADIR',
        day4: 'HADIR',
        day5: 'HADIR',
        percentage: 100,
        isEligible: true,
        updatedAt: getWitaDateString()
      };
      newAttendances.push(attRecord);
    }

    if (newParticipants.length > 0) {
      setParticipants(prev => [...prev, ...newParticipants]);
      setAttendance(prev => [...prev, ...newAttendances]);
      void Promise.all(newParticipants.map(participant => ApiService.saveParticipant(participant)))
        .then(() => Promise.all(newAttendances.map(record => ApiService.saveAttendanceRecord(record))))
        .catch(error => {
          showToast('Sinkronisasi Gagal', `Peserta ditambahkan di layar, tetapi gagal dikirim ke Supabase: ${error.message}`, 'error');
        });
    }

    showToast('Peserta Ditambahkan', `${added} mahasiswa berhasil didaftarkan. (${duplicates} duplikat, ${notFound.length} NIM tidak ditemukan)`, added > 0 ? 'success' : 'warning');
    return { added, duplicates, notFound };
  };

  const updateParticipant = (updatedParticipant: PracticeParticipant) => {
    setParticipants(prev => prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p));
    void ApiService.saveParticipant(updatedParticipant).catch(error => {
      showToast('Sinkronisasi Gagal', `Perubahan peserta belum tersimpan ke Supabase: ${error.message}`, 'error');
    });
  };

  const removeParticipant = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    void ApiService.deleteParticipant(participantId).catch(error => {
      showToast('Sinkronisasi Gagal', `Peserta hanya terhapus di layar: ${error.message}`, 'error');
    });
    if (participant) {
      setAttendance(prev => prev.filter(a => !(a.periodId === participant.periodId && a.studentId === participant.studentId)));
      void ApiService.deleteAttendanceRecord(participant.periodId, participant.studentId).catch(error => {
        showToast('Sinkronisasi Gagal', `Presensi peserta belum terhapus dari Supabase: ${error.message}`, 'error');
      });
    }
    showToast('Peserta Dihapus', 'Peserta telah dikeluarkan dari periode ini.', 'info');
  };

  // Master Student Management
  const addStudent = (studentData: Omit<Student, 'id' | 'createdAt'>): Student => {
    const existing = students.find(s => s.nim.toLowerCase() === studentData.nim.toLowerCase());
    if (existing) {
      showToast('NIM Duplikat', `Mahasiswa dengan NIM ${studentData.nim} sudah ada di Database Mahasiswa.`, 'error');
      throw new Error('Duplicate NIM');
    }
    const newStudent = StorageService.addStudent(studentData);
    setStudents(StorageService.getStudents());
    void ApiService.saveStudent(newStudent, instructor.id).catch(error => {
      showToast('Sinkronisasi Gagal', `Mahasiswa tersimpan lokal, tetapi gagal dikirim ke Supabase: ${error.message}`, 'error');
    });
    showToast('Mahasiswa Ditambahkan', `${newStudent.name} (${newStudent.nim}) berhasil disimpan.`, 'success');
    return newStudent;
  };

  const updateStudent = (updated: Student) => {
    const list = students.map(s => s.id === updated.id ? updated : s);
    setStudents(list);
    void ApiService.saveStudent(updated, instructor.id).catch(error => {
      showToast('Sinkronisasi Gagal', `Perubahan mahasiswa tersimpan lokal, tetapi gagal dikirim ke Supabase: ${error.message}`, 'error');
    });
    showToast('Data Mahasiswa Diperbarui', `Data ${updated.name} berhasil diperbarui.`, 'success');
  };

  const deleteStudent = (studentId: string) => {
    const list = students.filter(s => s.id !== studentId);
    setStudents(list);
    void ApiService.deleteStudent(studentId).catch(error => {
      showToast('Sinkronisasi Gagal', `Penghapusan lokal berhasil, tetapi gagal diperbarui di Supabase: ${error.message}`, 'error');
    });
    showToast('Mahasiswa Dihapus', 'Data mahasiswa telah dihapus dari Master.', 'info');
  };

  const importStudentsCSV = (parsedStudents: Omit<Student, 'id' | 'createdAt'>[]) => {
    const existingNims = new Set(students.map(s => s.nim.toLowerCase()));
    let importedCount = 0;
    let duplicateCount = 0;
    const newItems: Student[] = [];

    for (const item of parsedStudents) {
      if (!item.nim || !item.name) continue;
      if (existingNims.has(item.nim.toLowerCase())) {
        duplicateCount++;
        continue;
      }
      existingNims.add(item.nim.toLowerCase());
      newItems.push({
        ...item,
        id: newEntityId('student'),
        createdAt: getWitaDateString()
      });
      importedCount++;
    }

    if (newItems.length > 0) {
      const updated = [...newItems, ...students];
      setStudents(updated);
      void Promise.all(newItems.map(student => ApiService.saveStudent(student, instructor.id))).catch(error => {
        showToast('Sinkronisasi Gagal', `Sebagian mahasiswa tersimpan lokal, tetapi gagal dikirim ke Supabase: ${error.message}`, 'error');
      });
    }

    showToast('Import CSV Selesai', `${importedCount} mahasiswa baru berhasil diimpor. (${duplicateCount} duplikat diabaikan)`, 'success');
    return { importedCount, duplicateCount };
  };

  // Learning Unit CRUD
  const createLearningUnit = (unitData: Partial<LearningUnit>): LearningUnit => {
    const periodUnits = learningUnits.filter(u => u.periodId === unitData.periodId);
    const unitNumber = periodUnits.length + 1;

    const newUnit: LearningUnit = {
      id: newEntityId('unit'),
      periodId: unitData.periodId || '',
      unitNumber,
      title: unitData.title || `Unit ${unitNumber}: Judul Materi Praktik`,
      description: unitData.description || '',
      materials: unitData.materials || [],
      assignment: unitData.assignment,
      countdownEnabled: unitData.countdownEnabled,
      countdownMinutes: unitData.countdownMinutes,
      countdownStartedAt: unitData.countdownStartedAt
    };

    setLearningUnits(prev => [...prev, newUnit]);
    ApiService.saveLearningUnit(newUnit).then(savedUnit => {
      if (savedUnit.id !== newUnit.id) {
        setLearningUnits(prev => prev.map(unit => unit.id === newUnit.id ? savedUnit : unit));
      }
    }).catch(error => {
      console.error('Error syncing learning unit:', error);
      showToast('Sinkronisasi Gagal', `Unit belum tersimpan ke Supabase. ${error?.message || 'Periksa koneksi dan hak akses.'}`, 'error');
    });
    showToast('Unit Pembelajaran Dibuat', `Unit ${newUnit.unitNumber} berhasil ditambahkan.`, 'success');
    return newUnit;
  };

  const updateLearningUnit = (updated: LearningUnit) => {
    setLearningUnits(prev => prev.map(u => u.id === updated.id ? updated : u));
    ApiService.saveLearningUnit(updated).then(savedUnit => {
      // Reconcile the optimistic state with the canonical backend response,
      // including database IDs and the assignment/material payload.
      setLearningUnits(prev => prev.map(unit => (
        unit.id === updated.id || unit.id === savedUnit.id ? savedUnit : unit
      )));
      showToast('Unit Diperbarui', `Unit ${savedUnit.unitNumber} berhasil disinkronkan ke Supabase.`, 'success');
    }).catch(error => {
      console.error('Error syncing learning unit:', error);
      showToast('Sinkronisasi Gagal', `Perubahan tugas belum tersimpan ke Supabase. ${error?.message || 'Periksa koneksi dan hak akses.'}`, 'error');
    });
  };

  const deleteLearningUnit = (unitId: string) => {
    setLearningUnits(prev => prev.filter(u => u.id !== unitId));
    ApiService.deleteLearningUnit(unitId).catch(error => {
      console.error('Error deleting learning unit:', error);
      showToast('Penghapusan Gagal', 'Unit belum berhasil dihapus dari Supabase.', 'error');
    });
    showToast('Unit Dihapus', 'Unit pembelajaran telah dihapus.', 'info');
  };

  const copyLearningUnits = (
    sourceUnitIds: string[],
    targetPeriodIds: string[],
    overwrite: boolean = false
  ): { copiedCount: number; targetCount: number } => {
    const selectedSourceUnits = learningUnits
      .filter(u => sourceUnitIds.includes(u.id))
      .sort((a, b) => a.unitNumber - b.unitNumber);

    if (selectedSourceUnits.length === 0 || targetPeriodIds.length === 0) {
      showToast('Peringatan', 'Pilih minimal satu modul dan satu minggu/periode tujuan.', 'warning');
      return { copiedCount: 0, targetCount: 0 };
    }

    const newUnitsToInsert: LearningUnit[] = [];

    targetPeriodIds.forEach(targetPeriodId => {
      const existingUnitsInTarget = overwrite
        ? []
        : learningUnits.filter(u => u.periodId === targetPeriodId);

      let nextUnitNumber = existingUnitsInTarget.length + 1;

      selectedSourceUnits.forEach(srcUnit => {
        const newUnitId = `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const clonedMaterials: LearningMaterial[] = srcUnit.materials.map(m => ({
          ...m,
          id: newEntityId('mat'),
          unitId: newUnitId
        }));

        const clonedAssignment: Assignment | undefined = srcUnit.assignment
          ? {
              ...srcUnit.assignment,
              id: newEntityId('assign'),
              unitId: newUnitId,
              periodId: targetPeriodId
            }
          : undefined;

        newUnitsToInsert.push({
          id: newUnitId,
          periodId: targetPeriodId,
          unitNumber: nextUnitNumber++,
          title: srcUnit.title,
          description: srcUnit.description,
          materials: clonedMaterials,
          assignment: clonedAssignment,
          countdownEnabled: srcUnit.countdownEnabled,
          countdownMinutes: srcUnit.countdownMinutes,
          countdownStartedAt: srcUnit.countdownStartedAt
        });
      });
    });

    setLearningUnits(prev => {
      let filtered = prev;
      if (overwrite) {
        filtered = prev.filter(u => !targetPeriodIds.includes(u.periodId));
      }
      return [...filtered, ...newUnitsToInsert];
    });

    showToast(
      'Modul Berhasil Disalin',
      `${selectedSourceUnits.length} modul berhasil disalin ke ${targetPeriodIds.length} minggu tujuan.`,
      'success'
    );

    return {
      copiedCount: selectedSourceUnits.length,
      targetCount: targetPeriodIds.length
    };
  };

  // Attendance Matrix Update & Realtime Sync
  const updateAttendanceCell = (periodId: string, studentId: string, day: 'day1' | 'day2' | 'day3' | 'day4' | 'day5', status: AttendanceStatus) => {
    setAttendance(prev => {
      const existing = prev.find(a => a.periodId === periodId && a.studentId === studentId);
      const base = existing || {
        id: `att-${Date.now()}`,
        periodId,
        studentId,
        day1: 'HADIR',
        day2: 'HADIR',
        day3: 'HADIR',
        day4: 'HADIR',
        day5: 'HADIR',
        percentage: 100,
        isEligible: true,
        updatedAt: getRealtimeWitaDateString()
      };

      const updatedRecord = { ...base, [day]: status };
      const stats = computeAttendanceStats(updatedRecord);
      const finalRecord: AttendanceRecord = {
        ...updatedRecord,
        percentage: stats.percentage,
        isEligible: stats.isEligible,
        updatedAt: getRealtimeWitaDateString()
      };

      ApiService.saveAttendanceRecord(finalRecord);
      const filtered = prev.filter(a => !(a.periodId === periodId && a.studentId === studentId));
      return [...filtered, finalRecord];
    });
  };

  // Auto-initialize 100% attendance for all participants in a period if not yet created
  const autoInitializeAttendanceForPeriod = async (periodId: string) => {
    const periodParts = participants.filter(p => p.periodId === periodId);
    if (periodParts.length === 0) return;

    const todayStr = getRealtimeWitaDateString();
    let addedCount = 0;
    const newRecords: AttendanceRecord[] = [];

    setAttendance(prev => {
      const currentList = [...prev];
      for (const part of periodParts) {
        const exists = currentList.find(a => a.periodId === periodId && a.studentId === part.studentId);
        if (!exists) {
          const rec: AttendanceRecord = {
            id: `att-${Date.now()}-${Math.random()}`,
            periodId,
            studentId: part.studentId,
            day1: 'HADIR',
            day2: 'HADIR',
            day3: 'HADIR',
            day4: 'HADIR',
            day5: 'HADIR',
            percentage: 100,
            isEligible: true,
            updatedAt: todayStr
          };
          currentList.push(rec);
          newRecords.push(rec);
          addedCount++;
        }
      }
      return currentList;
    });

    if (newRecords.length > 0) {
      await ApiService.saveAttendanceBulk(newRecords);
    }
  };

  // Set or reset all participants of a period to a specific status (e.g. 100% HADIR)
  const setAllPeriodAttendanceStatus = async (periodId: string, status: AttendanceStatus = 'HADIR') => {
    const periodParts = participants.filter(p => p.periodId === periodId);
    if (periodParts.length === 0) return;

    const todayStr = getRealtimeWitaDateString();
    const updatedRecords: AttendanceRecord[] = periodParts.map(part => {
      const existing = attendance.find(a => a.periodId === periodId && a.studentId === part.studentId);
      const base = existing || {
        id: `att-${Date.now()}-${Math.random()}`,
        periodId,
        studentId: part.studentId,
        day1: status,
        day2: status,
        day3: status,
        day4: status,
        day5: status,
        percentage: status === 'HADIR' ? 100 : 0,
        isEligible: status === 'HADIR',
        updatedAt: todayStr
      };

      const updated = {
        ...base,
        day1: status,
        day2: status,
        day3: status,
        day4: status,
        day5: status,
      };
      const stats = computeAttendanceStats(updated);
      return {
        ...updated,
        percentage: stats.percentage,
        isEligible: stats.isEligible,
        updatedAt: todayStr
      };
    });

    setAttendance(prev => {
      const filtered = prev.filter(a => a.periodId !== periodId);
      return [...filtered, ...updatedRecords];
    });

    await ApiService.saveAttendanceBulk(updatedRecords);
    showToast(
      'Presensi Berhasil Direset',
      `Presensi seluruh peserta (${periodParts.length} mahasiswa) disetel ke 100% Hadir secara otomatis.`,
      'success'
    );
  };

  // Assessment & Grading
  const saveAssessment = (assessment: Assessment) => {
    setAssessments(prev => {
      const filtered = prev.filter(a => !(a.periodId === assessment.periodId && a.studentId === assessment.studentId));
      return [...filtered, assessment];
    });

    // Update participant progress status to ASSESSED if not already PUBLISHED
    setParticipants(prev => prev.map(p => {
      if (p.periodId === assessment.periodId && p.studentId === assessment.studentId) {
        return {
          ...p,
          progressStatus: p.progressStatus === 'PUBLISHED' ? 'PUBLISHED' : 'ASSESSED'
        };
      }
      return p;
    }));

    ApiService.saveAssessment(assessment).catch(error => {
      console.error('Error syncing assessment:', error);
      showToast('Sinkronisasi Nilai Gagal', 'Nilai tersimpan sementara di halaman ini, tetapi belum masuk Supabase.', 'error');
    });
  };

  // Publish Grade with Attendance Blockage Check (PRD Section 56 & 58)
  const publishPeriodGrades = (periodId: string) => {
    const periodParticipants = participants.filter(p => p.periodId === periodId);
    let publishedCount = 0;
    let blockedCount = 0;

    const updatedAssessments = assessments.map(a => {
      if (a.periodId !== periodId) return a;

      // Check attendance
      const att = attendance.find(at => at.periodId === periodId && at.studentId === a.studentId);
      const isEligible = att ? att.isEligible : true;

      // If attendance is <75%, check if all remedials are LULUS
      let canPublish = isEligible;
      if (!isEligible) {
        const studentRemedials = remedials.filter(r => r.periodId === periodId && r.studentId === a.studentId);
        if (studentRemedials.length > 0 && studentRemedials.every(r => r.status === 'LULUS')) {
          canPublish = true;
        }
      }

      if (canPublish) {
        publishedCount++;
        return { ...a, isPublished: true, publishedAt: `${getWitaDateString()} WITA` };
      } else {
        blockedCount++;
        return { ...a, isPublished: false };
      }
    });

    setAssessments(updatedAssessments);

    // Persist the published flag and timestamp for every assessment that was
    // actually published, so the student portal sees the same state.
    updatedAssessments
      .filter(assessment => assessment.periodId === periodId && assessment.isPublished)
      .forEach(assessment => {
        ApiService.saveAssessment(assessment).catch(error => {
          console.error('Error syncing published assessment:', error);
          showToast('Sinkronisasi Publikasi Gagal', 'Sebagian status publikasi belum tersimpan ke Supabase.', 'error');
        });
      });

    // Update participant statuses
    setParticipants(prev => prev.map(p => {
      if (p.periodId === periodId) {
        const ass = updatedAssessments.find(a => a.studentId === p.studentId);
        if (ass?.isPublished) {
          return { ...p, progressStatus: 'PUBLISHED' };
        }
      }
      return p;
    }));

    if (publishedCount === 0 && blockedCount === 0) {
      showToast('Belum Ada Nilai Tersimpan', 'Tidak ada assessment pada periode ini yang siap dipublikasikan. Simpan penilaian mahasiswa terlebih dahulu.', 'warning');
    } else if (blockedCount > 0) {
      showToast('Publikasi Sebagian Berhasil', `${publishedCount} nilai dipublikasikan. ${blockedCount} nilai ditahan karena kehadiran <75% belum tuntas tugas remedial.`, 'warning');
    } else {
      showToast('Nilai Dipublikasikan', `Seluruh nilai peserta periode ini (${publishedCount} mahasiswa) telah dipublikasikan.`, 'success');
    }

    return { publishedCount, blockedCount };
  };

  const unpublishPeriodGrades = (periodId: string) => {
    const updatedAssessments = assessments.map(a => a.periodId === periodId ? { ...a, isPublished: false } : a);
    setAssessments(updatedAssessments);
    updatedAssessments.filter(a => a.periodId === periodId).forEach(assessment => {
      ApiService.saveAssessment(assessment).catch(error => console.error('Error syncing unpublished assessment:', error));
    });
    setParticipants(prev => prev.map(p => {
      if (p.periodId === periodId && p.progressStatus === 'PUBLISHED') {
        return { ...p, progressStatus: 'ASSESSED' };
      }
      return p;
    }));
    showToast('Publikasi Ditarik', 'Nilai periode ini disembunyikan kembali dari mahasiswa.', 'info');
  };

  // Remedial Management
  const createRemedialTask = async (data: Partial<RemedialAssignment>): Promise<RemedialAssignment> => {
    if (!data.periodId || !data.studentId || !data.deadline) throw new Error('Lengkapi peserta, periode dan batas waktu remedial.');
    const end = submissionDeadline(data.deadline);
    if (end === null || !Number.isFinite(end)) throw new Error('Format batas waktu remedial tidak valid.');
    const newTask: RemedialAssignment = {
      id: crypto.randomUUID(),
      periodId: data.periodId || '',
      studentId: data.studentId || '',
      title: data.title || 'Tugas Tambahan Pengganti Kehadiran',
      description: data.description || '',
      deadline: new Date(end).toISOString(),
      status: 'PENDING_SUBMISSION'
    };

    await ApiService.saveRemedialDefinition(newTask);
    setRemedials(prev => [...prev, newTask]);
    showToast('Tugas Remedial Dibuat', `Tugas tambahan untuk mahasiswa berhasil ditambahkan.`, 'success');
    return newTask;
  };

  const gradeRemedialTask = async (remedialId: string, status: 'LULUS' | 'BELUM_LULUS') => {
    let affectedStudentId = '';
    let affectedPeriodId = '';

    const updatedList = remedials.map(r => {
      if (r.id === remedialId) {
        affectedStudentId = r.studentId;
        affectedPeriodId = r.periodId;
        return {
          ...r,
          status,
          reviewedAt: new Date().toISOString()
        };
      }
      return r;
    });

    const updatedTask = updatedList.find(r => r.id === remedialId);
    if (!updatedTask) throw new Error('Tugas remedial tidak ditemukan.');
    await ApiService.saveRemedialDefinition(updatedTask);
    setRemedials(updatedList);

    // If status === 'LULUS', check if all remedials for this student are now 'LULUS' -> Auto-publish grade (PRD Section 58)
    if (status === 'LULUS' && affectedStudentId && affectedPeriodId) {
      const studentRemedials = updatedList.filter(r => r.periodId === affectedPeriodId && r.studentId === affectedStudentId);
      const allPassed = studentRemedials.every(r => r.status === 'LULUS');

      if (allPassed) {
        const published = assessments.map(a => a.periodId === affectedPeriodId && a.studentId === affectedStudentId ? {...a, isPublished: true, publishedAt: new Date().toISOString()} : a);
        await Promise.all(published.filter(a => a.periodId === affectedPeriodId && a.studentId === affectedStudentId).map(a => ApiService.saveAssessment(a)));
        setAssessments(published);

        setParticipants(prev => prev.map(p => {
          if (p.periodId === affectedPeriodId && p.studentId === affectedStudentId) {
            return { ...p, progressStatus: 'PUBLISHED' };
          }
          return p;
        }));

        showToast('Remedial Tuntas & Nilai Terbit', 'Seluruh tugas remedial LULUS. Nilai akhir mahasiswa otomatis dipublikasikan!', 'success');
        return;
      }
    }

    showToast('Status Remedial Disimpan', `Status tugas remedial diubah menjadi: ${status}.`, 'info');
  };

  const saveCustomFeedbackRules = (rules: FeedbackRule[]) => {
    setFeedbackRules(rules);
    showToast('Aturan Feedback Disimpan', 'Konfigurasi rentang nilai dan template pesan feedback berhasil diperbarui.', 'success');
  };

  const reviewSubmission = async (submissionId: string, status: 'REVISION_REQUIRED' | 'ACCEPTED', feedback: string) => {
    if (!isInstructorLoggedIn) throw new Error('Masuk sebagai instruktur terlebih dahulu.');
    const current = submissions.find(item => item.id === submissionId);
    if (!current) throw new Error('Berkas mahasiswa tidak ditemukan.');
    if (status === 'REVISION_REQUIRED' && !feedback.trim()) throw new Error('Tuliskan instruksi revisi untuk mahasiswa.');

    const updated: Submission = {
      ...current,
      status,
      reviewFeedback: feedback.trim() || undefined,
      reviewedAt: new Date().toISOString(),
      revisionNumber: current.revisionNumber || 1,
    };
    const saved = await ApiService.reviewSubmission(updated);
    setSubmissions(previous => previous.map(item => item.id === saved.id ? saved : item));
    showToast(
      status === 'ACCEPTED' ? 'Berkas Diterima' : 'Revisi Diminta',
      status === 'ACCEPTED' ? 'Status penerimaan tugas sudah terlihat oleh mahasiswa.' : 'Catatan revisi sudah dikirim ke dashboard mahasiswa.',
      status === 'ACCEPTED' ? 'success' : 'info'
    );
  };

  const createAnnouncement = async (data: Omit<Announcement, 'id' | 'publishedAt'>): Promise<Announcement> => {
    const announcement: Announcement = {
      ...data,
      id: newEntityId('announcement'),
      publishedAt: new Date().toISOString(),
    };
    const saved = await ApiService.saveAnnouncement(announcement);
    setAnnouncements(prev => [saved, ...prev.filter(item => item.id !== announcement.id && item.id !== saved.id)]);
    showToast('Pengumuman Diterbitkan', 'Pengumuman sudah tampil pada dashboard mahasiswa.', 'success');
    return saved;
  };

  const deleteAnnouncement = async (announcementId: string): Promise<void> => {
    await ApiService.deleteAnnouncement(announcementId);
    setAnnouncements(prev => prev.filter(item => item.id !== announcementId));
    showToast('Pengumuman Dihapus', 'Pengumuman tidak lagi tampil pada dashboard mahasiswa.', 'info');
  };

  const resetToDefaultData = () => {
    StorageService.resetToDefault();
    setInstructor(StorageService.getInstructor());
    const resetProfile = StorageService.getInstructor();
    setInstructorDirectory(resetProfile?.id ? {
      [resetProfile.id]: {
        id: resetProfile.id,
        name: resetProfile.name,
        department: resetProfile.department,
        avatarUrl: resetProfile.avatarUrl,
      }
    } : {});
    setCourses(StorageService.getCourses());
    setActiveCourseIdState(StorageService.getActiveCourseId());
    setStudents(StorageService.getStudents());
    setPeriods(StorageService.getPeriods());
    setParticipants(StorageService.getParticipants());
    setLearningUnits(StorageService.getLearningUnits());
    setUnitProgress(StorageService.getUnitProgress());
    setSubmissions(StorageService.getSubmissions());
    setAttendance(StorageService.getAttendance());
    setAssessments(StorageService.getAssessments());
    setRemedials(StorageService.getRemedials());
    setFeedbackRules(StorageService.getFeedbackRules());
    setAnnouncements(StorageService.getAnnouncements());
    setStudentSessionState(null);
    showToast('Data Direset', 'Seluruh data demo Politeknik Sorowako berhasil dikembalikan ke keadaan awal.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        instructor,
        isInstructorLoggedIn,
        isLiveBackend,
        loginInstructor,
        signUpInstructor,
        logoutInstructor,
        activeCourseId,
        setActiveCourseId,
        activeCourse,
        courses,
        instructorDirectory,
        students,
        periods,
        participants,
        learningUnits,
        unitProgress,
        submissions,
        attendance,
        assessments,
        remedials,
        feedbackRules,
        announcements,
        studentSession,
        currentStudent,
        verifyStudentNim,
        createStudentPassword,
        loginStudentWithPassword,
        resetStudentPassword,
        setStudentIdentity,
        clearStudentIdentity,
        submitAssignment,
        reviewSubmission,
        confirmFinalProject,
        reviewFinalProject,
        submitStudentRemedial,
        createCourse,
        copyCourse,
        updateCourse,
        deleteCourse,
        createPeriod,
        duplicatePeriod,
        updatePeriod,
        deletePeriod,
        syncAllPeriodsStatus,
        addParticipantsBulk,
        updateParticipant,
        removeParticipant,
        addStudent,
        updateStudent,
        deleteStudent,
        importStudentsCSV,
        createLearningUnit,
        updateLearningUnit,
        deleteLearningUnit,
        copyLearningUnits,
        updateAttendanceCell,
        autoInitializeAttendanceForPeriod,
        setAllPeriodAttendanceStatus,
        saveAssessment,
        publishPeriodGrades,
        unpublishPeriodGrades,
        createRemedialTask,
        gradeRemedialTask,
        createAnnouncement,
        deleteAnnouncement,
        saveCustomFeedbackRules,
        resetToDefaultData,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
