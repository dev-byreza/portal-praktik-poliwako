// Hybrid API Service: Supabase Backend with Fallback to LocalStorage
// Implements Application Layer as specified in PRD Section 75

import {
  supabase,
  isSupabaseConfigured,
  signInInstructor as authSignInInstructor,
  signUpInstructor as authSignUpInstructor,
  signOutInstructor as authSignOutInstructor,
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
} from '../types';

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
      if (error || !data) return StorageService.getCourses();

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
      console.warn('Fallback to local storage for getCourses:', err);
      return StorageService.getCourses();
    }
  }

  static async saveCourse(course: Course): Promise<void> {
    StorageService.saveCourses([
      ...StorageService.getCourses().filter((c) => c.id !== course.id),
      course,
    ]);

    if (this.isLiveBackend() && supabase) {
      try {
        await supabase.from('courses').upsert({
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
        });
      } catch (err) {
        console.error('Error syncing course to Supabase:', err);
      }
    }
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
      if (error || !data) return StorageService.getStudents();
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
      try {
        await supabase.from('students').upsert({
          id: student.id,
          instructor_id: instructorId,
          nim: student.nim,
          name: student.name,
          class_name: student.className,
          email: student.email,
          password_hash: student.password,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error syncing student to Supabase:', err);
      }
    }
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

  static async savePeriod(period: PracticePeriod): Promise<void> {
    const periods = StorageService.getPeriods().filter((p) => p.id !== period.id);
    StorageService.savePeriods([...periods, period]);

    if (this.isLiveBackend() && supabase) {
      try {
        await supabase.from('practice_periods').upsert({
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
      } catch (err) {
        console.error('Error syncing period to Supabase:', err);
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
        await supabase.from('practice_periods').upsert(rows);
      } catch (err) {
        console.error('Error batch syncing periods to Supabase:', err);
      }
    }
  }

  // ====================================================================
  // PRACTICE PARTICIPANTS
  // ====================================================================
  static async getParticipants(periodId?: string): Promise<PracticeParticipant[]> {
    if (!this.isLiveBackend() || !supabase) {
      return StorageService.getParticipants();
    }
    try {
      let query = supabase.from('practice_participants').select('*, students(*)');
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) return StorageService.getParticipants();

      return data.map((p: any) => ({
        id: p.id,
        periodId: p.period_id,
        studentId: p.student_id,
        student: {
          id: p.students?.id || p.student_id,
          nim: p.students?.nim || '',
          name: p.students?.name || '',
          className: p.students?.class_name || '',
          email: p.students?.email || undefined,
          password: p.students?.password_hash || undefined,
          hasCreatedPassword: Boolean(p.students?.password_hash),
          createdAt: p.students?.created_at || new Date().toISOString(),
        },
        enrolledAt: p.enrolled_at,
        progressStatus: p.progress_status,
        finalProjectSubmittedAt: p.final_project_submitted_at || undefined,
        finalProjectConfirmed: p.final_project_confirmed || false,
      }));
    } catch {
      return StorageService.getParticipants();
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

      return data.map((u: any) => ({
        id: u.id,
        periodId: u.period_id,
        unitNumber: u.unit_number,
        title: u.title,
        description: u.description || '',
        materials: (u.learning_materials || []).map((m: any) => ({
          id: m.id,
          unitId: m.unit_id,
          title: m.title,
          type: m.type,
          contentUrl: m.content_url || undefined,
          contentText: m.content_text || undefined,
          fileSize: m.file_size || undefined,
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
            }
          : undefined,
      }));
    } catch {
      return StorageService.getLearningUnits();
    }
  }

  // ====================================================================
  // SUBMISSIONS & ASSESSMENTS
  // ====================================================================
  static async saveSubmission(submission: Submission): Promise<void> {
    const subs = StorageService.getSubmissions().filter((s) => s.id !== submission.id);
    StorageService.saveSubmissions([...subs, submission]);

    if (this.isLiveBackend() && supabase) {
      try {
        await supabase.from('submissions').upsert({
          id: submission.id,
          assignment_id: submission.assignmentId,
          student_id: submission.studentId,
          period_id: submission.periodId,
          file_name: submission.fileName,
          file_url: submission.fileUrl,
          file_size: submission.fileSize,
          storage_path: (submission as any).storagePath || null,
          submitted_at: submission.submittedAt,
          status: submission.status,
        });
      } catch (err) {
        console.error('Error syncing submission to Supabase:', err);
      }
    }
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
}
