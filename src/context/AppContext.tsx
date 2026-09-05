// Central React Context for Portal Praktik Poliwako

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  UserRole,
  InstructorProfile,
  Student,
  Course,
  PracticePeriod,
  PracticeParticipant,
  LearningUnit,
  UnitProgress,
  Submission,
  AttendanceRecord,
  AttendanceStatus,
  Assessment,
  RemedialAssignment,
  FeedbackRule,
} from '../types';
import { StorageService } from '../services/storageService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { ApiService } from '../services/apiService';
import { computeAttendanceStats, calculateWeightedFinalScore, getFeedbackForScore } from '../utils/gradeCalculators';
import { computePeriodEndDate, computePeriodStatus, getWitaDateString } from '../utils/dateUtils';

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

  // Student Session & Authentication
  studentSession: { studentId: string; courseSlug: string; periodId: string } | null;
  currentStudent: Student | null;
  verifyStudentNim: (nim: string, courseSlug?: string, periodId?: string) => {
    exists: boolean;
    student?: Student;
    isEnrolled: boolean;
    hasCreatedPassword: boolean;
    message?: string;
  };
  createStudentPassword: (studentId: string, password: string, courseSlug: string, periodId: string) => {
    success: boolean;
    message: string;
  };
  loginStudentWithPassword: (nim: string, password: string, courseSlug: string, periodId: string) => {
    success: boolean;
    message: string;
  };
  resetStudentPassword: (studentId: string) => void;
  setStudentIdentity: (studentId: string, courseSlug: string, periodId: string) => void;
  clearStudentIdentity: () => void;

  // Student Actions
  toggleUnitCompletion: (unitId: string) => void;
  submitAssignment: (assignmentId: string, fileName: string, fileUrl: string, fileSize: string) => void;
  confirmFinalProject: () => void;
  submitStudentRemedial: (remedialId: string, fileName: string, fileUrl: string) => void;

  // Instructor Actions
  createCourse: (course: Partial<Course>) => Course;
  copyCourse: (sourceCourseId: string, newName: string, academicYear: string, semester: 'Ganjil' | 'Genap') => Course;
  updateCourse: (course: Course) => void;
  deleteCourse: (courseId: string) => void;

  createPeriod: (period: Partial<PracticePeriod>) => PracticePeriod;
  duplicatePeriod: (sourcePeriodId: string, newName: string, startDate: string) => PracticePeriod;
  updatePeriod: (period: PracticePeriod) => void;
  deletePeriod: (periodId: string) => void;

  addParticipantsBulk: (periodId: string, nims: string[]) => { added: number; duplicates: number; notFound: string[] };
  removeParticipant: (participantId: string) => void;

  addStudent: (student: Omit<Student, 'id' | 'createdAt'>) => Student;
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  importStudentsCSV: (students: Omit<Student, 'id' | 'createdAt'>[]) => { importedCount: number; duplicateCount: number };

  createLearningUnit: (unit: Partial<LearningUnit>) => LearningUnit;
  updateLearningUnit: (unit: LearningUnit) => void;
  deleteLearningUnit: (unitId: string) => void;

  updateAttendanceCell: (periodId: string, studentId: string, day: 'day1' | 'day2' | 'day3' | 'day4' | 'day5', status: AttendanceStatus) => void;
  saveAssessment: (assessment: Assessment) => void;
  publishPeriodGrades: (periodId: string) => { publishedCount: number; blockedCount: number };
  unpublishPeriodGrades: (periodId: string) => void;

  createRemedialTask: (remedial: Partial<RemedialAssignment>) => RemedialAssignment;
  gradeRemedialTask: (remedialId: string, status: 'LULUS' | 'BELUM_LULUS') => void;

  saveCustomFeedbackRules: (rules: FeedbackRule[]) => void;
  resetToDefaultData: () => void;

  // Toast
  toasts: ToastInfo[];
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isLiveBackend = useMemo(() => isSupabaseConfigured(), []);
  const [isInstructorLoggedIn, setIsInstructorLoggedIn] = useState<boolean>(() => StorageService.isInstructorLoggedIn());
  const [role, setRole] = useState<UserRole>(() => (StorageService.isInstructorLoggedIn() ? 'INSTRUCTOR' : 'STUDENT'));
  const [instructor, setInstructor] = useState<InstructorProfile>(StorageService.getInstructor());
  const [courses, setCourses] = useState<Course[]>(StorageService.getCourses());
  const [activeCourseId, setActiveCourseIdState] = useState<string>(StorageService.getActiveCourseId());
  const [students, setStudents] = useState<Student[]>(StorageService.getStudents());
  const [periods, setPeriods] = useState<PracticePeriod[]>(StorageService.getPeriods());
  const [participants, setParticipants] = useState<PracticeParticipant[]>(StorageService.getParticipants());
  const [learningUnits, setLearningUnits] = useState<LearningUnit[]>(StorageService.getLearningUnits());
  const [unitProgress, setUnitProgress] = useState<UnitProgress[]>(StorageService.getUnitProgress());
  const [submissions, setSubmissions] = useState<Submission[]>(StorageService.getSubmissions());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(StorageService.getAttendance());
  const [assessments, setAssessments] = useState<Assessment[]>(StorageService.getAssessments());
  const [remedials, setRemedials] = useState<RemedialAssignment[]>(StorageService.getRemedials());
  const [feedbackRules, setFeedbackRules] = useState<FeedbackRule[]>(StorageService.getFeedbackRules());
  const [studentSession, setStudentSessionState] = useState(StorageService.getStudentSession());
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

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
    StorageService.setActiveCourseId(id);
  };

  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === activeCourseId) || courses[0] || null;
  }, [courses, activeCourseId]);

  const currentStudent = useMemo(() => {
    if (!studentSession) return null;
    return students.find(s => s.id === studentSession.studentId) || null;
  }, [studentSession, students]);

  // Auth
  const loginInstructor = async (email: string, password?: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
      showToast('Akses Ditolak', 'Hanya email berdomain @politekniksorowako.ac.id yang diizinkan untuk akun instruktur.', 'error');
      return { success: false, message: 'Domain email tidak diizinkan. Gunakan akun institusi Politeknik Sorowako.' };
    }

    // Try live Supabase authentication first if password provided
    if (ApiService.isLiveBackend() && password) {
      const { error } = await ApiService.loginInstructor(cleanEmail, password);
      if (error) {
        console.warn('Supabase auth notice:', error.message);
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          showToast('Login Gagal', 'Email atau password salah. Silakan periksa kembali.', 'error');
          return { success: false, message: 'Email atau password salah. Silakan periksa kembali.' };
        }
      }
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

    const updated: InstructorProfile = {
      ...instructor,
      id: 'inst-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '-'),
      email: cleanEmail,
      name: profileName,
      department,
      nip
    };
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

      const newProfile: InstructorProfile = {
        id: user?.id || 'inst-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '-'),
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
    showToast('Logout', 'Anda telah keluar dari Portal Instruktur.', 'info');
  };


  // Student Authentication & Identity Handlers
  const verifyStudentNim = (nim: string, courseSlug?: string, periodId?: string) => {
    const cleanNim = nim.trim().toLowerCase();
    if (!cleanNim) {
      return {
        exists: false,
        isEnrolled: false,
        hasCreatedPassword: false,
        message: 'Silakan masukkan NIM Anda.'
      };
    }

    const std = students.find(s => s.nim.toLowerCase() === cleanNim);
    if (!std) {
      return {
        exists: false,
        isEnrolled: false,
        hasCreatedPassword: false,
        message: `NIM "${nim.trim()}" tidak terdaftar dalam pangkalan data mahasiswa Politeknik Sorowako.`
      };
    }

    const isEnrolled = periodId ? participants.some(p => p.periodId === periodId && p.studentId === std.id) : true;
    const hasCreatedPassword = Boolean(std.hasCreatedPassword || (std.password && std.password.length > 0));

    return {
      exists: true,
      student: std,
      isEnrolled,
      hasCreatedPassword,
      message: undefined
    };
  };

  const createStudentPassword = (studentId: string, password: string, courseSlug: string, periodId: string) => {
    const std = students.find(s => s.id === studentId);
    if (!std) {
      return { success: false, message: 'Data mahasiswa tidak ditemukan.' };
    }
    if (!password || password.trim().length < 4) {
      return { success: false, message: 'Password harus minimal 4 karakter.' };
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

    // Auto enroll in active period if not yet participant
    setParticipants(prev => {
      const exists = prev.some(p => p.periodId === periodId && p.studentId === studentId);
      if (!exists) {
        const newPart: PracticeParticipant = {
          id: `part-${Date.now()}`,
          periodId,
          studentId: std.id,
          student: { ...std, password: trimmedPassword, hasCreatedPassword: true },
          enrolledAt: new Date().toISOString().split('T')[0],
          progressStatus: 'IN_PROGRESS',
          finalProjectConfirmed: false
        };
        const updated = [...prev, newPart];
        StorageService.saveParticipants(updated);
        return updated;
      }
      return prev;
    });

    // Establish session
    const session = { studentId, courseSlug, periodId };
    setStudentSessionState(session);
    StorageService.setStudentSession(session);
    setRole('STUDENT');

    showToast('Aktivasi Berhasil', `Password berhasil dibuat! Selamat datang, ${std.name}.`, 'success');
    return { success: true, message: 'Password berhasil dibuat dan sesi aktif.' };
  };

  const loginStudentWithPassword = (nim: string, password: string, courseSlug: string, periodId: string) => {
    const cleanNim = nim.trim().toLowerCase();
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

    // Auto enroll in active period if not yet participant
    setParticipants(prev => {
      const exists = prev.some(p => p.periodId === periodId && p.studentId === std.id);
      if (!exists) {
        const newPart: PracticeParticipant = {
          id: `part-${Date.now()}`,
          periodId,
          studentId: std.id,
          student: std,
          enrolledAt: new Date().toISOString().split('T')[0],
          progressStatus: 'IN_PROGRESS',
          finalProjectConfirmed: false
        };
        const updated = [...prev, newPart];
        StorageService.saveParticipants(updated);
        return updated;
      }
      return prev;
    });

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
    
    // Ensure participant progress status is initialized
    setParticipants(prev => {
      const exists = prev.some(p => p.periodId === periodId && p.studentId === studentId);
      if (!exists) {
        const std = students.find(s => s.id === studentId);
        if (std) {
          const newPart: PracticeParticipant = {
            id: `part-${Date.now()}`,
            periodId,
            studentId: std.id,
            student: std,
            enrolledAt: new Date().toISOString().split('T')[0],
            progressStatus: 'IN_PROGRESS',
            finalProjectConfirmed: false
          };
          const updated = [...prev, newPart];
          StorageService.saveParticipants(updated);
          return updated;
        }
      }
      return prev.map(p => {
        if (p.periodId === periodId && p.studentId === studentId && p.progressStatus === 'NOT_STARTED') {
          return { ...p, progressStatus: 'IN_PROGRESS' };
        }
        return p;
      });
    });

    const std = students.find(s => s.id === studentId);
    showToast('Selamat Datang', `Praktik aktif untuk ${std?.name || 'Mahasiswa'} (NIM: ${std?.nim})`, 'success');
  };

  const clearStudentIdentity = () => {
    setStudentSessionState(null);
    StorageService.setStudentSession(null);
    showToast('Sesi Selesai', 'Anda telah keluar dari ruang praktik mahasiswa.', 'info');
  };

  // Progressive Locking logic for Learning Unit
  const toggleUnitCompletion = (unitId: string) => {
    if (!studentSession) return;
    const { studentId, periodId } = studentSession;
    
    // Get all units for this period sorted by unitNumber
    const periodUnits = learningUnits
      .filter(u => u.periodId === periodId)
      .sort((a, b) => a.unitNumber - b.unitNumber);
    
    const targetUnitIndex = periodUnits.findIndex(u => u.id === unitId);
    if (targetUnitIndex === -1) return;

    const existingProg = unitProgress.find(p => p.studentId === studentId && p.unitId === unitId && p.periodId === periodId);
    const isCurrentlyCompleted = existingProg?.isCompleted || false;

    if (!isCurrentlyCompleted) {
      // Mark as completed
      const newProgress: UnitProgress = {
        id: `up-${Date.now()}`,
        studentId,
        unitId,
        periodId,
        isCompleted: true,
        completedAt: getWitaDateString()
      };
      const updatedList = unitProgress.filter(p => !(p.studentId === studentId && p.unitId === unitId && p.periodId === periodId));
      updatedList.push(newProgress);
      setUnitProgress(updatedList);

      // Check if all units for this period are completed
      const completedUnitIds = new Set(updatedList.filter(p => p.studentId === studentId && p.periodId === periodId && p.isCompleted).map(p => p.unitId));
      const allDone = periodUnits.every(u => completedUnitIds.has(u.id));

      if (allDone) {
        setParticipants(prev => prev.map(p => {
          if (p.periodId === periodId && p.studentId === studentId && p.progressStatus === 'IN_PROGRESS') {
            return { ...p, progressStatus: 'LEARNING_COMPLETE' };
          }
          return p;
        }));
        showToast('Hebat! 100% Selesai', 'Seluruh unit pembelajaran telah tuntas. Final Project sekarang dapat diakses!', 'success');
      } else {
        showToast('Unit Selesai', `Unit ${periodUnits[targetUnitIndex].unitNumber} ditandai selesai. Unit berikutnya terbuka.`, 'success');
      }
    } else {
      // Rollback: Uncomplete target unit AND all subsequent units (PRD Section 470)
      const subsequentUnitIds = periodUnits.slice(targetUnitIndex).map(u => u.id);
      const filtered = unitProgress.filter(p => {
        if (p.studentId === studentId && p.periodId === periodId && subsequentUnitIds.includes(p.unitId)) {
          return false;
        }
        return true;
      });
      setUnitProgress(filtered);

      setParticipants(prev => prev.map(p => {
        if (p.periodId === periodId && p.studentId === studentId && (p.progressStatus === 'LEARNING_COMPLETE' || p.progressStatus === 'PROJECT_SUBMITTED')) {
          return { ...p, progressStatus: 'IN_PROGRESS' };
        }
        return p;
      }));
      showToast('Status Dibatalkan', `Progres Unit ${periodUnits[targetUnitIndex].unitNumber} dan unit sesudahnya direset.`, 'info');
    }
  };

  // Student Assignment Submission
  const submitAssignment = (assignmentId: string, fileName: string, fileUrl: string, fileSize: string) => {
    if (!studentSession) return;
    const { studentId, periodId } = studentSession;

    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      assignmentId,
      studentId,
      periodId,
      fileName,
      fileUrl,
      fileSize,
      submittedAt: `${getWitaDateString()} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`,
      status: 'SUBMITTED'
    };

    setSubmissions(prev => {
      const filtered = prev.filter(s => !(s.assignmentId === assignmentId && s.studentId === studentId && s.periodId === periodId));
      return [...filtered, newSub];
    });

    showToast('Tugas Terkirim', `File ${fileName} berhasil diunggah.`, 'success');
  };

  // Student Final Project Confirmation
  const confirmFinalProject = () => {
    if (!studentSession) return;
    const { studentId, periodId } = studentSession;

    const timestamp = `${getWitaDateString()} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`;
    setParticipants(prev => prev.map(p => {
      if (p.periodId === periodId && p.studentId === studentId) {
        return {
          ...p,
          finalProjectConfirmed: true,
          finalProjectSubmittedAt: timestamp,
          progressStatus: p.progressStatus === 'ASSESSED' || p.progressStatus === 'PUBLISHED' ? p.progressStatus : 'PROJECT_SUBMITTED'
        };
      }
      return p;
    }));

    showToast('Final Project Dikonfirmasi', 'Konfirmasi pengumpulan Google Drive berhasil disimpan.', 'success');
  };

  // Student Remedial Submission
  const submitStudentRemedial = (remedialId: string, fileName: string, fileUrl: string) => {
    setRemedials(prev => prev.map(r => {
      if (r.id === remedialId) {
        return {
          ...r,
          submissionFileName: fileName,
          submissionFileUrl: fileUrl,
          submittedAt: `${getWitaDateString()} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`,
          status: 'SUBMITTED'
        };
      }
      return r;
    }));
    showToast('Tugas Tambahan Terkirim', 'Tugas remedial Anda telah dikirim dan menunggu verifikasi instruktur.', 'success');
  };

  // Instructor Course Operations
  const createCourse = (courseData: Partial<Course>): Course => {
    const newCourse: Course = {
      id: `course-${Date.now()}`,
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
    showToast('Mata Kuliah Dibuat', `Mata Kuliah "${newCourse.name}" berhasil dibuat dan siap digunakan.`, 'success');
    return newCourse;
  };

  const copyCourse = (sourceCourseId: string, newName: string, academicYear: string, semester: 'Ganjil' | 'Genap'): Course => {
    const source = courses.find(c => c.id === sourceCourseId);
    if (!source) throw new Error('Course not found');

    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCourse: Course = {
      ...source,
      id: `course-${Date.now()}`,
      name: newName,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      academicYear,
      semester,
      createdAt: getWitaDateString(),
      status: 'PUBLISHED'
    };

    setCourses(prev => [newCourse, ...prev]);
    setActiveCourseId(newCourse.id);
    showToast('Mata Kuliah Disalin', `Struktur "${source.name}" berhasil disalin ke "${newCourse.name}".`, 'success');
    return newCourse;
  };

  const updateCourse = (updated: Course) => {
    setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
    showToast('Mata Kuliah Diperbarui', 'Pengaturan mata kuliah berhasil disimpan.', 'success');
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
      id: `period-${Date.now()}`,
      courseId,
      name: periodData.name || `Minggu Praktik ke-${periodNumber} (${startDate})`,
      periodNumber,
      startDate,
      endDate,
      status,
      finalProjectDriveUrl: periodData.finalProjectDriveUrl || 'https://drive.google.com/drive/folders/poliwako-sample',
      createdAt: getWitaDateString()
    };

    setPeriods(prev => [...prev, newPeriod]);

    // Copy learning units from the template or previous period if available
    const templateUnits = learningUnits.filter(u => u.periodId === existing[0]?.id);
    if (templateUnits.length > 0) {
      const copiedUnits: LearningUnit[] = templateUnits.map(u => ({
        ...u,
        id: `unit-${Date.now()}-${Math.random()}`,
        periodId: newPeriod.id,
        materials: u.materials.map(m => ({ ...m, id: `mat-${Date.now()}-${Math.random()}` })),
        assignment: u.assignment ? { ...u.assignment, id: `assign-${Date.now()}-${Math.random()}`, periodId: newPeriod.id } : undefined
      }));
      setLearningUnits(prev => [...prev, ...copiedUnits]);
    }

    showToast('Periode Dibuat', `Periode "${newPeriod.name}" berhasil dibuat (${newPeriod.startDate} s/d ${newPeriod.endDate}).`, 'success');
    return newPeriod;
  };

  const duplicatePeriod = (sourcePeriodId: string, newName: string, startDate: string): PracticePeriod => {
    const source = periods.find(p => p.id === sourcePeriodId);
    if (!source) throw new Error('Source period not found');

    const endDate = computePeriodEndDate(startDate, 5);
    const status = computePeriodStatus(startDate, endDate);
    const newPeriod: PracticePeriod = {
      ...source,
      id: `period-${Date.now()}`,
      name: newName,
      startDate,
      endDate,
      status,
      createdAt: getWitaDateString()
    };

    // Duplicate learning units
    const sourceUnits = learningUnits.filter(u => u.periodId === sourcePeriodId);
    const duplicatedUnits: LearningUnit[] = sourceUnits.map(u => ({
      ...u,
      id: `unit-${Date.now()}-${Math.random()}`,
      periodId: newPeriod.id,
      materials: u.materials.map(m => ({ ...m, id: `mat-${Date.now()}-${Math.random()}` })),
      assignment: u.assignment ? { ...u.assignment, id: `assign-${Date.now()}-${Math.random()}`, periodId: newPeriod.id } : undefined
    }));

    setPeriods(prev => [...prev, newPeriod]);
    setLearningUnits(prev => [...prev, ...duplicatedUnits]);
    showToast('Periode Diduplikasi', `Struktur materi dan tugas dari "${source.name}" berhasil disalin ke periode baru.`, 'success');
    return newPeriod;
  };

  const updatePeriod = (updated: PracticePeriod) => {
    const status = updated.status || computePeriodStatus(updated.startDate, updated.endDate);
    const finalUpdated = { ...updated, status };

    setPeriods(prev => {
      if (finalUpdated.status === 'ACTIVE') {
        return prev.map(p => {
          if (p.id === finalUpdated.id) return finalUpdated;
          if (p.courseId === finalUpdated.courseId && p.status === 'ACTIVE') {
            return { ...p, status: 'UPCOMING' };
          }
          return p;
        });
      }
      return prev.map(p => p.id === finalUpdated.id ? finalUpdated : p);
    });
    showToast('Periode Diperbarui', `Periode "${finalUpdated.name}" berhasil diperbarui (${finalUpdated.startDate} s/d ${finalUpdated.endDate}).`, 'success');
  };

  const deletePeriod = (periodId: string) => {
    setPeriods(prev => prev.filter(p => p.id !== periodId));
    setParticipants(prev => prev.filter(p => p.periodId !== periodId));
    setLearningUnits(prev => prev.filter(u => u.periodId !== periodId));
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
        id: `part-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
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
        id: `att-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
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
    }

    showToast('Peserta Ditambahkan', `${added} mahasiswa berhasil didaftarkan. (${duplicates} duplikat, ${notFound.length} NIM tidak ditemukan)`, added > 0 ? 'success' : 'warning');
    return { added, duplicates, notFound };
  };

  const removeParticipant = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
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
    showToast('Mahasiswa Ditambahkan', `${newStudent.name} (${newStudent.nim}) berhasil disimpan.`, 'success');
    return newStudent;
  };

  const updateStudent = (updated: Student) => {
    const list = students.map(s => s.id === updated.id ? updated : s);
    setStudents(list);
    showToast('Data Mahasiswa Diperbarui', `Data ${updated.name} berhasil diperbarui.`, 'success');
  };

  const deleteStudent = (studentId: string) => {
    const list = students.filter(s => s.id !== studentId);
    setStudents(list);
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
        id: `std-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
        createdAt: getWitaDateString()
      });
      importedCount++;
    }

    if (newItems.length > 0) {
      const updated = [...newItems, ...students];
      setStudents(updated);
    }

    showToast('Import CSV Selesai', `${importedCount} mahasiswa baru berhasil diimpor. (${duplicateCount} duplikat diabaikan)`, 'success');
    return { importedCount, duplicateCount };
  };

  // Learning Unit CRUD
  const createLearningUnit = (unitData: Partial<LearningUnit>): LearningUnit => {
    const periodUnits = learningUnits.filter(u => u.periodId === unitData.periodId);
    const unitNumber = periodUnits.length + 1;

    const newUnit: LearningUnit = {
      id: `unit-${Date.now()}`,
      periodId: unitData.periodId || '',
      unitNumber,
      title: unitData.title || `Unit ${unitNumber}: Judul Materi Praktik`,
      description: unitData.description || '',
      materials: unitData.materials || [],
      assignment: unitData.assignment
    };

    setLearningUnits(prev => [...prev, newUnit]);
    showToast('Unit Pembelajaran Dibuat', `Unit ${newUnit.unitNumber} berhasil ditambahkan.`, 'success');
    return newUnit;
  };

  const updateLearningUnit = (updated: LearningUnit) => {
    setLearningUnits(prev => prev.map(u => u.id === updated.id ? updated : u));
    showToast('Unit Diperbarui', `Unit ${updated.unitNumber} berhasil disimpan.`, 'success');
  };

  const deleteLearningUnit = (unitId: string) => {
    setLearningUnits(prev => prev.filter(u => u.id !== unitId));
    showToast('Unit Dihapus', 'Unit pembelajaran telah dihapus.', 'info');
  };

  // Attendance Matrix Update
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
        updatedAt: getWitaDateString()
      };

      const updatedRecord = { ...base, [day]: status };
      const stats = computeAttendanceStats(updatedRecord);
      const finalRecord: AttendanceRecord = {
        ...updatedRecord,
        percentage: stats.percentage,
        isEligible: stats.isEligible,
        updatedAt: getWitaDateString()
      };

      const filtered = prev.filter(a => !(a.periodId === periodId && a.studentId === studentId));
      return [...filtered, finalRecord];
    });
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

    if (blockedCount > 0) {
      showToast('Publikasi Sebagian Berhasil', `${publishedCount} nilai dipublikasikan. ${blockedCount} nilai ditahan karena kehadiran <75% belum tuntas tugas remedial.`, 'warning');
    } else {
      showToast('Nilai Dipublikasikan', `Seluruh nilai peserta periode ini (${publishedCount} mahasiswa) telah dipublikasikan.`, 'success');
    }

    return { publishedCount, blockedCount };
  };

  const unpublishPeriodGrades = (periodId: string) => {
    setAssessments(prev => prev.map(a => a.periodId === periodId ? { ...a, isPublished: false } : a));
    setParticipants(prev => prev.map(p => {
      if (p.periodId === periodId && p.progressStatus === 'PUBLISHED') {
        return { ...p, progressStatus: 'ASSESSED' };
      }
      return p;
    }));
    showToast('Publikasi Ditarik', 'Nilai periode ini disembunyikan kembali dari mahasiswa.', 'info');
  };

  // Remedial Management
  const createRemedialTask = (data: Partial<RemedialAssignment>): RemedialAssignment => {
    const newTask: RemedialAssignment = {
      id: `rem-${Date.now()}`,
      periodId: data.periodId || '',
      studentId: data.studentId || '',
      title: data.title || 'Tugas Tambahan Pengganti Kehadiran',
      description: data.description || '',
      deadline: data.deadline || '2026-09-14 23:59 WITA',
      status: 'PENDING_SUBMISSION'
    };

    setRemedials(prev => [...prev, newTask]);
    showToast('Tugas Remedial Dibuat', `Tugas tambahan untuk mahasiswa berhasil ditambahkan.`, 'success');
    return newTask;
  };

  const gradeRemedialTask = (remedialId: string, status: 'LULUS' | 'BELUM_LULUS') => {
    let affectedStudentId = '';
    let affectedPeriodId = '';

    const updatedList = remedials.map(r => {
      if (r.id === remedialId) {
        affectedStudentId = r.studentId;
        affectedPeriodId = r.periodId;
        return {
          ...r,
          status,
          reviewedAt: `${getWitaDateString()} WITA`
        };
      }
      return r;
    });

    setRemedials(updatedList);

    // If status === 'LULUS', check if all remedials for this student are now 'LULUS' -> Auto-publish grade (PRD Section 58)
    if (status === 'LULUS' && affectedStudentId && affectedPeriodId) {
      const studentRemedials = updatedList.filter(r => r.periodId === affectedPeriodId && r.studentId === affectedStudentId);
      const allPassed = studentRemedials.every(r => r.status === 'LULUS');

      if (allPassed) {
        setAssessments(prev => prev.map(a => {
          if (a.periodId === affectedPeriodId && a.studentId === affectedStudentId) {
            return { ...a, isPublished: true, publishedAt: `${getWitaDateString()} WITA (Auto-Published Remedial Pass)` };
          }
          return a;
        }));

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

  const resetToDefaultData = () => {
    StorageService.resetToDefault();
    setInstructor(StorageService.getInstructor());
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
        studentSession,
        currentStudent,
        verifyStudentNim,
        createStudentPassword,
        loginStudentWithPassword,
        resetStudentPassword,
        setStudentIdentity,
        clearStudentIdentity,
        toggleUnitCompletion,
        submitAssignment,
        confirmFinalProject,
        submitStudentRemedial,
        createCourse,
        copyCourse,
        updateCourse,
        deleteCourse,
        createPeriod,
        duplicatePeriod,
        updatePeriod,
        deletePeriod,
        addParticipantsBulk,
        removeParticipant,
        addStudent,
        updateStudent,
        deleteStudent,
        importStudentsCSV,
        createLearningUnit,
        updateLearningUnit,
        deleteLearningUnit,
        updateAttendanceCell,
        saveAssessment,
        publishPeriodGrades,
        unpublishPeriodGrades,
        createRemedialTask,
        gradeRemedialTask,
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
