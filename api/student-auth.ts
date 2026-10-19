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

  const { action, nim, password, courseSlug, periodId } = req.body || {};
  const cleanNim = String(nim || '').trim().toLowerCase();

  if (!cleanNim) {
    return res.status(400).json({ exists: false, isEnrolled: false, message: 'NIM wajib diisi.' });
  }

  let client: pg.PoolClient | null = null;
  try {
    client = await getPool().connect();
    if (action === 'lookup') {
      const lookupRes = await client.query(
        'SELECT public.student_auth_lookup($1, $2, $3) as result',
        [cleanNim, courseSlug || null, periodId || null]
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

      const loginRes = await client.query(
        'SELECT public.student_auth_login($1, $2, $3, $4) as result',
        [cleanNim, password, courseSlug || '', periodId || null]
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
      const setRes = await client.query(
        'SELECT public.student_auth_set_password($1, $2, $3, $4, $5) as result',
        [studentId, cleanNim, password, courseSlug || '', periodId || null]
      );
      const result = setRes.rows[0]?.result || { success: false, message: 'Gagal membuat password.' };
      return res.status(200).json(result);
    }

    if (action === 'create_period_session') {
      const { sessionToken } = req.body || {};
      const sessRes = await client.query(
        'SELECT public.student_create_period_session($1, $2, $3) as result',
        [sessionToken, courseSlug, periodId]
      );
      return res.status(200).json({ sessionToken: sessRes.rows[0]?.result || sessionToken });
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
