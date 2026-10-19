import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://neondb_owner:npg_7yzdZokMS8gw@ep-quiet-lab-b39rfs7j-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  const migrationsDir = 'supabase/migrations';
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Checking / applying all ${files.length} migrations...`);

  await client.query('BEGIN');

  let succeeded = 0;
  let warnings = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    let sql = fs.readFileSync(filePath, 'utf8');

    // Split statements safely or run in transaction / savepoint
    try {
      await client.query('SAVEPOINT mig_check');
      await client.query(sql);
      await client.query('RELEASE SAVEPOINT mig_check');
      console.log(`✓ ${file} (applied cleanly)`);
      succeeded++;
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT mig_check');
      // If error is about already exists (relation, policy, column, constraint), it means it's already there
      const msg = err.message;
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('multiple primary keys') ||
        msg.includes('cannot drop')
      ) {
        console.log(`- ${file} (already in schema: ${msg.split('\n')[0]})`);
        warnings++;
      } else {
        console.error(`✗ ${file} (ERROR: ${msg})`);
        errors++;
      }
    }
  }

  console.log('\n========================================');
  console.log(`SUMMARY: ${succeeded} applied cleanly, ${warnings} already present, ${errors} hard errors.`);
  console.log('========================================');

  await client.query('COMMIT');
  await client.end();
}

main().catch(console.error);
