import fs from 'fs';
import pg from 'pg';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=['"]?([^'"\r\n]+)/);
const dbUrl = match ? match[1] : '';

const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const resCourses = await pool.query('SELECT id, code, name, semester, academic_year FROM public.courses ORDER BY code ASC;');
    console.log('=== DATA MATA KULIAH (COURSES) DI SERVER NEON ===');
    console.table(resCourses.rows);

    const resUnits = await pool.query('SELECT count(*) as total_units FROM public.learning_units;');
    console.log('Total Unit Pembelajaran:', resUnits.rows[0].total_units);

    const resRubrics = await pool.query('SELECT count(*) as total_rubrics FROM public.rubric_criteria;');
    console.log('Total Kriteria Rubrik:', resRubrics.rows[0].total_rubrics);

    const resSubCPMK = await pool.query('SELECT count(*) as total_sub_cpmk FROM public.course_sub_cpmk;');
    console.log('Total Sub-CPMK:', resSubCPMK.rows[0].total_sub_cpmk);

    const resStudents = await pool.query(`
      SELECT 
        count(*) as total_mahasiswa, 
        count(password_hash) as sudah_punya_password, 
        count(*) - count(password_hash) as belum_aktivasi_password 
      FROM public.students;
    `);
    console.log('\n=== STATUS PASSWORD MAHASISWA ===');
    console.table(resStudents.rows);

    // Ambil sampel beberapa mahasiswa yang sudah punya password dan belum
    const sampleWithPass = await pool.query('SELECT nim, name FROM public.students WHERE password_hash IS NOT NULL LIMIT 5;');
    console.log('Contoh mahasiswa yang sudah memiliki password:');
    console.table(sampleWithPass.rows);

    const s001 = await pool.query("SELECT * FROM public.students WHERE nim = '001';");
    console.log('STUDENT 001:', s001.rows);
    if (s001.rows.length > 0) {
      const sId = s001.rows[0].id;
      const parts = await pool.query(`
        SELECT pp.*, p.name as period_name, p.status as period_status, c.name as course_name, c.status as course_status
        FROM public.practice_participants pp
        JOIN public.practice_periods p ON p.id = pp.period_id
        JOIN public.courses c ON c.id = p.course_id
        WHERE pp.student_id = $1;
      `, [sId]);
      console.log('ENROLLMENTS FOR 001:');
      console.table(parts.rows);

      const words = ['001', '1234', '12345', '123456', '12345678', 'password', 'tester', 'poliwako', 'admin', '1111', '123123'];
      for (const w of words) {
        const res = await pool.query("SELECT (password_hash = crypt($1, password_hash)) as match FROM public.students WHERE nim = '001'", [w]);
        if (res.rows[0]?.match) {
          console.log('>>> TESTER 001 PASSWORD IS:', w);
          break;
        }
      }
    }

    const q = [
      ['courses', 'SELECT * FROM public.courses ORDER BY created_at ASC'],
      ['course_sub_cpmk', 'SELECT * FROM public.course_sub_cpmk'],
      ['rubric_criteria', 'SELECT * FROM public.rubric_criteria'],
      ['practice_periods', 'SELECT * FROM public.practice_periods ORDER BY period_number ASC'],
      ['practice_participants', 'SELECT * FROM public.practice_participants ORDER BY enrolled_at ASC'],
      ['students', 'SELECT id, nim, name, class_name, email, created_at, password_hash IS NOT NULL as has_password FROM public.students'],
      ['learning_units', 'SELECT * FROM public.learning_units ORDER BY unit_number ASC'],
      ['learning_materials', 'SELECT * FROM public.learning_materials ORDER BY created_at ASC'],
      ['assignments', 'SELECT * FROM public.assignments ORDER BY created_at ASC'],
      ['attendance_records', 'SELECT * FROM public.attendance_records'],
      ['submissions', 'SELECT * FROM public.submissions ORDER BY submitted_at DESC'],
      ['assessments', 'SELECT * FROM public.assessments ORDER BY updated_at DESC'],
      ['profiles', 'SELECT * FROM public.profiles'],
      ['announcements', 'SELECT * FROM public.announcements ORDER BY created_at DESC'],
      ['remedials', 'SELECT * FROM public.remedial_assignments ORDER BY created_at DESC'],
    ];
    for (const [name, sql] of q) {
      try {
        await pool.query(sql);
        console.log('OK:', name);
      } catch (e) {
        console.log('FAIL:', name, e.message);
      }
    }
  } catch (err) {
    console.error('Error querying Neon:', err);
  } finally {
    await pool.end();
  }
}

check();
