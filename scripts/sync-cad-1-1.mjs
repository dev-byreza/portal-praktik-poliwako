// Script to sync CAD 1.1 practice periods and student enrollments with official academic calendar
// Usage: node scripts/sync-cad-1-1.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim();
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: Supabase configuration missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COURSE_ID = 'a1b2c3d4-cad1-4000-8000-000000000001';
const P1_ID = 'b1b2c3d4-cad1-4000-8000-000000000201';
const P2_ID = 'b1b2c3d4-cad1-4000-8000-000000000202';
const P3_ID = 'b1b2c3d4-cad1-4000-8000-000000000203';
const P4_ID = 'b1b2c3d4-cad1-4000-8000-000000000204';

// 12 Mahasiswa per Gelombang Sesuai Matriks Resmi Kelas 1C
const G1_NIMS = [
  '22603003', '22603004', '22603006', '22603010', '22603012', '22603015',
  '22603020', '22603021', '22603025', '22603027', '22603030', '22603035'
];

const G2_NIMS = [
  '22603001', '22603005', '22603007', '22603011', '22603013', '22603016',
  '22603018', '22603024', '22603028', '22603031', '22603032', '22603036'
];

const G3_NIMS = [
  '22603002', '22603008', '22603009', '22603014', '22603017', '22603019',
  '22603022', '22603023', '22603026', '22603029', '22603033', '22603034'
];

async function main() {
  console.log('🚀 Menyelaraskan Periode Praktik CAD 1.1 dengan Kalender Akademik 2026...');

  // 1. Ambil seluruh data mahasiswa Class 1C
  const { data: students, error: stdErr } = await supabase
    .from('students')
    .select('id, nim, name')
    .ilike('class_name', '%1C%');

  if (stdErr || !students) {
    throw new Error('Gagal mengambil mahasiswa 1C: ' + stdErr?.message);
  }

  const nimToId = {};
  students.forEach(s => {
    nimToId[s.nim] = s.id;
  });

  // 2. Update Gelombang 1 (Minggu 34)
  const { error: e1 } = await supabase
    .from('practice_periods')
    .upsert({
      id: P1_ID,
      course_id: COURSE_ID,
      name: 'Gelombang 1 (Minggu 34)',
      period_number: 1,
      start_date: '2026-08-17',
      end_date: '2026-08-21',
      status: 'COMPLETED',
    }, { onConflict: 'id' });
  if (e1) console.error('Error update P1:', e1.message);
  else console.log('✓ Gelombang 1 (Minggu 34: 17-21 Agustus 2026) -> COMPLETED');

  // 3. Update Gelombang 2 (Minggu 36)
  const { error: e2 } = await supabase
    .from('practice_periods')
    .upsert({
      id: P2_ID,
      course_id: COURSE_ID,
      name: 'Gelombang 2 (Minggu 36)',
      period_number: 2,
      start_date: '2026-08-31',
      end_date: '2026-09-04',
      status: 'COMPLETED',
    }, { onConflict: 'id' });
  if (e2) console.error('Error update P2:', e2.message);
  else console.log('✓ Gelombang 2 (Minggu 36: 31 Agustus - 4 September 2026) -> COMPLETED');

  // 4. Update Gelombang 3 (Minggu 38: 14 - 18 September 2026) -> ACTIVE
  const { error: e3 } = await supabase
    .from('practice_periods')
    .upsert({
      id: P3_ID,
      course_id: COURSE_ID,
      name: 'Gelombang 3 (Minggu 38)',
      period_number: 3,
      start_date: '2026-09-14',
      end_date: '2026-09-18',
      status: 'ACTIVE',
    }, { onConflict: 'id' });
  if (e3) console.error('Error update P3:', e3.message);
  else console.log('✓ Gelombang 3 (Minggu 38: 14-18 September 2026) -> ACTIVE');

  // 5. Hapus peserta di P4 jika ada, lalu hapus P4 (karena di kalender resmi hanya 3 gelombang @ 12 siswa)
  await supabase.from('practice_participants').delete().eq('period_id', P4_ID);
  const { error: eDelP4 } = await supabase.from('practice_periods').delete().eq('id', P4_ID);
  if (eDelP4) console.warn('Note deleting P4:', eDelP4.message);
  else console.log('✓ Gelombang 4 dihapus (karena seluruh 36 mahasiswa terbagi tuntas di 3 gelombang).');

  // 6. Reset & Sinkronisasi Peserta per Gelombang
  // Hapus peserta CAD 1.1 agar bersih dan terpetakan tepat 12 per gelombang
  for (const pid of [P1_ID, P2_ID, P3_ID]) {
    await supabase.from('practice_participants').delete().eq('period_id', pid);
  }

  // Masukkan peserta Gelombang 1 (12 Siswa)
  const p1Rows = G1_NIMS.map(nim => ({
    period_id: P1_ID,
    student_id: nimToId[nim],
    progress_status: 'PUBLISHED',
    final_project_confirmed: true,
  })).filter(r => r.student_id);
  await supabase.from('practice_participants').insert(p1Rows);
  console.log(`✓ ${p1Rows.length} Mahasiswa resmi terdaftar di Gelombang 1 (Minggu 34)`);

  // Masukkan peserta Gelombang 2 (12 Siswa)
  const p2Rows = G2_NIMS.map(nim => ({
    period_id: P2_ID,
    student_id: nimToId[nim],
    progress_status: 'PUBLISHED',
    final_project_confirmed: true,
  })).filter(r => r.student_id);
  await supabase.from('practice_participants').insert(p2Rows);
  console.log(`✓ ${p2Rows.length} Mahasiswa resmi terdaftar di Gelombang 2 (Minggu 36)`);

  // Masukkan peserta Gelombang 3 (12 Siswa)
  const p3Rows = G3_NIMS.map(nim => ({
    period_id: P3_ID,
    student_id: nimToId[nim],
    progress_status: 'IN_PROGRESS',
    final_project_confirmed: true,
  })).filter(r => r.student_id);
  await supabase.from('practice_participants').insert(p3Rows);
  console.log(`✓ ${p3Rows.length} Mahasiswa resmi terdaftar di Gelombang 3 (Minggu 38: 14-18 September 2026)`);

  console.log('\n======================================================');
  console.log('🎉 SINKRONISASI SELESAI!');
  console.log('- Gelombang 1 (Minggu 34): 17 - 21 Agustus 2026 (12 Mahasiswa)');
  console.log('- Gelombang 2 (Minggu 36): 31 Agustus - 4 September 2026 (12 Mahasiswa)');
  console.log('- Minggu 37 (7 - 11 September 2026): TEORI (Tidak Ada Praktik)');
  console.log('- Gelombang 3 (Minggu 38): 14 - 18 September 2026 (12 Mahasiswa)');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Error syncing CAD 1.1:', err);
  process.exit(1);
});
