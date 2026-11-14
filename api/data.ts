import { getDbPool } from './_db.js';

let cachedData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 4000; // 4 seconds in-memory cache to coalesce bursts

export function invalidateDataCache() {
  cachedData = null;
  lastCacheTime = 0;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  res.setHeader('Cache-Control', 'public, max-age=3, s-maxage=5, stale-while-revalidate=15');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  const forceFresh = req.query?.fresh === 'true' || req.headers?.['cache-control'] === 'no-cache';
  if (!forceFresh && cachedData && now - lastCacheTime < CACHE_TTL_MS) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedData);
  }

  const pool = getDbPool();
  try {
    const [
      coursesRes,
      subCpmkRes,
      rubricsRes,
      periodsRes,
      participantsRes,
      studentsRes,
      unitsRes,
      materialsRes,
      assignmentsRes,
      attendanceRes,
      submissionsRes,
      assessmentsRes,
      profilesRes,
      announcementsRes,
      remedialsRes,
      quizDefsRes,
      quizQuestionsRes,
      quizOptionsRes,
    ] = await Promise.all([
      pool.query('SELECT * FROM public.courses ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.course_sub_cpmk'),
      pool.query('SELECT * FROM public.rubric_criteria'),
      pool.query('SELECT * FROM public.practice_periods ORDER BY period_number ASC'),
      pool.query('SELECT * FROM public.practice_participants ORDER BY enrolled_at ASC'),
      pool.query('SELECT id, nim, name, class_name, email, created_at, password_hash IS NOT NULL as has_password FROM public.students ORDER BY nim ASC'),
      pool.query('SELECT * FROM public.learning_units ORDER BY unit_number ASC'),
      pool.query('SELECT * FROM public.learning_materials ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.assignments ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.attendance_records'),
      pool.query('SELECT * FROM public.submissions ORDER BY submitted_at DESC'),
      pool.query('SELECT * FROM public.assessments ORDER BY updated_at DESC'),
      pool.query('SELECT * FROM public.profiles'),
      pool.query('SELECT * FROM public.announcements ORDER BY published_at DESC'),
      pool.query('SELECT * FROM public.remedial_assignments ORDER BY created_at DESC'),
      pool.query('SELECT * FROM public.quiz_definitions').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM public.quiz_questions ORDER BY position ASC').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM public.quiz_options ORDER BY position ASC').catch(() => ({ rows: [] })),
    ]);

    // Student lookup map
    const studentMap = new Map<string, any>();
    for (const s of studentsRes.rows) {
      studentMap.set(s.id, {
        id: s.id,
        nim: s.nim,
        name: s.name,
        className: s.class_name || '',
        email: s.email || undefined,
        hasCreatedPassword: Boolean(s.has_password),
        createdAt: s.created_at,
      });
    }

    // Sub-CPMK map by course_id
    const subCpmkByCourse = new Map<string, any[]>();
    for (const sc of subCpmkRes.rows) {
      const list = subCpmkByCourse.get(sc.course_id) || [];
      list.push({
        id: sc.id,
        code: sc.code,
        description: sc.description,
        weightPercent: sc.weight_percent ? Number(sc.weight_percent) : undefined,
      });
      subCpmkByCourse.set(sc.course_id, list);
    }

    // Rubric criteria map by course_id
    const rubricsByCourse = new Map<string, any[]>();
    for (const rc of rubricsRes.rows) {
      const list = rubricsByCourse.get(rc.course_id) || [];
      list.push({
        id: rc.id,
        subCpmkId: rc.sub_cpmk_id || undefined,
        name: rc.name,
        category: rc.category || 'QUALITY',
        description: rc.description || '',
      });
      rubricsByCourse.set(rc.course_id, list);
    }

    // Courses with Sub-CPMK & Rubrics
    const courses = coursesRes.rows.map(c => ({
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
      qualityComponents: Array.isArray(c.quality_components) ? c.quality_components : undefined,
      driveFolderUrl: c.drive_folder_url || undefined,
      masterDriveUrl: c.master_drive_url || undefined,
      subCpmks: subCpmkByCourse.get(c.id) || [],
      qualityRubrics: rubricsByCourse.get(c.id) || [],
      createdAt: c.created_at,
    }));

    // Periods
    const periods = periodsRes.rows.map(p => ({
      id: p.id,
      courseId: p.course_id,
      name: p.name,
      periodNumber: p.period_number,
      startDate: p.start_date,
      endDate: p.end_date,
      status: p.status,
      finalProjectDriveUrl: p.final_project_drive_url || undefined,
      instructorDriveUrl: p.instructor_drive_url || undefined,
      finalProjectDescription: p.final_project_description || undefined,
      finalProjectEnabled: p.final_project_enabled === true,
      createdAt: p.created_at,
    }));

    // Participants with Student join
    const participants = participantsRes.rows.map(p => ({
      id: p.id,
      periodId: p.period_id,
      studentId: p.student_id,
      student: studentMap.get(p.student_id) || {
        id: p.student_id,
        nim: '',
        name: '',
        className: '',
        createdAt: new Date().toISOString(),
      },
      enrolledAt: p.enrolled_at || new Date().toISOString(),
      progressStatus: p.progress_status || 'NOT_STARTED',
      finalProjectSubmittedAt: p.final_project_submitted_at || undefined,
      finalProjectConfirmed: Boolean(p.final_project_confirmed),
      finalProjectUrl: p.final_project_url || undefined,
      finalProjectReviewStatus: p.final_project_review_status || undefined,
      finalProjectFeedback: p.final_project_feedback || undefined,
    }));

    // Quizzes by Material
    const optionsByQuestion = new Map<string, any[]>();
    for (const opt of quizOptionsRes.rows) {
      const list = optionsByQuestion.get(opt.question_id) || [];
      list.push(opt);
      optionsByQuestion.set(opt.question_id, list);
    }
    const questionsByQuiz = new Map<string, any[]>();
    for (const q of quizQuestionsRes.rows) {
      const list = questionsByQuiz.get(q.quiz_id) || [];
      list.push(q);
      questionsByQuiz.set(q.quiz_id, list);
    }
    const quizByMaterial = new Map<string, any>();
    for (const qd of quizDefsRes.rows) {
      const questions = (questionsByQuiz.get(qd.id) || [])
        .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
        .map((q: any) => ({
          id: q.id,
          prompt: q.prompt || '',
          imageUrl: q.image_url || undefined,
          explanation: q.explanation || undefined,
          options: (optionsByQuestion.get(q.id) || [])
            .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
            .map((opt: any) => ({
              id: opt.id,
              text: opt.option_text || '',
            })),
          ...(q.correct_option_id ? { correctOptionId: q.correct_option_id } : {}),
        }));
      quizByMaterial.set(qd.material_id, {
        description: qd.description || undefined,
        shuffleQuestions: Boolean(qd.shuffle_questions),
        passScore: Number(qd.pass_score ?? 70),
        maxAttempts: Number(qd.max_attempts ?? 0),
        questions,
      });
    }

    // Materials by Unit
    const materialsByUnit = new Map<string, any[]>();
    for (const m of materialsRes.rows) {
      if (/dummy\.pdf/i.test(m.content_url || '')) continue;
      const list = materialsByUnit.get(m.unit_id) || [];
      const quiz = quizByMaterial.get(m.id);
      const url = m.content_url || m.file_url || undefined;
      list.push({
        id: m.id,
        unitId: m.unit_id,
        title: m.title,
        type: m.type,
        contentUrl: url,
        fileUrl: url || null,
        contentText: m.type === 'QUIZ'
          ? (quiz?.description || m.content_text || undefined)
          : (m.content_text || undefined),
        quiz,
        fileSize: m.file_size || undefined,
        countdownEnabled: Boolean(m.countdown_enabled),
        countdownMinutes: m.countdown_minutes ? Number(m.countdown_minutes) : undefined,
        countdownStartedAt: m.countdown_started_at || undefined,
      });
      materialsByUnit.set(m.unit_id, list);
    }

    // Assignments by Unit
    const assignmentsByUnit = new Map<string, any[]>();
    for (const a of assignmentsRes.rows) {
      const list = assignmentsByUnit.get(a.unit_id) || [];
      list.push({
        id: a.id,
        unitId: a.unit_id,
        periodId: a.period_id,
        title: a.title,
        description: a.description || '',
        deadline: a.deadline,
        maxScore: a.max_score,
        allowedFileType: a.allowed_file_type,
        countdownEnabled: Boolean(a.countdown_enabled),
        countdownMinutes: a.countdown_minutes ? Number(a.countdown_minutes) : undefined,
        countdownStartedAt: a.countdown_started_at || undefined,
        submissionType: (a.submission_type && a.submission_type !== 'ASSIGNMENT')
          ? a.submission_type
          : (/laporan|report/i.test(a.title || '') ? 'REPORT' : 'ASSIGNMENT'),
      });
      assignmentsByUnit.set(a.unit_id, list);
    }

    // Learning Units
    const learningUnits = unitsRes.rows.map(u => {
      const unitAssignments = assignmentsByUnit.get(u.id) || [];
      return {
        id: u.id,
        periodId: u.period_id,
        title: u.title,
        description: u.description || '',
        unitNumber: u.unit_number,
        materials: materialsByUnit.get(u.id) || [],
        assignments: unitAssignments,
        assignment: unitAssignments[0],
        countdownEnabled: Boolean(u.countdown_enabled),
        countdownMinutes: u.countdown_minutes ? Number(u.countdown_minutes) : undefined,
        countdownStartedAt: u.countdown_started_at || undefined,
      };
    });

    // Attendance Records
    const attendance = attendanceRes.rows.map(r => ({
      id: r.id,
      periodId: r.period_id,
      studentId: r.student_id,
      day1: r.day1,
      day2: r.day2,
      day3: r.day3,
      day4: r.day4,
      day5: r.day5,
      percentage: r.percentage !== null ? Number(r.percentage) : undefined,
      isEligible: r.is_eligible !== false,
      updatedAt: r.updated_at,
    }));

    // Submissions
    const submissions = submissionsRes.rows.map(s => ({
      id: s.id,
      assignmentId: s.assignment_id,
      studentId: s.student_id,
      periodId: s.period_id,
      fileName: s.file_name,
      fileUrl: s.file_url,
      fileSize: s.file_size || '0 KB',
      storagePath: s.storage_path || undefined,
      submittedAt: s.submitted_at,
      status: s.status,
      submissionType: s.submission_type || 'ASSIGNMENT',
      reviewFeedback: s.review_feedback || undefined,
      reviewedAt: s.reviewed_at || undefined,
      revisionNumber: s.revision_number ? Number(s.revision_number) : 1,
    }));

    // Assessments
    const assessments = assessmentsRes.rows.map(a => ({
      id: a.id,
      periodId: a.period_id,
      studentId: a.student_id,
      qualityScore: a.quality_score ? Number(a.quality_score) : 0,
      entryBehaviorScore: a.entry_behavior_score == null ? undefined : Number(a.entry_behavior_score),
      subCpmkPracticeScore: a.sub_cpmk_practice_score == null ? undefined : Number(a.sub_cpmk_practice_score),
      assignmentScore: a.assignment_score == null ? undefined : Number(a.assignment_score),
      postTestScore: a.post_test_score == null ? undefined : Number(a.post_test_score),
      postTestFileUrl: a.post_test_file_url || undefined,
      attitudeScore: a.attitude_score ? Number(a.attitude_score) : 0,
      creativityScore: a.creativity_score ? Number(a.creativity_score) : 0,
      reportScore: a.report_score ? Number(a.report_score) : 0,
      finalScore: a.final_score ? Number(a.final_score) : 0,
      feedback: a.feedback || '',
      isPublished: Boolean(a.is_published),
      publishedAt: a.published_at || undefined,
      gradedAt: a.graded_at || new Date().toISOString(),
      updatedAt: a.updated_at || new Date().toISOString(),
      qualityScores: Array.isArray(a.quality_scores) ? a.quality_scores : [],
      attitudeScores: Array.isArray(a.attitude_scores) ? a.attitude_scores : [],
      creativityScores: Array.isArray(a.creativity_scores) ? a.creativity_scores : [],
      reportScores: Array.isArray(a.report_scores) ? a.report_scores : [],
    }));

    // Instructor Directory
    const instructorDirectory: Record<string, any> = {};
    for (const p of profilesRes.rows) {
      instructorDirectory[p.id] = {
        id: p.id,
        name: p.name || 'Instruktur',
        email: p.email,
        nip: p.nip || '',
        department: p.department || '',
        avatarUrl: p.avatar_url || '',
      };
    }

    const responseData = {
      courses,
      periods,
      participants,
      learningUnits,
      attendance,
      submissions,
      assessments,
      instructorDirectory,
      students: Array.from(studentMap.values()),
      announcements: announcementsRes.rows.map(a => ({
        id: a.id,
        courseId: a.course_id,
        periodId: a.period_id || undefined,
        title: a.title,
        message: a.message,
        priority: a.priority || 'INFO',
        isActive: Boolean(a.is_active),
        publishedAt: a.published_at,
        expiresAt: a.expires_at || undefined,
        createdAt: a.published_at,
      })),
      remedials: remedialsRes.rows.map(r => ({
        id: r.id,
        periodId: r.period_id,
        studentId: r.student_id,
        title: r.title,
        description: r.description || '',
        deadline: r.deadline,
        status: r.status,
        submittedAt: r.submitted_at || undefined,
        reviewedAt: r.reviewed_at || undefined,
        submissionFileName: r.submission_file_name || undefined,
        submissionStoragePath: r.submission_storage_path || undefined,
        submissionFileUrl: r.submission_file_url || undefined,
      })),
    };

    cachedData = responseData;
    lastCacheTime = Date.now();
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Neon data error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data dari Neon: ' + error.message });
  }
}
