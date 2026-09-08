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
} from './supabaseClient';
import { StorageService } from './storageService';
import {
  Course,
  Student,
  PracticePeriod,
  PracticeParticipant,
  LearningUnit,
  UnitProgress,
  Submission,
  AttendanceRecord,
  Assessment,
  RemedialAssignment,
  FeedbackRule,
  InstructorProfile,
  PublicInstructorProfile,
} from '../types';

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
  ): Promise<{ user?: any; error: Error | null }> {
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
      let query = supabase.from('courses').select(`
        *,
        course_sub_cpmk (*),
        rubric_criteria (*)
      `);
      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }
      const { data, error } = await query;
      if (error || !data) return [];

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
      console.warn('Unable to load scoped courses from Supabase:', err);
      return [];
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

  // ====================================================================
  // MASTER STUDENTS
  // ====================================================================
  static async getStudents(): Promise<Student[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getStudents();
    }
    try {
      const { data, error } = await supabase.from('students').select('*').order('nim', { ascending: true });
      if (error || !data || data.length === 0) return StorageService.getStudents();
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
    } catch {
      return StorageService.getStudents();
    }
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
      if (error || !data) return StorageService.getPeriods();
      return data.map((p: any) => ({
        id: p.id,
        courseId: p.course_id,
        name: p.name,
        periodNumber: p.period_number,
        startDate: p.start_date,
        endDate: p.end_date,
        status: p.status,
        finalProjectDriveUrl: p.final_project_drive_url || undefined,
        createdAt: p.created_at,
      }));
    } catch {
      return StorageService.getPeriods();
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
    });

    try {
      let query = supabase.from('practice_participants').select('*, students(*)');
      if (periodId) query = query.eq('period_id', periodId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data.map(p => mapParticipant(p));

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
      return [];
    }
  }

  // ====================================================================
  // LEARNING UNITS & MATERIALS
  // ====================================================================
  static async getLearningUnits(periodId?: string): Promise<LearningUnit[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getLearningUnits();
    }
    try {
      let query = supabase
        .from('learning_units')
        .select('*, learning_materials(*), assignments(*)')
        .order('unit_number', { ascending: true });
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) return StorageService.getLearningUnits();

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
        materials: [...(u.learning_materials || [])]
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
          contentText: m.content_text || undefined,
          fileSize: m.file_size || undefined,
          countdownEnabled: Boolean(m.countdown_enabled),
          countdownMinutes: Number(m.countdown_minutes) || undefined,
          countdownStartedAt: m.countdown_started_at || undefined,
          })),
        assignment: u.assignments?.[0]
          ? {
              id: u.assignments[0].id,
              unitId: u.assignments[0].unit_id,
              periodId: u.assignments[0].period_id,
              title: u.assignments[0].title,
              description: u.assignments[0].description,
              deadline: u.assignments[0].deadline,
              maxScore: u.assignments[0].max_score,
              allowedFileType: u.assignments[0].allowed_file_type,
              countdownEnabled: Boolean(u.assignments[0].countdown_enabled),
              countdownMinutes: Number(u.assignments[0].countdown_minutes) || undefined,
              countdownStartedAt: u.assignments[0].countdown_started_at || undefined,
              submissionType: (u.assignments[0].submission_type && u.assignments[0].submission_type !== 'ASSIGNMENT')
                ? u.assignments[0].submission_type
                : (/laporan|report/i.test(u.assignments[0].title || '') ? 'REPORT' : 'ASSIGNMENT'),
            }
          : undefined,
      }));
    } catch {
      return StorageService.getLearningUnits();
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
      const savedAssignment = unit.assignment ? {
        ...unit.assignment,
        id: await databaseId(unit.assignment.id, `assignment:${unit.id}`),
        unitId,
      } : undefined;
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
        content_text: material.contentText || null,
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

      }

      if (savedAssignment) {
        const assignmentPayload = {
          id: savedAssignment.id,
          unit_id: unitId,
          period_id: savedAssignment.periodId || unit.periodId,
          title: savedAssignment.title,
          description: savedAssignment.description || '',
          deadline: normalizeDeadline(savedAssignment.deadline),
          max_score: savedAssignment.maxScore,
          allowed_file_type: savedAssignment.allowedFileType || 'PDF',
          submission_type: savedAssignment.submissionType || 'ASSIGNMENT',
          countdown_enabled: Boolean(savedAssignment.countdownEnabled),
          countdown_minutes: savedAssignment.countdownEnabled ? Math.max(1, Number(savedAssignment.countdownMinutes) || 1) : 0,
          countdown_started_at: savedAssignment.countdownEnabled ? (savedAssignment.countdownStartedAt || new Date().toISOString()) : null,
        };
        let { error } = await supabase.from('assignments').upsert(assignmentPayload);
        // Keep existing deployments usable until the countdown/submission migrations are applied.
        if (error && /countdown_|submission_type|column .* does not exist/i.test(error.message || '')) {
          const legacyPayload = { ...assignmentPayload };
          delete (legacyPayload as any).submission_type;
          delete (legacyPayload as any).countdown_enabled;
          delete (legacyPayload as any).countdown_minutes;
          delete (legacyPayload as any).countdown_started_at;
          ({ error } = await supabase.from('assignments').upsert(legacyPayload));
        }
        if (error) throw error;

        const persistedAssignmentId = savedAssignment.id;
        const { data: persistedAssignment, error: verifyAssignmentError } = await supabase
          .from('assignments')
          .select('id')
          .eq('id', persistedAssignmentId)
          .maybeSingle();
        if (verifyAssignmentError) throw verifyAssignmentError;
        if (!persistedAssignment) {
          throw new Error('Tugas berhasil dikirim tetapi tidak ditemukan saat verifikasi ulang Supabase.');
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
      const savedUnit = { ...unit, id: unitId, materials: savedMaterials, assignment: savedAssignment };
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

  static async saveSubmission(submission: Submission): Promise<void> {
    if (this.isLiveBackend() && supabase) {
      const submissionPayload = {
        id: submission.id, assignment_id: submission.assignmentId, student_id: submission.studentId, period_id: submission.periodId,
        file_name: submission.fileName, file_url: submission.fileUrl, file_size: submission.fileSize,
        storage_path: submission.storagePath || null, submitted_at: submission.submittedAt, status: submission.status,
        submission_type: submission.submissionType || 'ASSIGNMENT',
      };
      let { error } = await supabase.from('submissions').upsert(submissionPayload);
      if (error && /submission_type|column .* does not exist/i.test(error.message || '')) {
        const legacyPayload = { ...submissionPayload };
        delete (legacyPayload as any).submission_type;
        ({ error } = await supabase.from('submissions').upsert(legacyPayload));
      }
      if (error) throw error;
    }
    const stored = StorageService.getSubmissions().filter((item) => !(item.assignmentId === submission.assignmentId && item.studentId === submission.studentId && item.periodId === submission.periodId));
    StorageService.saveSubmissions([...stored, submission]);
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
}
