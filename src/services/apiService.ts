// Hybrid API Service: Supabase Backend with Fallback to LocalStorage
// Implements Application Layer as specified in PRD Section 75

import {
  supabase,
  isSupabaseConfigured,
  signInInstructor as authSignInInstructor,
  signUpInstructor as authSignUpInstructor,
  signOutInstructor as authSignOutInstructor,
  getCurrentAuthUser,
  getSubmissionSignedUrl,
  uploadQuizImage,
} from './supabaseClient';
import { StorageService } from './storageService';
import {
  Course,
  Student,
  PracticePeriod,
  PracticeParticipant,
  LearningUnit,
  LearningMaterial,
  QuizDefinition,
  QuizQuestion,
  QuizAttemptResult,
  Assignment,
  UnitProgress,
  Submission,
  AttendanceRecord,
  Assessment,
  RemedialAssignment,
  FeedbackRule,
  InstructorProfile,
  PublicInstructorProfile,
  Announcement,
} from '../types';
import { getUnitAssignments } from '../utils/learningAssignments';

const isUuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const databaseId = async (id: string, kind: string): Promise<string> => {
  if (isUuid(id)) return id;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${kind}:${id}`));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
};
const normalizeDeadline = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return new Date().toISOString();
  const normalized = raw
    .replace(/\s*WITA\s*$/i, '+08:00')
    .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2})?$/, (_match: string, date: string, time: string, seconds?: string, timezone?: string) => `${date}T${time}:${seconds || '00'}${timezone || ''}`);
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

// Quiz content stays compatible with the existing learning_materials table
// during the local-first phase. No schema migration is required: the quiz
// definition is serialized into the existing content_text column and decoded
// back into the richer local type when learning units are loaded.
const QUIZ_CONTENT_PREFIX = '__POLIWAKO_QUIZ_V1__';
const serializeMaterialContent = (material: LearningMaterial): string | null => (
  material.type === 'QUIZ' && material.quiz
    ? `${QUIZ_CONTENT_PREFIX}${JSON.stringify(material.quiz)}`
    : material.contentText || null
);
const deserializeQuiz = (type: string, contentText?: string | null): QuizDefinition | undefined => {
  if (type !== 'QUIZ' || !contentText?.startsWith(QUIZ_CONTENT_PREFIX)) return undefined;
  try {
    const parsed = JSON.parse(contentText.slice(QUIZ_CONTENT_PREFIX.length));
    return parsed && Array.isArray(parsed.questions) ? parsed as QuizDefinition : undefined;
  } catch {
    return undefined;
  }
};

const mapQuizQuestion = (row: any, optionsByQuestion: Map<string, any[]>): QuizQuestion => ({
  id: row.id,
  prompt: row.prompt || '',
  imageUrl: row.image_url || undefined,
  explanation: row.explanation || undefined,
  options: (optionsByQuestion.get(row.id) || [])
    .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
    .map((option: any) => ({ id: option.id, text: option.option_text || '' })),
  ...(row.correct_option_id ? { correctOptionId: row.correct_option_id } : {}),
});

const isMissingQuizArchitecture = (error: any): boolean => /quiz_definitions|quiz_questions|quiz_options|relation .* does not exist|could not find the table/i.test(error?.message || '');

const mapAssignmentRow = (row: any): Assignment => ({
  id: row.id,
  unitId: row.unit_id,
  periodId: row.period_id,
  title: row.title,
  description: row.description || '',
  deadline: row.deadline,
  maxScore: row.max_score,
  allowedFileType: row.allowed_file_type,
  countdownEnabled: Boolean(row.countdown_enabled),
  countdownMinutes: Number(row.countdown_minutes) || undefined,
  countdownStartedAt: row.countdown_started_at || undefined,
  submissionType: (row.submission_type && row.submission_type !== 'ASSIGNMENT')
    ? row.submission_type
    : (/laporan|report/i.test(row.title || '') ? 'REPORT' : 'ASSIGNMENT'),
});

export class ApiService {
  static isLiveBackend(): boolean {
    return isSupabaseConfigured();
  }

  // ====================================================================
  // AUTH
  // ====================================================================
  static async loginInstructor(email: string, password?: string): Promise<{ error: Error | null }> {
    return authSignInInstructor(email, password);
  }

  static async signUpInstructor(
    email: string,
    password: string,
    name: string,
    department: string = 'Rekayasa Perancangan Mekanik',
    nip?: string
  ): Promise<{ user?: any; session?: any; error: Error | null }> {
    return authSignUpInstructor(email, password, name, department, nip);
  }

  static async logout(): Promise<void> {
    await authSignOutInstructor();
  }

  static async getCurrentInstructorId(): Promise<string | null> {
    const user = await getCurrentAuthUser();
    return user?.id || null;
  }


  // ====================================================================
  // INSTRUCTOR PROFILE
  // ====================================================================
  static async getInstructorProfile(userId?: string): Promise<InstructorProfile> {
    if (!this.isLiveBackend() || !supabase || !userId) {
      return StorageService.getInstructor();
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) return StorageService.getInstructor();
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        nip: data.nip || undefined,
        department: data.department || 'Teknik Mesin',
        avatarUrl: data.avatar_url || undefined,
      };
    } catch {
      return StorageService.getInstructor();
    }
  }

  // Public, minimal instructor directory used by the student course catalog.
  // The database view intentionally exposes only name, department, and avatar.
  static async getInstructorDirectory(): Promise<Record<string, PublicInstructorProfile>> {
    if (!this.isLiveBackend() || !supabase) {
      const profile = StorageService.getInstructor();
      return profile?.id
        ? { [profile.id]: { id: profile.id, name: profile.name, department: profile.department, avatarUrl: profile.avatarUrl } }
        : {};
    }
    try {
      const { data, error } = await supabase
        .from('instructor_directory')
        .select('id, name, department, avatar_url');
      if (error || !data) return {};
      return Object.fromEntries(data.map((profile: any) => [profile.id, {
        id: profile.id,
        name: profile.name || 'Instruktur mata kuliah',
        department: profile.department || 'Program studi belum diisi',
        avatarUrl: profile.avatar_url || undefined,
      }]));
    } catch (error) {
      console.warn('Unable to load public instructor directory:', error);
      return {};
    }
  }

  // ====================================================================
  // COURSES
  // ====================================================================
  static async getCourses(instructorId?: string): Promise<Course[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getCourses();
    }
    try {
      // RLS is the authorization boundary. The optional instructor filter is
      // only a query scope, so callers cannot use it to read another owner's
      // private courses. Avoiding a second getUser() request here materially
      // shortens the refresh path after the session was already verified.
      const requestedInstructorId = instructorId?.trim();

      let query = supabase.from('courses').select(`
        *,
        course_sub_cpmk (*),
        rubric_criteria (*)
      `);
      if (requestedInstructorId) {
        query = query.eq('instructor_id', requestedInstructorId);
      } else {
        query = query.eq('status', 'PUBLISHED');
      }
      const { data, error } = await query;
      if (error) {
        console.error('Unable to load courses from Supabase:', error);
        throw error;
      }
      if (!data) return [];

      return data.map((c: any) => ({
        id: c.id,
        instructorId: c.instructor_id,
        name: c.name,
        code: c.code,
        academicYear: c.academic_year,
        semester: c.semester,
        slug: c.slug,
        description: c.description || '',
        department: c.department,
        status: c.status,
        createdAt: c.created_at,
        subCpmks: (c.course_sub_cpmk || []).map((sc: any) => ({
          id: sc.id,
          code: sc.code,
          description: sc.description,
          weightPercent: sc.weight_percent ? Number(sc.weight_percent) : undefined,
        })),
        qualityRubrics: (c.rubric_criteria || []).map((rc: any) => ({
          id: rc.id,
          subCpmkId: rc.sub_cpmk_id || undefined,
          name: rc.name,
          category: rc.category,
          description: rc.description || '',
        })),
      }));
    } catch (err) {
      // Never fall back to the shared local cache in live mode: it may belong to a different instructor account.
      console.error('Unable to load scoped courses from Supabase:', err);
      throw err;
    }
  }

  static async saveCourse(course: Course): Promise<Course> {
    let savedCourse = course;
    if (this.isLiveBackend() && supabase) {
      // Legacy local IDs are not UUIDs. Deterministic IDs make failed saves retryable.
      const databaseId = async (id: string, kind: string): Promise<string> => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(course.id + ':' + kind + ':' + id));
        const bytes = new Uint8Array(digest).slice(0, 16);
        bytes[6] = (bytes[6] & 15) | 128;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
      };
      const subCpmks = await Promise.all(course.subCpmks.map(async s => ({ ...s, id: await databaseId(s.id, 'sub-cpmk') })));
      const subIds = new Map(course.subCpmks.map((s, i) => [s.id, subCpmks[i].id]));
      const qualityRubrics = await Promise.all(course.qualityRubrics.map(async r => ({
        ...r,
        id: await databaseId(r.id, 'rubric'),
        subCpmkId: r.subCpmkId ? subIds.get(r.subCpmkId) : undefined,
      })));
      savedCourse = { ...course, subCpmks, qualityRubrics };

      const { error: courseError } = await supabase.from('courses').upsert({
        id: course.id,
        instructor_id: course.instructorId,
        name: course.name,
        code: course.code,
        academic_year: course.academicYear,
        semester: course.semester,
        slug: course.slug,
        description: course.description,
        department: course.department,
        status: course.status,
        updated_at: new Date().toISOString(),
      }).select('id').single();
      if (courseError) throw courseError;

      const { data: previousSubCpmks, error: subReadError } = await supabase.from('course_sub_cpmk').select('id').eq('course_id', course.id);
      if (subReadError) throw subReadError;
      const { data: previousRubrics, error: rubricReadError } = await supabase.from('rubric_criteria').select('id').eq('course_id', course.id);
      if (rubricReadError) throw rubricReadError;

      if (subCpmks.length) {
        const { error } = await supabase.from('course_sub_cpmk').upsert(subCpmks.map(s => ({
          id: s.id, course_id: course.id, code: s.code, description: s.description,
          weight_percent: s.weightPercent ?? null,
        })));
        if (error) throw error;
      }
      if (qualityRubrics.length) {
        const { error } = await supabase.from('rubric_criteria').upsert(qualityRubrics.map(r => ({
          id: r.id, course_id: course.id, sub_cpmk_id: r.subCpmkId ?? null,
          name: r.name, category: r.category, description: r.description,
        })));
        if (error) throw error;
      }

      // Prune only removed rows from this course, after every upsert succeeds.
      const removedRubrics = (previousRubrics || []).filter(r => !qualityRubrics.some(current => current.id === r.id)).map(r => r.id);
      if (removedRubrics.length) {
        const { error } = await supabase.from('rubric_criteria').delete().eq('course_id', course.id).in('id', removedRubrics);
        if (error) throw error;
      }
      const removedSubCpmks = (previousSubCpmks || []).filter(s => !subCpmks.some(current => current.id === s.id)).map(s => s.id);
      if (removedSubCpmks.length) {
        const { error } = await supabase.from('course_sub_cpmk').delete().eq('course_id', course.id).in('id', removedSubCpmks);
        if (error) throw error;
      }
    }

    StorageService.saveCourses([
      ...StorageService.getCourses().filter(c => c.id !== savedCourse.id), savedCourse,
    ]);
    return savedCourse;
  }

  static async deleteCourse(courseId: string): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      if (error) throw error;
    }

    StorageService.saveCourses(StorageService.getCourses().filter(course => course.id !== courseId));
  }

  // ====================================================================
  // MASTER STUDENTS
  // ====================================================================
  static async getStudents(): Promise<Student[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getStudents();
    }
    try {
      const { data, error } = await supabase.from('students').select('*').order('nim', { ascending: true });
      if (error) {
        console.error('Unable to load students from Supabase:', error);
        throw error;
      }
      if (!data) return [];
      return data.map((s: any) => ({
        id: s.id,
        nim: s.nim,
        name: s.name,
        className: s.class_name,
        email: s.email || undefined,
        password: s.password_hash || undefined,
        hasCreatedPassword: Boolean(s.password_hash),
        createdAt: s.created_at,
      }));
    } catch (error) {
      console.error('Unable to load students from Supabase:', error);
      throw error;
    }
  }

  // NIM-based student authentication is handled by restricted database RPCs.
  // The RPCs return only the student's public identity and never expose the
  // stored password hash to the browser.
  static async studentAuthLookup(nim: string, courseSlug?: string, periodId?: string): Promise<{
    exists: boolean;
    isEnrolled: boolean;
    periodId?: string;
    courseSlug?: string;
    hasCreatedPassword: boolean;
    student?: Student;
    message?: string;
  }> {
    if (!this.isLiveBackend() || !supabase) {
      return { exists: false, isEnrolled: false, hasCreatedPassword: false, message: 'Backend Supabase belum terhubung.' };
    }
    const { data, error } = await supabase.rpc('student_auth_lookup', {
      p_nim: nim,
      p_course_slug: courseSlug || null,
      p_period_id: periodId || null,
    });
    if (error) throw error;
    const result = data || {};
    const rawStudent = result.student;
    return {
      exists: Boolean(result.exists),
      isEnrolled: Boolean(result.isEnrolled),
      periodId: result.periodId || undefined,
      courseSlug: result.courseSlug || undefined,
      hasCreatedPassword: Boolean(result.hasCreatedPassword),
      student: rawStudent ? {
        id: rawStudent.id,
        nim: rawStudent.nim,
        name: rawStudent.name,
        className: rawStudent.className,
        email: rawStudent.email || undefined,
        createdAt: rawStudent.createdAt || new Date().toISOString(),
      } : undefined,
      message: result.message || undefined,
    };
  }

  static async studentAuthSetPassword(studentId: string, nim: string, password: string, courseSlug: string, periodId: string): Promise<{
    success: boolean;
    message: string;
    periodId?: string;
    sessionToken?: string;
    student?: Student;
  }> {
    if (!this.isLiveBackend() || !supabase) {
      return { success: false, message: 'Backend Supabase belum terhubung.' };
    }
    const { data, error } = await supabase.rpc('student_auth_set_password', {
      p_student_id: studentId,
      p_nim: nim,
      p_password: password,
      p_course_slug: courseSlug,
      p_period_id: periodId,
    });
    if (error) throw error;
    const result = data || {};
    const rawStudent = result.student;
    return {
      success: Boolean(result.success),
      message: result.message || (result.success ? 'Password berhasil disimpan.' : 'Password gagal disimpan.'),
      periodId: result.periodId || undefined,
      sessionToken: result.sessionToken || undefined,
      student: rawStudent ? {
        id: rawStudent.id,
        nim: rawStudent.nim,
        name: rawStudent.name,
        className: rawStudent.className,
        email: rawStudent.email || undefined,
        createdAt: rawStudent.createdAt || new Date().toISOString(),
      } : undefined,
    };
  }

  static async studentAuthLogin(nim: string, password: string, courseSlug: string, periodId: string): Promise<{
    success: boolean;
    message: string;
    periodId?: string;
    sessionToken?: string;
    student?: Student;
  }> {
    if (!this.isLiveBackend() || !supabase) {
      return { success: false, message: 'Backend Supabase belum terhubung.' };
    }
    const { data, error } = await supabase.rpc('student_auth_login', {
      p_nim: nim,
      p_password: password,
      p_course_slug: courseSlug,
      p_period_id: periodId,
    });
    if (error) throw error;
    const result = data || {};
    const rawStudent = result.student;
    return {
      success: Boolean(result.success),
      message: result.message || (result.success ? 'Login berhasil.' : 'Login gagal.'),
      periodId: result.periodId || undefined,
      sessionToken: result.sessionToken || undefined,
      student: rawStudent ? {
        id: rawStudent.id,
        nim: rawStudent.nim,
        name: rawStudent.name,
        className: rawStudent.className,
        email: rawStudent.email || undefined,
        createdAt: rawStudent.createdAt || new Date().toISOString(),
      } : undefined,
    };
  }

  static async saveStudent(student: Student, instructorId?: string): Promise<void> {
    const list = StorageService.getStudents().filter((s) => s.id !== student.id);
    StorageService.saveStudents([...list, student]);

    if (this.isLiveBackend() && supabase && instructorId) {
      const { error } = await supabase.from('students').upsert({
          id: student.id,
          instructor_id: instructorId,
          nim: student.nim,
          name: student.name,
          class_name: student.className,
          email: student.email,
          password_hash: student.password,
          updated_at: new Date().toISOString(),
        }).select('id').single();
      if (error) throw error;
    }
  }

  static async deleteStudent(studentId: string): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
    }
    const students = StorageService.getStudents().filter(student => student.id !== studentId);
    StorageService.saveStudents(students);
  }

  // ====================================================================
  // PRACTICE PERIODS
  // ====================================================================
  static async getPeriods(courseId?: string): Promise<PracticePeriod[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getPeriods();
    }
    try {
      let query = supabase.from('practice_periods').select('*').order('period_number', { ascending: true });
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Unable to load periods from Supabase:', error);
        throw error;
      }
      if (!data) return [];
      return data.map((p: any) => ({
        id: p.id,
        courseId: p.course_id,
        name: p.name,
        periodNumber: p.period_number,
        startDate: p.start_date,
        endDate: p.end_date,
        status: p.status,
        finalProjectDriveUrl: p.final_project_drive_url || undefined,
        finalProjectDescription: p.final_project_description || undefined,
        finalProjectEnabled: p.final_project_enabled === true,
        createdAt: p.created_at,
      }));
    } catch (error) {
      console.error('Unable to load periods from Supabase:', error);
      throw error;
    }
  }

  static async deletePeriod(periodId: string): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase.from('practice_periods').delete().eq('id', periodId);
      if (error) throw error;
    }
    StorageService.savePeriods(StorageService.getPeriods().filter(period => period.id !== periodId));
  }

  static async savePeriod(period: PracticePeriod): Promise<void> {
    const periods = StorageService.getPeriods().filter((p) => p.id !== period.id);
    StorageService.savePeriods([...periods, period]);

    if (this.isLiveBackend() && supabase) {
      try {
        const { error } = await supabase.from('practice_periods').upsert({
          id: period.id,
          course_id: period.courseId,
          name: period.name,
          period_number: period.periodNumber,
          start_date: period.startDate,
          end_date: period.endDate,
          status: period.status,
          final_project_drive_url: period.finalProjectDriveUrl,
          final_project_description: period.finalProjectDescription || null,
          final_project_enabled: period.finalProjectEnabled === true,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (err) {
        console.error('Error syncing period to Supabase:', err);
        throw err;
      }
    }
  }

  static async savePeriodsBulk(periodsList: PracticePeriod[]): Promise<void> {
    StorageService.savePeriods(periodsList);

    if (this.isLiveBackend() && supabase && periodsList.length > 0) {
      try {
        const rows = periodsList.map((p) => ({
          id: p.id,
          course_id: p.courseId,
          name: p.name,
          period_number: p.periodNumber,
          start_date: p.startDate,
          end_date: p.endDate,
          status: p.status,
          final_project_drive_url: p.finalProjectDriveUrl,
          final_project_description: p.finalProjectDescription || null,
          final_project_enabled: p.finalProjectEnabled === true,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from('practice_periods').upsert(rows);
        if (error) throw error;
      } catch (err) {
        console.error('Error batch syncing periods to Supabase:', err);
        throw err;
      }
    }
  }

  static async saveFinalProject(participant: PracticeParticipant): Promise<void> {
    if (supabase) {
      const {error} = await supabase.from('practice_participants').update({
        final_project_confirmed: participant.finalProjectConfirmed, final_project_submitted_at: participant.finalProjectSubmittedAt,
        final_project_url: participant.finalProjectUrl, final_project_review_status: participant.finalProjectReviewStatus,
        final_project_feedback: participant.finalProjectFeedback || null, progress_status: participant.progressStatus,
      }).eq('id', participant.id).select('id').single();
      if (error) throw new Error(`Proyek belum tersimpan: ${error.message}`);
    }
    StorageService.saveParticipants(StorageService.getParticipants().map(p => p.id === participant.id ? participant : p));
  }

  static async saveParticipant(participant: PracticeParticipant): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase.from('practice_participants').upsert({
        id: participant.id,
        period_id: participant.periodId,
        student_id: participant.studentId,
        enrolled_at: participant.enrolledAt,
        progress_status: participant.progressStatus,
        final_project_submitted_at: participant.finalProjectSubmittedAt || null,
        final_project_confirmed: participant.finalProjectConfirmed,
      }, { onConflict: 'period_id,student_id' });
      if (error) throw error;
    }

    const stored = StorageService.getParticipants().filter(item => item.id !== participant.id && !(item.periodId === participant.periodId && item.studentId === participant.studentId));
    StorageService.saveParticipants([...stored, participant]);
  }

  static async deleteParticipant(participantId: string): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase.from('practice_participants').delete().eq('id', participantId);
      if (error) throw error;
    }
    StorageService.saveParticipants(StorageService.getParticipants().filter(item => item.id !== participantId));
  }

  static async deleteAttendanceRecord(periodId: string, studentId: string): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase.from('attendance_records')
        .delete()
        .eq('period_id', periodId)
        .eq('student_id', studentId);
      if (error) throw error;
    }
    StorageService.saveAttendance(StorageService.getAttendance().filter(
      record => !(record.periodId === periodId && record.studentId === studentId)
    ));
  }

  // ====================================================================
  // PRACTICE PARTICIPANTS
  // ====================================================================
  static async getParticipants(periodId?: string): Promise<PracticeParticipant[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getParticipants();
    }

    const mapParticipant = (p: any, includeStudent = true): PracticeParticipant => ({
      id: p.id,
      periodId: p.period_id,
      studentId: p.student_id,
      student: includeStudent ? {
        id: p.students?.id || p.student_id,
        nim: p.students?.nim || '',
        name: p.students?.name || '',
        className: p.students?.class_name || '',
        email: p.students?.email || undefined,
        password: p.students?.password_hash || undefined,
        hasCreatedPassword: Boolean(p.students?.password_hash),
        createdAt: p.students?.created_at || new Date().toISOString(),
      } : {
        id: p.student_id,
        nim: '',
        name: '',
        className: '',
        createdAt: new Date().toISOString(),
      },
      enrolledAt: p.enrolled_at || new Date().toISOString(),
      progressStatus: p.progress_status || 'NOT_STARTED',
      finalProjectSubmittedAt: p.final_project_submitted_at || undefined,
      finalProjectConfirmed: p.final_project_confirmed || false,
      finalProjectUrl: p.final_project_url || undefined,
      finalProjectReviewStatus: p.final_project_review_status || undefined,
      finalProjectFeedback: p.final_project_feedback || undefined,
    });

    try {
      let query = supabase.from('practice_participants').select('*, students(*)');
      if (periodId) query = query.eq('period_id', periodId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data.map(p => mapParticipant(p));

      // Resolve the auth role only when the direct query was empty or failed.
      // The normal catalog path therefore avoids a second Auth request.
      const authUser = await getCurrentAuthUser();

      // An authenticated instructor must never receive the anonymous minimal
      // enrollment view as a silent fallback. That view has no student names
      // and can make a valid instructor query look partially empty.
      if (authUser) {
        if (error) {
          console.error('Unable to load participants from Supabase:', error);
          throw error;
        }
        return [];
      }

      // Student sessions use the public anon key. Fall back to the minimal
      // enrollment view so they can see only their registered course IDs.
      let publicQuery = supabase.from('student_course_enrollments').select('id, period_id, student_id');
      if (periodId) publicQuery = publicQuery.eq('period_id', periodId);
      const { data: publicData, error: publicError } = await publicQuery;
      if (publicError || !publicData) {
        if (error) console.error('Error loading participants from Supabase:', error);
        return [];
      }
      return publicData.map(p => mapParticipant(p, false));
    } catch (error) {
      console.error('Error loading participants from Supabase:', error);
      if (await getCurrentAuthUser()) throw error;
      return [];
    }
  }

  // ====================================================================
  // LEARNING UNITS & MATERIALS
  // ====================================================================
  private static async syncNormalizedQuizzes(materials: LearningMaterial[]): Promise<void> {
    if (!supabase) return;
    const quizMaterials = materials.filter(material => material.type === 'QUIZ' && material.quiz);
    const nonQuizMaterialIds = materials.filter(material => material.type !== 'QUIZ').map(material => material.id);

    if (nonQuizMaterialIds.length) {
      const { error } = await supabase.from('quiz_definitions').delete().in('material_id', nonQuizMaterialIds);
      if (error && !isMissingQuizArchitecture(error)) throw error;
    }

    for (const material of quizMaterials) {
      const quiz = material.quiz!;
      const quizId = await databaseId(material.id, 'quiz-definition');
      const { error: quizError } = await supabase.from('quiz_definitions').upsert({
        id: quizId,
        material_id: material.id,
        description: quiz.description || null,
        shuffle_questions: Boolean(quiz.shuffleQuestions),
        pass_score: Math.min(100, Math.max(0, Number(quiz.passScore ?? 70))),
        max_attempts: Math.max(0, Number(quiz.maxAttempts ?? 0)),
        updated_at: new Date().toISOString(),
      });
      if (quizError) throw quizError;

      const { data: existingQuestions, error: existingQuestionError } = await supabase
        .from('quiz_questions').select('id').eq('quiz_id', quizId);
      if (existingQuestionError) throw existingQuestionError;
      const existingQuestionIds = (existingQuestions || []).map((question: any) => question.id);
      if (existingQuestionIds.length) {
        const { error: optionDeleteError } = await supabase.from('quiz_options').delete().in('question_id', existingQuestionIds);
        if (optionDeleteError) throw optionDeleteError;
        const { error: questionDeleteError } = await supabase.from('quiz_questions').delete().in('id', existingQuestionIds);
        if (questionDeleteError) throw questionDeleteError;
      }

      for (let questionIndex = 0; questionIndex < quiz.questions.length; questionIndex += 1) {
        const question = quiz.questions[questionIndex];
        const questionId = await databaseId(question.id, `quiz-question:${material.id}`);
        const imageUrl = question.imageUrl
          ? await uploadQuizImage(question.imageUrl, material.id, questionId)
          : undefined;
        const optionRows = await Promise.all(question.options.map(async (option, optionIndex) => ({
          id: await databaseId(option.id, `quiz-option:${questionId}`),
          question_id: questionId,
          option_text: option.text,
          position: optionIndex,
        })));
        const correctOption = optionRows[question.options.findIndex(option => option.id === question.correctOptionId)];
        const { error: questionInsertError } = await supabase.from('quiz_questions').insert({
          id: questionId,
          quiz_id: quizId,
          prompt: question.prompt,
          image_url: imageUrl || null,
          explanation: question.explanation || null,
          position: questionIndex,
          // Options are inserted immediately after the question; set the
          // foreign key in a second update so the insert is not circular.
          correct_option_id: null,
        });
        if (questionInsertError) throw questionInsertError;
        if (optionRows.length) {
          const { error: optionInsertError } = await supabase.from('quiz_options').insert(optionRows);
          if (optionInsertError) throw optionInsertError;
        }
        if (correctOption?.id) {
          const { error: correctOptionError } = await supabase.from('quiz_questions')
            .update({ correct_option_id: correctOption.id })
            .eq('id', questionId);
          if (correctOptionError) throw correctOptionError;
        }
      }
    }
  }

  static async getLearningUnits(periodId?: string): Promise<LearningUnit[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getLearningUnits();
    }
    try {
      // Load the three resources separately. Embedded PostgREST relations can
      // be stale while a migration is being applied and would otherwise make
      // the whole unit query fail, hiding assignments after a refresh.
      let query = supabase
        .from('learning_units')
        .select('*')
        .order('unit_number', { ascending: true });
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      const unitIds = data.map((unit: any) => unit.id).filter(Boolean);
      const [materialsResult, assignmentsResult] = unitIds.length
        ? await Promise.all([
            supabase.from('learning_materials').select('*').in('unit_id', unitIds),
            supabase.from('assignments').select('*').in('unit_id', unitIds),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      if (materialsResult.error) throw materialsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      const materialsByUnit = new Map<string, any[]>();
      (materialsResult.data || []).forEach((material: any) => {
        const list = materialsByUnit.get(material.unit_id) || [];
        list.push(material);
        materialsByUnit.set(material.unit_id, list);
      });
      const assignmentsByUnit = new Map<string, any[]>();
      (assignmentsResult.data || []).forEach((assignment: any) => {
        const list = assignmentsByUnit.get(assignment.unit_id) || [];
        list.push(assignment);
        assignmentsByUnit.set(assignment.unit_id, list);
      });

      // New quiz records are normalized. If the migration has not been
      // applied yet, or when loading a student view without the answer key,
      // retain the legacy JSON path below.
      const normalizedQuizByMaterial = new Map<string, QuizDefinition>();
      const quizMaterialIds = (materialsResult.data || [])
        .filter((material: any) => material.type === 'QUIZ')
        .map((material: any) => material.id);
      const quizDefinitionResult = quizMaterialIds.length
        ? await supabase.from('quiz_definitions').select('*').in('material_id', quizMaterialIds)
        : { data: [], error: null };
      if (!quizDefinitionResult.error && (quizDefinitionResult.data || []).length) {
        const quizIds = (quizDefinitionResult.data || []).map((quiz: any) => quiz.id);
        let questionResult: any = await supabase.from('quiz_questions')
          .select('id, quiz_id, prompt, image_url, explanation, position, correct_option_id')
          .in('quiz_id', quizIds);
        if (questionResult.error) {
          questionResult = await supabase.from('quiz_questions_public')
            .select('id, quiz_id, prompt, image_url, explanation, position')
            .in('quiz_id', quizIds);
        }
        const optionResult = await supabase.from('quiz_options')
          .select('id, question_id, option_text, position')
          .in('question_id', (questionResult.data || []).map((question: any) => question.id));
        if (!questionResult.error && !optionResult.error) {
          const optionsByQuestion = new Map<string, any[]>();
          (optionResult.data || []).forEach((option: any) => {
            const list = optionsByQuestion.get(option.question_id) || [];
            list.push(option);
            optionsByQuestion.set(option.question_id, list);
          });
          const questionsByQuiz = new Map<string, any[]>();
          (questionResult.data || []).forEach((question: any) => {
            const list = questionsByQuiz.get(question.quiz_id) || [];
            list.push(question);
            questionsByQuiz.set(question.quiz_id, list);
          });
          (quizDefinitionResult.data || []).forEach((quiz: any) => {
            normalizedQuizByMaterial.set(quiz.material_id, {
              description: quiz.description || undefined,
              shuffleQuestions: Boolean(quiz.shuffle_questions),
              passScore: Number(quiz.pass_score ?? 70),
              maxAttempts: Number(quiz.max_attempts ?? 0),
              questions: (questionsByQuiz.get(quiz.id) || [])
                .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
                .map((question: any) => mapQuizQuestion(question, optionsByQuestion)),
            });
          });
        }
      }

      // Older databases may not have the unit countdown columns yet. Preserve
      // the last locally saved unit gate while the rest of the unit remains
      // authoritative from Supabase.
      const cachedUnitCountdown = new Map(
        StorageService.getLearningUnits().map(item => [item.id, {
          countdownEnabled: item.countdownEnabled,
          countdownMinutes: item.countdownMinutes,
          countdownStartedAt: item.countdownStartedAt,
        }])
      );

      return data.map((u: any) => ({
        id: u.id,
        periodId: u.period_id,
        unitNumber: u.unit_number,
        title: u.title,
        description: u.description || '',
        countdownEnabled: u.countdown_enabled == null
          ? cachedUnitCountdown.get(u.id)?.countdownEnabled
          : Boolean(u.countdown_enabled),
        countdownMinutes: u.countdown_minutes == null
          ? cachedUnitCountdown.get(u.id)?.countdownMinutes
          : (Number(u.countdown_minutes) || undefined),
        countdownStartedAt: u.countdown_started_at == null
          ? cachedUnitCountdown.get(u.id)?.countdownStartedAt
          : u.countdown_started_at,
        materials: [...(materialsByUnit.get(u.id) || [])]
          .sort((a: any, b: any) => {
            const aTime = Date.parse(a.created_at || '') || 0;
            const bTime = Date.parse(b.created_at || '') || 0;
            return aTime - bTime;
          })
          .filter((m: any) => !/dummy\.pdf/i.test(m.content_url || ''))
          .map((m: any) => ({
          id: m.id,
          unitId: m.unit_id,
          title: m.title,
          type: m.type,
          contentUrl: m.content_url || undefined,
          contentText: m.type === 'QUIZ'
            ? (normalizedQuizByMaterial.get(m.id)?.description || deserializeQuiz(m.type, m.content_text)?.description || undefined)
            : (m.content_text || undefined),
          quiz: normalizedQuizByMaterial.get(m.id) || deserializeQuiz(m.type, m.content_text),
          fileSize: m.file_size || undefined,
          countdownEnabled: Boolean(m.countdown_enabled),
          countdownMinutes: Number(m.countdown_minutes) || undefined,
          countdownStartedAt: m.countdown_started_at || undefined,
          })),
        assignments: (assignmentsByUnit.get(u.id) || [])
          .sort((a: any, b: any) => {
            const aTime = Date.parse(a.created_at || '') || 0;
            const bTime = Date.parse(b.created_at || '') || 0;
            return aTime - bTime;
          })
          .map(mapAssignmentRow),
        // Keep the first assignment available to older UI/cache consumers.
        assignment: assignmentsByUnit.get(u.id)?.[0] ? mapAssignmentRow(assignmentsByUnit.get(u.id)![0]) : undefined,
      }));
    } catch (error) {
      console.error('Unable to load learning units and assignments from Supabase:', error);
      // Keep an instructor's just-saved work visible during a transient
      // Supabase/Data API failure. A successful Supabase response always wins;
      // this fallback only prevents an empty screen while the request retries.
      const cached = StorageService.getLearningUnits();
      return periodId ? cached.filter(unit => unit.periodId === periodId) : cached;
    }
  }

  /** Persist a unit and its related materials/assignment for instructor edits. */
  static async saveLearningUnit(unit: LearningUnit): Promise<LearningUnit> {
    if (this.isLiveBackend() && supabase) {
      const unitId = await databaseId(unit.id, 'learning-unit');
      const savedMaterials = await Promise.all(unit.materials.map(async (material, index) => ({
        ...material,
        id: await databaseId(material.id, `learning-material:${unit.id}`),
        unitId,
        // Reuse the existing timestamp column as the persisted display order.
        // The list is rewritten in its current order whenever the unit is saved.
        createdAt: new Date(Date.now() + index).toISOString(),
      })));
      const savedAssignments = await Promise.all(getUnitAssignments(unit).map(async assignment => ({
        ...assignment,
        id: await databaseId(assignment.id, `assignment:${unit.id}`),
        unitId,
      })));
      const usesUnitCountdown = unit.countdownEnabled !== undefined
        || unit.countdownMinutes !== undefined
        || unit.countdownStartedAt !== undefined;
      const unitPayload = {
        id: unitId,
        period_id: unit.periodId,
        unit_number: unit.unitNumber,
        title: unit.title,
        description: unit.description || '',
        countdown_enabled: Boolean(unit.countdownEnabled),
        countdown_minutes: unit.countdownEnabled ? Math.max(1, Number(unit.countdownMinutes) || 1) : 0,
        countdown_started_at: unit.countdownEnabled ? (unit.countdownStartedAt || new Date().toISOString()) : null,
      };
      let { error: unitError } = await supabase.from('learning_units').upsert(unitPayload);
      // Keep older databases usable until the unit countdown migration is applied.
      if (unitError && /countdown_|column .* does not exist/i.test(unitError.message || '')) {
        if (usesUnitCountdown) {
          throw new Error('Countdown unit belum tersinkron: kolom countdown belum tersedia di Supabase. Terapkan migrasi 0006_unit_countdown.sql terlebih dahulu.');
        }
        const legacyUnitPayload = { ...unitPayload };
        delete (legacyUnitPayload as any).countdown_enabled;
        delete (legacyUnitPayload as any).countdown_minutes;
        delete (legacyUnitPayload as any).countdown_started_at;
        ({ error: unitError } = await supabase.from('learning_units').upsert(legacyUnitPayload));
      }
      if (unitError) throw unitError;

      const verifyUnitFields = usesUnitCountdown
        ? 'id, title, description, countdown_enabled, countdown_minutes, countdown_started_at'
        : 'id, title, description';
      const { data: persistedUnit, error: verifyUnitError } = await supabase
        .from('learning_units')
        .select(verifyUnitFields)
        .eq('id', unitId)
        .maybeSingle();
      if (verifyUnitError) throw verifyUnitError;
      if (!persistedUnit) throw new Error('Unit berhasil disimpan tetapi tidak ditemukan saat verifikasi ulang Supabase.');
      if (usesUnitCountdown && Boolean((persistedUnit as any).countdown_enabled) !== Boolean(unit.countdownEnabled)) {
        throw new Error('Countdown unit gagal diverifikasi setelah disimpan ke Supabase.');
      }

      const materialRows = savedMaterials.map(material => ({
        id: material.id,
        unit_id: unitId,
        title: material.title,
        type: material.type,
        content_url: material.contentUrl || null,
        content_text: serializeMaterialContent(material),
        file_size: material.fileSize || null,
        created_at: material.createdAt,
        countdown_enabled: Boolean(material.countdownEnabled),
        countdown_minutes: material.countdownEnabled ? Math.max(1, Number(material.countdownMinutes) || 1) : 0,
        countdown_started_at: material.countdownEnabled ? (material.countdownStartedAt || new Date().toISOString()) : null,
      }));
      const { data: existingMaterials, error: materialReadError } = await supabase
        .from('learning_materials').select('id').eq('unit_id', unitId);
      if (materialReadError) throw materialReadError;
      const retainedMaterialIds = new Set(materialRows.map(material => material.id));
      const removedMaterialIds = (existingMaterials || []).map((material: any) => material.id)
        .filter((id: string) => !retainedMaterialIds.has(id));
      if (removedMaterialIds.length) {
        const { error } = await supabase.from('learning_materials').delete().in('id', removedMaterialIds);
        if (error) throw error;
      }
      if (materialRows.length) {
        let { error } = await supabase.from('learning_materials').upsert(materialRows);
        // Keep existing deployments usable until the countdown migration is applied.
        if (error && /countdown_|column .* does not exist/i.test(error.message || '')) {
          const legacyRows = materialRows.map(({ countdown_enabled, countdown_minutes, countdown_started_at, ...row }) => row);
          ({ error } = await supabase.from('learning_materials').upsert(legacyRows));
        }
        if (error) throw error;

        const { data: persistedMaterials, error: verifyMaterialsError } = await supabase
          .from('learning_materials')
          .select('id, unit_id, title, type, content_url, content_text')
          .in('id', materialRows.map(material => material.id));
        if (verifyMaterialsError) throw verifyMaterialsError;
        if ((persistedMaterials || []).length !== materialRows.length) {
          throw new Error('Materi berhasil dikirim tetapi tidak seluruhnya ditemukan saat verifikasi ulang Supabase.');
        }
        const persistedMaterialsById = new Map((persistedMaterials || []).map((material: any) => [material.id, material]));
        for (const material of materialRows) {
          const persistedMaterial = persistedMaterialsById.get(material.id);
          if (!persistedMaterial
            || persistedMaterial.unit_id !== unitId
            || persistedMaterial.title !== material.title
            || persistedMaterial.type !== material.type
            || (persistedMaterial.content_text || null) !== (material.content_text || null)) {
            throw new Error(`Materi "${material.title}" gagal diverifikasi setelah disimpan ke Supabase.`);
          }
        }

      }

      try {
        await this.syncNormalizedQuizzes(savedMaterials);
      } catch (error) {
        if (isMissingQuizArchitecture(error)) {
          console.warn('Quiz architecture migration 0022 belum diterapkan; quiz tetap disimpan dalam format kompatibilitas lama.', error);
        } else {
          throw error;
        }
      }

      const assignmentRows = savedAssignments.map(savedAssignment => ({
          id: savedAssignment.id,
          unit_id: unitId,
          // A task always belongs to the same period as its unit. Using the
          // unit period prevents an old/stale assignment period from failing
          // the instructor ownership policy or being omitted for students.
          period_id: unit.periodId,
          title: savedAssignment.title,
          description: savedAssignment.description || '',
          deadline: normalizeDeadline(savedAssignment.deadline),
          max_score: savedAssignment.maxScore,
          allowed_file_type: savedAssignment.allowedFileType || 'PDF',
          submission_type: savedAssignment.submissionType || 'ASSIGNMENT',
          countdown_enabled: Boolean(savedAssignment.countdownEnabled),
          countdown_minutes: savedAssignment.countdownEnabled ? Math.max(1, Number(savedAssignment.countdownMinutes) || 1) : 0,
          countdown_started_at: savedAssignment.countdownEnabled ? (savedAssignment.countdownStartedAt || new Date().toISOString()) : null,
        }));
      const { data: existingAssignments, error: assignmentReadError } = await supabase
        .from('assignments').select('id').eq('unit_id', unitId);
      if (assignmentReadError) throw assignmentReadError;
      const retainedAssignmentIds = new Set(assignmentRows.map(assignment => assignment.id));
      const removedAssignmentIds = (existingAssignments || []).map((assignment: any) => assignment.id)
        .filter((id: string) => !retainedAssignmentIds.has(id));
      if (removedAssignmentIds.length) {
        const { error } = await supabase.from('assignments').delete().in('id', removedAssignmentIds);
        if (error) throw error;
      }
      if (assignmentRows.length) {
        let { error } = await supabase.from('assignments').upsert(assignmentRows);
        // Keep existing deployments usable until the countdown/submission migrations are applied.
        if (error && /countdown_|submission_type|column .* does not exist/i.test(error.message || '')) {
          const legacyRows = assignmentRows.map(({ submission_type, countdown_enabled, countdown_minutes, countdown_started_at, ...row }) => row);
          ({ error } = await supabase.from('assignments').upsert(legacyRows));
        }
        if (error) throw error;

        const { data: persistedAssignment, error: verifyAssignmentError } = await supabase
          .from('assignments')
          .select('id, unit_id, period_id')
          .in('id', assignmentRows.map(assignment => assignment.id));
        if (verifyAssignmentError) throw verifyAssignmentError;
        if ((persistedAssignment || []).length !== assignmentRows.length) {
          throw new Error('Tugas berhasil dikirim tetapi tidak seluruhnya ditemukan saat verifikasi ulang Supabase.');
        }
        if ((persistedAssignment || []).some((assignment: any) => assignment.unit_id !== unitId || assignment.period_id !== unit.periodId)) {
          throw new Error('Tugas tersimpan pada unit/periode yang berbeda dan dibatalkan.');
        }
      } else {
        // Removing an assignment from the unit must also remove its persisted
        // row; otherwise the next LMS sync will hydrate the deleted task again.
        const { error: assignmentDeleteError } = await supabase
          .from('assignments')
          .delete()
          .eq('unit_id', unitId);
        if (assignmentDeleteError) throw assignmentDeleteError;
      }
      const savedUnit = { ...unit, id: unitId, materials: savedMaterials, assignments: savedAssignments, assignment: savedAssignments[0] };
      const units = StorageService.getLearningUnits().filter(existing => existing.id !== unit.id && existing.id !== unitId);
      StorageService.saveLearningUnits([...units, savedUnit]);
      return savedUnit;
    }
    const units = StorageService.getLearningUnits().filter(existing => existing.id !== unit.id);
    StorageService.saveLearningUnits([...units, unit]);
    return unit;
  }

  static async deleteLearningUnit(unitId: string): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase.from('learning_units').delete().eq('id', await databaseId(unitId, 'learning-unit'));
      if (error) throw error;
    }
    StorageService.saveLearningUnits(StorageService.getLearningUnits().filter(unit => unit.id !== unitId));
  }

  static async submitQuizAttempt(params: {
    sessionToken?: string;
    materialId: string;
    periodId: string;
    answers: Record<string, string>;
  }): Promise<QuizAttemptResult | null> {
    if (!this.isLiveBackend() || !supabase || !params.sessionToken) return null;
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_session_token: params.sessionToken,
      p_material_id: params.materialId,
      p_period_id: params.periodId,
      p_answers: Object.entries(params.answers).map(([questionId, optionId]) => ({ questionId, optionId })),
    });
    if (error) throw error;
    const result = data || {};
    return {
      attemptId: result.attemptId || undefined,
      score: Number(result.score || 0),
      correct: Number(result.correct || 0),
      total: Number(result.total || 0),
      passed: result.passed == null ? undefined : Boolean(result.passed),
      submittedAt: new Date().toISOString(),
      answers: Array.isArray(result.answers) ? result.answers.map((answer: any) => ({
        questionId: answer.questionId,
        correctOptionId: answer.correctOptionId || undefined,
        isCorrect: Boolean(answer.isCorrect),
      })) : [],
    };
  }

  static async getLatestQuizAttempt(params: {
    sessionToken?: string;
    materialId: string;
    periodId: string;
  }): Promise<QuizAttemptResult | null> {
    if (!this.isLiveBackend() || !supabase || !params.sessionToken) return null;
    const { data, error } = await supabase.rpc('get_student_quiz_attempt', {
      p_session_token: params.sessionToken,
      p_material_id: params.materialId,
      p_period_id: params.periodId,
    });
    if (error) throw error;
    if (!data) return null;
    return {
      attemptId: data.attemptId || undefined,
      score: Number(data.score || 0),
      correct: Number(data.correct || 0),
      total: Number(data.total || 0),
      submittedAt: data.submittedAt || new Date().toISOString(),
      answers: Array.isArray(data.answers) ? data.answers.map((answer: any) => ({
        questionId: answer.questionId,
        correctOptionId: answer.correctOptionId || undefined,
        isCorrect: Boolean(answer.isCorrect),
      })) : [],
    };
  }

  // ====================================================================
  // SUBMISSIONS & ASSESSMENTS
  // ====================================================================
  static async getSubmissions(): Promise<Submission[]> {
    if (!this.isLiveBackend() || !supabase) return StorageService.getSubmissions();

    const { data, error } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
    if (error) throw error;

    return Promise.all((data || []).map(async (row: any) => ({
      id: row.id,
      assignmentId: row.assignment_id,
      studentId: row.student_id,
      periodId: row.period_id,
      fileName: row.file_name,
      fileUrl: row.storage_path ? (await getSubmissionSignedUrl(row.storage_path)) || row.file_url : row.file_url,
      fileSize: row.file_size,
      storagePath: row.storage_path || undefined,
      submittedAt: row.submitted_at,
      status: row.status,
      submissionType: row.submission_type || 'ASSIGNMENT',
      reviewFeedback: row.review_feedback || undefined,
      reviewedAt: row.reviewed_at || undefined,
      revisionNumber: Number(row.revision_number || 1),
    })));
  }

  static async getAssessments(): Promise<Assessment[]> {
    if (!this.isLiveBackend() || !supabase) return StorageService.getAssessments();
    try {
      const { data, error } = await supabase.from('assessments').select('*');
      if (error || !data) return [];
      return data.map((row: any) => ({
        id: row.id,
        periodId: row.period_id,
        studentId: row.student_id,
        qualityScore: Number(row.quality_score || 0),
        entryBehaviorScore: row.entry_behavior_score == null ? undefined : Number(row.entry_behavior_score),
        subCpmkPracticeScore: row.sub_cpmk_practice_score == null ? undefined : Number(row.sub_cpmk_practice_score),
        assignmentScore: row.assignment_score == null ? undefined : Number(row.assignment_score),
        postTestScore: row.post_test_score == null ? undefined : Number(row.post_test_score),
        postTestFileUrl: row.post_test_file_url || undefined,
        attitudeScore: Number(row.attitude_score || 0),
        creativityScore: Number(row.creativity_score || 0),
        reportScore: Number(row.report_score || 0),
        finalScore: Number(row.final_score || 0),
        qualityScores: row.quality_scores || [],
        attitudeScores: row.attitude_scores || [],
        creativityScores: row.creativity_scores || [],
        reportScores: row.report_scores || [],
        feedback: row.feedback || '',
        isPublished: Boolean(row.is_published),
        publishedAt: row.published_at || undefined,
        gradedAt: row.graded_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.warn('Unable to load assessments from Supabase:', error);
      return [];
    }
  }

  static async getRemedials(): Promise<RemedialAssignment[]> {
    if (!supabase) return StorageService.getRemedials();
    const {data,error} = await supabase.from('remedial_assignments').select('*');
    if (error) throw error;
    return Promise.all((data || []).map(async row => ({
      id: row.id, periodId:row.period_id, studentId:row.student_id, title:row.title, description:row.description,
      deadline:row.deadline, status:row.status, submittedAt:row.submitted_at, reviewedAt:row.reviewed_at,
      submissionFileName:row.submission_file_name, submissionStoragePath:row.submission_storage_path,
      submissionFileUrl:row.submission_storage_path ? await getSubmissionSignedUrl(row.submission_storage_path) || undefined : row.submission_file_url,
    })));
  }

  static async saveRemedial(remedial: RemedialAssignment): Promise<void> {
    if (supabase) {
      const {error} = await supabase.from('remedial_assignments').update({
        submission_file_name: remedial.submissionFileName, submission_file_url: remedial.submissionFileUrl,
        submission_storage_path: remedial.submissionStoragePath || null, submitted_at: remedial.submittedAt, status: remedial.status,
      }).eq('id', remedial.id).select('id').single();
      if (error) throw new Error(`Bukti remedial gagal disimpan: ${error.message}`);
    }
    StorageService.saveRemedials(StorageService.getRemedials().map(r => r.id === remedial.id ? remedial : r));
  }

  static async saveRemedialDefinition(remedial: RemedialAssignment): Promise<void> {
    if (supabase) {
      const {error} = await supabase.from('remedial_assignments').upsert({
        id: remedial.id, period_id: remedial.periodId, student_id: remedial.studentId,
        title: remedial.title, description: remedial.description, deadline: remedial.deadline,
        submission_file_name: remedial.submissionFileName || null, submission_file_url: remedial.submissionFileUrl || null,
        submission_storage_path: remedial.submissionStoragePath || null, submitted_at: remedial.submittedAt || null, status: remedial.status, reviewed_at: remedial.reviewedAt || null,
      });
      if (error) throw new Error(`Remedial gagal disimpan: ${error.message}`);
    }
    StorageService.saveRemedials([...StorageService.getRemedials().filter(r => r.id !== remedial.id), remedial]);
  }

  static async saveSubmission(submission: Submission): Promise<Submission> {
    // Keep the upload time as a timezone-aware ISO timestamp. Supabase stores
    // this value in `timestamptz`, and the instructor UI formats it as WITA.
    const persistedSubmission = {
      ...submission,
      submittedAt: new Date().toISOString(),
    };
    if (this.isLiveBackend() && supabase) {
      const submissionClient = supabase;
      const submissionPayload = {
        id: persistedSubmission.id, assignment_id: persistedSubmission.assignmentId, student_id: persistedSubmission.studentId, period_id: persistedSubmission.periodId,
        file_name: persistedSubmission.fileName, file_url: persistedSubmission.fileUrl, file_size: persistedSubmission.fileSize,
        storage_path: persistedSubmission.storagePath || null, submitted_at: persistedSubmission.submittedAt, status: persistedSubmission.status,
        submission_type: persistedSubmission.submissionType || 'ASSIGNMENT',
        review_feedback: persistedSubmission.reviewFeedback || null,
        reviewed_at: persistedSubmission.reviewedAt || null,
        revision_number: persistedSubmission.revisionNumber || 1,
      };
      const persistSubmissionPayload = async (payload: typeof submissionPayload | Omit<typeof submissionPayload, 'submission_type' | 'review_feedback' | 'reviewed_at' | 'revision_number'>) => (
        persistedSubmission.revisionNumber && persistedSubmission.revisionNumber > 1
          ? submissionClient.from('submissions').update(payload).eq('id', persistedSubmission.id).select('submitted_at').single()
          : submissionClient.from('submissions').upsert(payload).select('submitted_at').single()
      );
      let { data, error } = await persistSubmissionPayload(submissionPayload);
      if (error && /submission_type|review_feedback|reviewed_at|revision_number|column .* does not exist/i.test(error.message || '')) {
        const legacyPayload = { ...submissionPayload };
        delete (legacyPayload as any).submission_type;
        delete (legacyPayload as any).review_feedback;
        delete (legacyPayload as any).reviewed_at;
        delete (legacyPayload as any).revision_number;
        ({ data, error } = await persistSubmissionPayload(legacyPayload));
      }
      if (error) throw error;
      if (data?.submitted_at) persistedSubmission.submittedAt = data.submitted_at;
    }
    const stored = StorageService.getSubmissions().filter((item) => !(item.assignmentId === persistedSubmission.assignmentId && item.studentId === persistedSubmission.studentId && item.periodId === persistedSubmission.periodId));
    StorageService.saveSubmissions([...stored, persistedSubmission]);
    return persistedSubmission;
  }

  static async reviewSubmission(submission: Submission): Promise<Submission> {
    if (this.isLiveBackend() && supabase) {
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status: submission.status,
          review_feedback: submission.reviewFeedback || null,
          reviewed_at: submission.reviewedAt || null,
        })
        .eq('id', submission.id)
        .select('status, review_feedback, reviewed_at, revision_number')
        .single();
      if (error) {
        if (/review_feedback|reviewed_at|revision_number|column .* does not exist/i.test(error.message || '')) {
          throw new Error('Fitur pemeriksaan tugas belum aktif di Supabase. Jalankan migrasi 0019_submission_review_workflow.sql.');
        }
        throw error;
      }
      submission = {
        ...submission,
        status: data.status,
        reviewFeedback: data.review_feedback || undefined,
        reviewedAt: data.reviewed_at || undefined,
        revisionNumber: Number(data.revision_number || submission.revisionNumber || 1),
      };
    }
    const stored = StorageService.getSubmissions().map(item => item.id === submission.id ? submission : item);
    StorageService.saveSubmissions(stored);
    return submission;
  }

  static async saveAssessment(assessment: Assessment): Promise<void> {
    const all = StorageService.getAssessments().filter(
      (a) => !(a.periodId === assessment.periodId && a.studentId === assessment.studentId)
    );
    StorageService.saveAssessments([...all, assessment]);

    if (this.isLiveBackend() && supabase) {
      try {
        await supabase.from('assessments').upsert({
          id: assessment.id,
          period_id: assessment.periodId,
          student_id: assessment.studentId,
          quality_score: assessment.qualityScore,
          entry_behavior_score: assessment.entryBehaviorScore,
          sub_cpmk_practice_score: assessment.subCpmkPracticeScore,
          assignment_score: assessment.assignmentScore,
          post_test_score: assessment.postTestScore,
          post_test_file_url: assessment.postTestFileUrl,
          attitude_score: assessment.attitudeScore,
          creativity_score: assessment.creativityScore,
          report_score: assessment.reportScore,
          final_score: assessment.finalScore,
          quality_scores: assessment.qualityScores,
          attitude_scores: assessment.attitudeScores,
          creativity_scores: assessment.creativityScores,
          report_scores: assessment.reportScores,
          feedback: assessment.feedback,
          is_published: assessment.isPublished,
          published_at: assessment.publishedAt,
          graded_at: assessment.gradedAt,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error syncing assessment to Supabase:', err);
      }
    }
  }

  // ====================================================================
  // ATTENDANCE RECORDS (Presensi 5 Hari)
  // ====================================================================
  static async getAttendance(periodId?: string): Promise<AttendanceRecord[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getAttendance();
    }
    try {
      let query = supabase.from('attendance_records').select('*');
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) return StorageService.getAttendance();

      return data.map((a: any) => ({
        id: a.id,
        periodId: a.period_id,
        studentId: a.student_id,
        day1: a.day1,
        day2: a.day2,
        day3: a.day3,
        day4: a.day4,
        day5: a.day5,
        percentage: Number(a.percentage || 100),
        isEligible: Boolean(a.is_eligible ?? true),
        updatedAt: a.updated_at,
      }));
    } catch {
      return StorageService.getAttendance();
    }
  }

  static async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const list = StorageService.getAttendance().filter(
      (a) => !(a.periodId === record.periodId && a.studentId === record.studentId)
    );
    StorageService.saveAttendance([...list, record]);

    if (this.isLiveBackend() && supabase) {
      try {
        const { error } = await supabase.from('attendance_records').upsert({
          period_id: record.periodId,
          student_id: record.studentId,
          day1: record.day1,
          day2: record.day2,
          day3: record.day3,
          day4: record.day4,
          day5: record.day5,
          percentage: record.percentage,
          is_eligible: record.isEligible,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'period_id,student_id' });
        if (error) throw error;
      } catch (err) {
        console.error('Error syncing attendance to Supabase:', err);
        throw err;
      }
    }
  }

  static async saveAttendanceBulk(records: AttendanceRecord[]): Promise<void> {
    if (records.length === 0) return;
    const existing = StorageService.getAttendance();
    const updatedMap = new Map<string, AttendanceRecord>(records.map(r => [`${r.periodId}_${r.studentId}`, r]));
    const merged = [
      ...existing.filter(e => !updatedMap.has(`${e.periodId}_${e.studentId}`)),
      ...records
    ];
    StorageService.saveAttendance(merged);

    if (this.isLiveBackend() && supabase) {
      try {
        const rows = records.map((r) => ({
          period_id: r.periodId,
          student_id: r.studentId,
          day1: r.day1,
          day2: r.day2,
          day3: r.day3,
          day4: r.day4,
          day5: r.day5,
          percentage: r.percentage,
          is_eligible: r.isEligible,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from('attendance_records').upsert(rows, { onConflict: 'period_id,student_id' });
        if (error) throw error;
      } catch (err) {
        console.error('Error batch syncing attendance to Supabase:', err);
        throw err;
      }
    }
  }

  // ====================================================================
  // ANNOUNCEMENTS
  // ====================================================================
  static async getAnnouncements(courseId?: string): Promise<Announcement[]> {
    if (!this.isLiveBackend() || !supabase) {
      const cached = StorageService.getAnnouncements();
      return courseId ? cached.filter(item => item.courseId === courseId) : cached;
    }

    try {
      let query = supabase.from('announcements').select('*').order('published_at', { ascending: false });
      if (courseId) query = query.eq('course_id', courseId);
      const { data, error } = await query;
      if (error) throw error;
      const announcements = (data || []).map((row: any): Announcement => ({
        id: row.id,
        courseId: row.course_id,
        periodId: row.period_id || undefined,
        title: row.title,
        message: row.message,
        priority: row.priority || 'INFO',
        isActive: Boolean(row.is_active),
        publishedAt: row.published_at,
        expiresAt: row.expires_at || undefined,
      }));
      StorageService.saveAnnouncements(announcements);
      return announcements;
    } catch (error) {
      console.warn('Unable to load announcements from Supabase:', error);
      const cached = StorageService.getAnnouncements();
      return courseId ? cached.filter(item => item.courseId === courseId) : cached;
    }
  }

  static async saveAnnouncement(announcement: Announcement): Promise<Announcement> {
    let saved = announcement;
    if (this.isLiveBackend() && supabase) {
      const databaseAnnouncementId = await databaseId(announcement.id, 'announcement');
      const { data, error } = await supabase.from('announcements').upsert({
        id: databaseAnnouncementId,
        course_id: announcement.courseId,
        period_id: announcement.periodId || null,
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        is_active: announcement.isActive,
        published_at: announcement.publishedAt,
        expires_at: announcement.expiresAt || null,
      }).select('*').single();
      if (error) throw new Error(`Pengumuman gagal disimpan: ${error.message}`);
      saved = {
        ...announcement,
        id: data.id,
        publishedAt: data.published_at,
      };
    }

    StorageService.saveAnnouncements([
      ...StorageService.getAnnouncements().filter(item => item.id !== announcement.id && item.id !== saved.id),
      saved,
    ]);
    return saved;
  }

  static async deleteAnnouncement(announcementId: string): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const { error } = await supabase.from('announcements').delete().eq('id', await databaseId(announcementId, 'announcement'));
      if (error) throw new Error(`Pengumuman gagal dihapus: ${error.message}`);
    }
    StorageService.saveAnnouncements(StorageService.getAnnouncements().filter(item => item.id !== announcementId));
  }
}
