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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
  }

  const client = await getPool().connect();
  try {
    // 1. Verify credentials from auth.users
    const userRes = await client.query(`
      SELECT 
        u.id, 
        u.email, 
        (crypt($1, u.encrypted_password) = u.encrypted_password) as password_matches
      FROM auth.users u
      WHERE lower(trim(u.email)) = $2
      LIMIT 1
    `, [password, cleanEmail]);

    if (!userRes.rows[0]) {
      return res.status(401).json({ success: false, message: 'Email tidak ditemukan.' });
    }

    if (!userRes.rows[0].password_matches) {
      return res.status(401).json({ success: false, message: 'Password salah.' });
    }

    const userId = userRes.rows[0].id;

    // 2. Fetch instructor profile
    const profileRes = await client.query(`
      SELECT id, email, name, nip, department, avatar_url
      FROM public.profiles
      WHERE id = $1
      LIMIT 1
    `, [userId]);

    const profile = profileRes.rows[0] || {
      id: userId,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      department: 'Rekayasa Perancangan Mekanik',
    };

    return res.status(200).json({
      success: true,
      message: 'Login instruktur berhasil.',
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        nip: profile.nip,
        department: profile.department,
        avatarUrl: profile.avatar_url,
      },
      token: `neon_${profile.id}_${Date.now()}`
    });
  } catch (error: any) {
    console.error('Neon instructor auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memverifikasi akun ke database Neon: ' + error.message,
    });
  } finally {
    client.release();
  }
}
