import { getDbPool } from './_db.ts';
import type pg from 'pg';

function toValidUuid(val?: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, nim, password, courseSlug, periodId, sessionToken, token, studentId } = req.body || {};
  const cleanNim = String(nim || '').trim().toLowerCase();

  if (!['restore_session', 'list_enrollments', 'create_period_session', 'issue_reset_token'].includes(action) && !cleanNim) {
    return res.status(400).json({ exists: false, isEnrolled: false, message: 'NIM wajib diisi.' });
  }

  let client: pg.PoolClient | null = null;
  try {
    client = await getDbPool().connect();
    if (action === 'lookup') {
      const validPeriodId = toValidUuid(periodId);
      const lookupRes = await client.query(
        'SELECT public.student_auth_lookup($1, $2, $3) as result',
        [cleanNim, courseSlug || null, validPeriodId]
      );
      const result = lookupRes.rows[0]?.result || { exists: false, isEnrolled: false, hasCreatedPassword: false };

      if (result.exists) {
        const stdRes = await client.query(
          'SELECT id, nim, name, class_name, email, created_at FROM public.students WHERE lower(trim(nim)) = $1 LIMIT 1',
          [cleanNim]
        );
        if (stdRes.rows[0]) {
          result.student = {
            id: stdRes.rows[0].id,
            nim: stdRes.rows[0].nim,
            name: stdRes.rows[0].name,
            className: stdRes.rows[0].class_name,
            email: stdRes.rows[0].email,
            createdAt: stdRes.rows[0].created_at,
          };
        }
      }
      return res.status(200).json(result);
    }

    if (action === 'login') {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password wajib diisi.' });
      }

      let resolvedCourseSlug = courseSlug || null;
      let resolvedPeriodId = toValidUuid(periodId);
      if (!resolvedPeriodId) {
        const enrRes = await client.query(`
          SELECT pp.period_id, c.slug as course_slug
          FROM public.practice_participants pp
          JOIN public.practice_periods p ON p.id = pp.period_id
          JOIN public.courses c ON c.id = p.course_id
          JOIN public.students s ON s.id = pp.student_id
          WHERE lower(trim(s.nim)) = $1
            AND ($2::text IS NULL OR c.slug = $2)
          ORDER BY (p.status = 'ACTIVE') DESC, p.period_number ASC
          LIMIT 1
        `, [cleanNim, resolvedCourseSlug]);
        if (enrRes.rows[0]) {
          resolvedPeriodId = enrRes.rows[0].period_id;
          resolvedCourseSlug = enrRes.rows[0].course_slug;
        }
      }

      const loginRes = await client.query(
        'SELECT public.student_auth_login($1, $2, $3, $4) as result',
        [cleanNim, password, resolvedCourseSlug, resolvedPeriodId]
      );
      const result = loginRes.rows[0]?.result || { success: false, message: 'Login gagal.' };
      return res.status(200).json(result);
    }

    if (action === 'set_password') {
      if (!password || password.length < 4) {
        return res.status(400).json({ success: false, message: 'Password minimal 4 karakter.' });
      }

      const stdRes = await client.query(
        'SELECT id FROM public.students WHERE lower(trim(nim)) = $1 LIMIT 1',
        [cleanNim]
      );
      if (!stdRes.rows[0]) {
        return res.status(404).json({ success: false, message: 'Data mahasiswa tidak ditemukan.' });
      }

      const studentId = stdRes.rows[0].id;
      let resolvedCourseSlug = courseSlug || null;
      let resolvedPeriodId = toValidUuid(periodId);
      if (!resolvedPeriodId) {
        const enrRes = await client.query(`
          SELECT pp.period_id, c.slug as course_slug
          FROM public.practice_participants pp
          JOIN public.practice_periods p ON p.id = pp.period_id
          JOIN public.courses c ON c.id = p.course_id
          WHERE pp.student_id = $1
            AND ($2::text IS NULL OR c.slug = $2)
          ORDER BY (p.status = 'ACTIVE') DESC, p.period_number ASC
          LIMIT 1
        `, [studentId, resolvedCourseSlug]);
        if (enrRes.rows[0]) {
          resolvedPeriodId = enrRes.rows[0].period_id;
          resolvedCourseSlug = enrRes.rows[0].course_slug;
        }
      }

      const setRes = await client.query(
        'SELECT public.student_auth_set_password($1, $2, $3, $4, $5) as result',
        [studentId, cleanNim, password, resolvedCourseSlug, resolvedPeriodId]
      );
      const result = setRes.rows[0]?.result || { success: false, message: 'Gagal membuat password.' };
      return res.status(200).json(result);
    }

    if (action === 'create_period_session') {
      const sessRes = await client.query(
        'SELECT public.student_create_period_session($1, $2, $3) as result',
        [sessionToken, courseSlug, periodId]
      );
      return res.status(200).json({ sessionToken: sessRes.rows[0]?.result || sessionToken });
    }

    if (action === 'restore_session') {
      const sessRes = await client.query(
        'SELECT public.student_restore_session_profile($1) as result',
        [sessionToken]
      );
      return res.status(200).json(sessRes.rows[0]?.result || null);
    }

    if (action === 'list_enrollments') {
      const enrRes = await client.query(
        'SELECT public.student_list_course_enrollments($1) as result',
        [sessionToken]
      );
      return res.status(200).json(enrRes.rows[0]?.result || []);
    }

    if (action === 'reset_password_with_token') {
      const resetRes = await client.query(
        'SELECT public.student_auth_reset_password_with_token($1, $2, $3, $4, $5) as result',
        [cleanNim, String(token || '').trim().toUpperCase(), password, courseSlug || null, periodId || null]
      );
      const result = resetRes.rows[0]?.result || { success: false, message: 'Password belum dapat direset.' };
      return res.status(200).json(result);
    }

    if (action === 'issue_reset_token') {
      const issueRes = await client.query(
        'SELECT public.student_auth_issue_password_reset_token($1) as result',
        [studentId]
      );
      const result = issueRes.rows[0]?.result || { success: false, message: 'Gagal menerbitkan token.' };
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: 'Aksi tidak valid' });
  } catch (error: any) {
    console.error('Neon student auth error:', error);
    return res.status(500).json({
      exists: false,
      isEnrolled: false,
      hasCreatedPassword: false,
      message: 'Gagal memverifikasi ke database Neon: ' + error.message,
    });
  } finally {
    if (client) client.release();
  }
}
