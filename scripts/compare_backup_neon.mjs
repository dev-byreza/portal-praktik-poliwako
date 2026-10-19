import pg from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://neondb_owner:npg_7yzdZokMS8gw@ep-quiet-lab-b39rfs7j-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const sql = fs.readFileSync('data.sql', 'utf8');
  const lines = sql.split('\n');
  const tableCounts = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('INSERT INTO')) continue;
    const match = trimmed.match(/^INSERT INTO\s+([^\s(]+)/i);
    if (match) {
      const tbl = match[1].replace(/"/g, '');
      tableCounts[tbl] = (tableCounts[tbl] || 0) + 1;
    }
  }

  console.log('=== PERBANDINGAN DATA.SQL DENGAN NEON DB ===');
  console.log('Tabel'.padEnd(30), 'Backup data.sql', 'Neon DB');
  console.log('-'.repeat(55));

  for (const [tbl, count] of Object.entries(tableCounts)) {
    try {
      const res = await client.query(`SELECT count(*)::int as count FROM ${tbl}`);
      const dbCount = res.rows[0].count;
      const status = dbCount >= count ? '✓ LENGKAP' : `! KURANG (${count - dbCount})`;
      console.log(tbl.padEnd(30), String(count).padEnd(15), String(dbCount).padEnd(10), status);
    } catch (e) {
      console.log(tbl.padEnd(30), String(count).padEnd(15), 'ERROR: ' + e.message);
    }
  }

  await client.end();
}

main().catch(console.error);
