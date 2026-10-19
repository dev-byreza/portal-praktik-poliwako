import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const header = `-- ====================================================================
-- PORTAL PRAKTIK POLIWAKO - MASTER DATABASE SETUP & FULL MIGRATIONS
-- Jalankan seluruh script ini di Supabase SQL Editor pada Project Baru:
--   Dashboard -> SQL Editor -> New Query -> Paste -> Run
--
-- Menyiapkan:
-- 1. Seluruh 43 Migrasi Skema Database, Tabel, RPC & RLS Security Policies
-- 2. Storage Buckets ('submissions' & 'materials') & Kebijakan Upload
-- 3. Akun Real Instruktur: rezaf@politekniksorowako.ac.id (Pass: 732401#Jhe)
-- 4. Mata Kuliah CAD 1.1 + 36 Mahasiswa Kelas 1C (RPM) + Periode
-- 5. Mata Kuliah CAD 2 TRPF + Mahasiswa Kelas 2D (TRPF) + Periode & Modul
-- 6. Mata Kuliah DPP 2 RPM + Mahasiswa Kelas 2C (RPM) + Periode & Modul
-- ====================================================================

`;

const migrationsDir = 'supabase/migrations';
const migrationFiles = readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`Found ${migrationFiles.length} migration files in ${migrationsDir}`);

let combinedSQL = header;

for (const file of migrationFiles) {
  const filePath = join(migrationsDir, file);
  const content = readFileSync(filePath, 'utf8');
  combinedSQL += `\n-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`;
  combinedSQL += `-- MIGRATION: ${file}\n`;
  combinedSQL += `-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n`;
  combinedSQL += content + '\n\n';
}

const seedFiles = [
  'supabase/seed_real_account.sql',
  'supabase/seed_cad_1_1.sql',
  'supabase/seed_cad_2_trpf.sql',
  'supabase/seed_dpp_2_rpm.sql',
];

for (const seedPath of seedFiles) {
  try {
    const seedContent = readFileSync(seedPath, 'utf8');
    combinedSQL += `\n-- ====================================================================\n`;
    combinedSQL += `-- SEED DATA: ${seedPath}\n`;
    combinedSQL += `-- ====================================================================\n\n`;
    combinedSQL += seedContent + '\n\n';
    console.log(`Included seed file: ${seedPath}`);
  } catch (err) {
    console.warn(`Could not read seed file ${seedPath}:`, err.message);
  }
}

const targetFile = 'supabase/ONE_CLICK_SETUP_DATABASE.sql';
writeFileSync(targetFile, combinedSQL, 'utf8');
console.log(`Successfully generated ${targetFile} (Total size: ${(combinedSQL.length / 1024).toFixed(1)} KB)`);
