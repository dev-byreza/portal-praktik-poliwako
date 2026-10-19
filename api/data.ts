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
    const [coursesRes, periodsRes, participantsRes, unitsRes, materialsRes, assignmentsRes, rubricsRes] = await Promise.all([
      pool.query('SELECT * FROM public.courses ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.practice_periods ORDER BY period_number ASC'),
      pool.query('SELECT * FROM public.practice_participants'),
      pool.query('SELECT * FROM public.learning_units ORDER BY unit_number ASC'),
      pool.query('SELECT * FROM public.learning_materials ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.assignments ORDER BY created_at ASC'),
      pool.query('SELECT * FROM public.rubric_criteria ORDER BY created_at ASC'),
    ]);

    // Map units with materials and assignments
    const materialsByUnit = new Map<string, any[]>();
    for (const m of materialsRes.rows) {
      const list = materialsByUnit.get(m.unit_id) || [];
      list.push({
        id: m.id,
        unitId: m.unit_id,
        title: m.title,
        type: m.type,
        fileUrl: m.file_url,
        contentText: m.content_text,
        sortOrder: m.sort_order ?? 0,
      });
      materialsByUnit.set(m.unit_id, list);
    }

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
    }));

    const periods = periodsRes.rows.map(p => ({
      id: p.id,
      courseId: p.course_id,
      academicYear: p.academic_year,
      semester: p.semester,
      periodNumber: p.period_number,
      classGroup: p.class_group,
      status: p.status,
      startDate: p.start_date,
      endDate: p.end_date,
    }));

    const participants = participantsRes.rows.map(p => ({
      id: p.id,
      periodId: p.period_id,
      studentId: p.student_id,
      attendancePercentage: Number(p.attendance_percentage || 0),
    }));

    return res.status(200).json({
      courses,
      periods,
      participants,
      learningUnits,
      rubrics: rubricsRes.rows,
    });
  } catch (error: any) {
    console.error('Neon data error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data dari Neon: ' + error.message });
  }
}
