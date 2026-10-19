import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_7yzdZokMS8gw@ep-quiet-lab-b39rfs7j-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

let pool: pg.Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getPool();
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
    ] = await Promise.all([
      pool.query('SELECT * FROM public.courses ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.course_sub_cpmk'),
      pool.query('SELECT * FROM public.rubric_criteria'),
      pool.query('SELECT * FROM public.practice_periods ORDER BY period_number ASC'),
      pool.query('SELECT * FROM public.practice_participants ORDER BY enrolled_at ASC'),
      pool.query('SELECT id, nim, name, class_name, email, created_at, password_hash IS NOT NULL as has_password FROM public.students'),
      pool.query('SELECT * FROM public.learning_units ORDER BY unit_number ASC'),
      pool.query('SELECT * FROM public.learning_materials ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.assignments ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.attendance_records'),
      pool.query('SELECT * FROM public.submissions ORDER BY submitted_at DESC'),
      pool.query('SELECT * FROM public.assessments ORDER BY updated_at DESC'),
      pool.query('SELECT * FROM public.profiles'),
      pool.query('SELECT * FROM public.announcements ORDER BY published_at DESC'),
      pool.query('SELECT * FROM public.remedial_assignments ORDER BY created_at DESC'),
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
        scale1Desc: rc.scale_1_desc || '',
        scale2Desc: rc.scale_2_desc || '',
        scale3Desc: rc.scale_3_desc || '',
        scale4Desc: rc.scale_4_desc || '',
        scale5Desc: rc.scale_5_desc || '',
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
      qualityComponents: c.quality_components || [],
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

    // Materials by Unit
    const materialsByUnit = new Map<string, any[]>();
    for (const m of materialsRes.rows) {
      const list = materialsByUnit.get(m.unit_id) || [];
      list.push({
        id: m.id,
        unitId: m.unit_id,
        title: m.title,
        type: m.type,
        fileUrl: m.content_url || m.file_url || null,
        contentText: m.content_text,
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
        submissionType: a.submission_type || 'ASSIGNMENT',
      });
      assignmentsByUnit.set(a.unit_id, list);
    }

    // Learning Units
    const learningUnits = unitsRes.rows.map(u => ({
      id: u.id,
      periodId: u.period_id,
      courseId: u.course_id,
      title: u.title,
      description: u.description || '',
      unitNumber: u.unit_number,
      materials: materialsByUnit.get(u.id) || [],
      assignments: assignmentsByUnit.get(u.id) || [],
      countdownEnabled: Boolean(u.countdown_enabled),
      countdownMinutes: u.countdown_minutes ? Number(u.countdown_minutes) : undefined,
      countdownStartedAt: u.countdown_started_at || undefined,
    }));

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
      fileSize: s.file_size ? Number(s.file_size) : undefined,
      storagePath: s.storage_path,
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
      entryBehaviorScore: a.entry_behavior_score ? Number(a.entry_behavior_score) : 0,
      subCpmkPracticeScore: a.sub_cpmk_practice_score ? Number(a.sub_cpmk_practice_score) : 0,
      assignmentScore: a.assignment_score ? Number(a.assignment_score) : 0,
      postTestScore: a.post_test_score ? Number(a.post_test_score) : 0,
      attitudeScore: a.attitude_score ? Number(a.attitude_score) : 0,
      creativityScore: a.creativity_score ? Number(a.creativity_score) : 0,
      reportScore: a.report_score ? Number(a.report_score) : 0,
      finalScore: a.final_score ? Number(a.final_score) : 0,
      feedback: a.feedback || '',
      isPublished: Boolean(a.is_published),
      publishedAt: a.published_at || undefined,
      gradedAt: a.graded_at || undefined,
      qualityScores: a.quality_scores || {},
      attitudeScores: a.attitude_scores || {},
      creativityScores: a.creativity_scores || {},
      reportScores: a.report_scores || {},
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

    return res.status(200).json({
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
        isActive: a.is_active,
        createdAt: a.published_at,
      })),
      remedials: remedialsRes.rows.map(r => ({
        id: r.id,
        periodId: r.period_id,
        studentId: r.student_id,
        assignmentId: r.assignment_id,
        remedialDescription: r.remedial_description || '',
        status: r.status,
        deadline: r.deadline,
        createdAt: r.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Neon data error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data dari Neon: ' + error.message });
  }
}
