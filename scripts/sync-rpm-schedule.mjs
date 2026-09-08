// Preview by default. Apply only with --apply; save the affected rows before editing.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const official = JSON.parse(readFileSync(resolve(root, 'src/data/official-rpm-2026.json'), 'utf8'));
const courseIds = { DPP: 'c3d4e5f6-d002-4000-8000-000000000001', 'CAD1.1': 'a1b2c3d4-cad1-4000-8000-000000000001' };

export async function syncRpmSchedule(codes = ['DPP', 'CAD1.1']) {
  if (existsSync(resolve(root, '.env'))) {
    for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !adminKey) throw new Error('Konfigurasi Supabase untuk sinkronisasi belum tersedia.');
  const client = createClient(process.env.SUPABASE_URL, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const read = async query => { const { data, error } = await query; if (error) throw new Error(error.message); return data; };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
  const changes = [];
  const backup = [];
  for (const schedule of official.courses.filter(c => codes.includes(c.code))) {
    const course = await read(client.from('courses').select('id,instructor_id,academic_year').eq('id', courseIds[schedule.code]).single());
    if (course.academic_year !== official.academicYear) throw new Error('Tahun akademik tidak sesuai PDF.');
    const periods = await read(client.from('practice_periods').select('*').eq('course_id', course.id));
    const students = await read(client.from('students').select('id,nim,name,class_name,instructor_id').eq('instructor_id', course.instructor_id).in('nim', schedule.students.map(s => s.nim)));
    const participants = await read(client.from('practice_participants').select('*').in('period_id', periods.map(p => p.id)));
    if (periods.length !== schedule.periods.length || students.length !== schedule.students.length) throw new Error(`${schedule.code}: jumlah periode/mahasiswa berbeda; tinjau sebelum koreksi.`);
    backup.push({ course, periods, students, participants });
    for (const expected of schedule.periods) {
      const matching = periods.filter(p => p.period_number === expected.periodNumber);
      if (matching.length !== 1) throw new Error(`${schedule.code}: gelombang ${expected.periodNumber} ambigu.`);
      const period = matching[0];
      const actualNims = participants.filter(p => p.period_id === period.id).map(p => students.find(s => s.id === p.student_id)?.nim).sort();
      if (JSON.stringify(actualNims) !== JSON.stringify([...expected.nims].sort())) throw new Error(`${schedule.code} gelombang ${expected.periodNumber}: peserta belum cocok; perubahan aktivitas harus ditinjau.`);
      const patch = { name: expected.name, start_date: expected.startDate, end_date: expected.endDate,
        status: today < expected.startDate ? 'UPCOMING' : today > expected.endDate ? 'COMPLETED' : 'ACTIVE' };
      if ('auto_status' in period) patch.auto_status = true;
      if (Object.entries(patch).some(([key, value]) => period[key] !== value)) changes.push({ table: 'practice_periods', id: period.id, scope: ['course_id', course.id], before: period, patch });
      console.log(`${schedule.code}: ${expected.name}, ${expected.startDate}–${expected.endDate}, ${actualNims.length} mahasiswa (${patch.status})`);
    }
    for (const expected of schedule.students) {
      const matches = students.filter(s => s.nim === expected.nim);
      if (matches.length !== 1) throw new Error(`NIM ${expected.nim} tidak unik.`);
      const student = matches[0];
      if (student.name !== expected.name || student.class_name !== expected.className) changes.push({ table: 'students', id: student.id, scope: ['instructor_id', course.instructor_id], before: student, patch: { name: expected.name, class_name: expected.className } });
    }
  }
  console.log(`Rencana koreksi: ${changes.filter(c => c.table === 'practice_periods').length} periode, ${changes.filter(c => c.table === 'students').length} nama mahasiswa. Peserta dan aktivitas tetap terjaga.`);
  if (!process.argv.includes('--apply') || !changes.length) return { changes, backup };
  const directoryIndex = process.argv.indexOf('--backup-dir');
  const directory = resolve(directoryIndex >= 0 ? process.argv[directoryIndex + 1] : 'work/rpm-sync');
  mkdirSync(directory, { recursive: true });
  const file = resolve(directory, `rpm-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify({ source: official.source, capturedAt: new Date().toISOString(), backup, changes }, null, 2), { flag: 'wx' });
  // Optimistic conditions avoid overwriting edits made since the preview/read.
  for (const change of changes) {
    let query = client.from(change.table).update(change.patch).eq('id', change.id).eq(...change.scope);
    for (const key of Object.keys(change.patch)) query = change.before[key] == null ? query.is(key, null) : query.eq(key, change.before[key]);
    const rows = await read(query.select('id'));
    if (rows.length !== 1) throw new Error(`Data ${change.table} berubah selama sinkronisasi. Periksa kembali; sebagian koreksi mungkin sudah tersimpan.`);
  }
  for (const change of changes) {
    const actual = await read(client.from(change.table).select(Object.keys(change.patch).join(',')).eq('id', change.id).eq(...change.scope).single());
    if (Object.entries(change.patch).some(([key, value]) => actual[key] !== value)) throw new Error('Verifikasi hasil sinkronisasi gagal.');
  }
  console.log('Koreksi tersimpan dan dibaca ulang untuk verifikasi.');
  return { changes, backup };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  syncRpmSchedule().catch(error => { console.error(error.message); process.exitCode = 1; });
}
