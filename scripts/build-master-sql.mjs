import { readFileSync, writeFileSync } from 'fs';

const header = `-- ====================================================================
-- PORTAL PRAKTIK POLIWAKO - MASTER DATABASE SETUP & CAD 1.1 SEED
-- Jalankan seluruh script ini di Supabase SQL Editor:
--   Dashboard -> SQL Editor -> New Query -> Paste -> Run
--
-- Menyiapkan:
-- 1. Seluruh Tabel Database & RLS Security Policies
-- 2. Storage Buckets ('submissions' untuk PDF & 'materials' untuk modul)
-- 3. Akun Real Instruktur: rezaf@politekniksorowako.ac.id (Pass: 732401#Jhe)
-- 4. 36 Mahasiswa Real Kelas 1C (Rekayasa Perancangan Mekanik)
-- 5. Mata Kuliah Real: CAD 1.1 beserta 3 Sub-CPMK & Rubrik Kualitas
-- 6. 4 Gelombang Periode Praktik (Minggu 34, 36, 37, 38) & Distribusi Peserta
-- ====================================================================

`;

const schema = readFileSync('supabase/migrations/0000_initial_schema.sql', 'utf8');
const seed = readFileSync('supabase/seed_cad_1_1.sql', 'utf8');

const combined = header + schema + '\n\n-- ====================================================================\n-- SEED DATA REAL CAD 1.1 & 36 MAHASISWA KELAS 1C\n-- ====================================================================\n\n' + seed;

writeFileSync('supabase/ONE_CLICK_SETUP_DATABASE.sql', combined, 'utf8');
console.log('Master SQL file created successfully! File: supabase/ONE_CLICK_SETUP_DATABASE.sql, bytes:', combined.length);
