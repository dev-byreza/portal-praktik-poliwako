import pg from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_7yzdZokMS8gw@ep-quiet-lab-b39rfs7j-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Neon DB Pool error:', err);
    });
  }
  return pool;
}

export async function queryDb<T = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const p = getDbPool();
  return await p.query<T>(text, params);
}
