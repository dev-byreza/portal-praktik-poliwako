// Script to seed Praktik DPP 2 course for Prodi RPM (Rekayasa Perancangan Mekanik)
// Real 35 Students of Class 2C with 5 Practice Rotations, Sub-CPMK, Units, Materials & Assignments
// Pushed directly to Supabase
// Usage: node scripts/seed-dpp-2-rpm.mjs

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
  console.error('Error: VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Deterministic UUIDs
const INSTRUCTOR_EMAIL = 'rezaf@politekniksorowako.ac.id';
const COURSE_ID = 'c3d4e5f6-d002-4000-8000-000000000001';

const SUB_CPMK_IDS = {
  cpmk1: 'c3d4e5f6-d002-4000-8000-000000000101',
  cpmk2: 'c3d4e5f6-d002-4000-8000-000000000102',
  cpmk3: 'c3d4e5f6-d002-4000-8000-000000000103',
  cpmk4: 'c3d4e5f6-d002-4000-8000-000000000104',
};

const PERIOD_IDS = [
  'e3d4e5f6-d002-4000-8000-000000000201', // Gelombang 1 (Minggu 34)
  'e3d4e5f6-d002-4000-8000-000000000202', // Gelombang 2 (Minggu 36)
  'e3d4e5f6-d002-4000-8000-000000000203', // Gelombang 3 (Minggu 38)
  'e3d4e5f6-d002-4000-8000-000000000204', // Gelombang 4 (Minggu 40)
  'e3d4e5f6-d002-4000-8000-000000000205', // Gelombang 5 (Minggu 43)
];

const UNIT_IDS = [
  'f3d4e5f6-d002-4000-8000-000000000301',
  'f3d4e5f6-d002-4000-8000-000000000302',
  'f3d4e5f6-d002-4000-8000-000000000303',
  'f3d4e5f6-d002-4000-8000-000000000304',
  'f3d4e5f6-d002-4000-8000-000000000305',
];

// 35 Real Students of Class 2C (Prodi Rekayasa Perancangan Mekanik)
const STUDENTS_2C = [
  { nim: '22503001', name: 'Afdhal Nur Fauzan', className: '2C' },
  { nim: '22503002', name: 'Ahmad Nabil', className: '2C' },
  { nim: '22503003', name: 'Ainun Musdalifah', className: '2C' },
  { nim: '22503004', name: 'Al Aura Anandita', className: '2C' },
  { nim: '22503005', name: 'Al-Mubara', className: '2C' },
  { nim: '22503006', name: 'Ananda Hexa Maulana', className: '2C' },
  { nim: '22503007', name: 'Andi Jumharyansah', className: '2C' },
  { nim: '22503008', name: 'Anugrah Pratama', className: '2C' },
  { nim: '22503009', name: 'Athika Fauziah Setyaputri', className: '2C' },
  { nim: '22503010', name: 'Deswita Dwianggia', className: '2C' },
  { nim: '22503011', name: 'Devi Purnama Sari', className: '2C' },
  { nim: '22503012', name: 'Dwilma Sophie Sisiliano', className: '2C' },
  { nim: '22503013', name: 'Effer Cliff Mandalele', className: '2C' },
  { nim: '22503014', name: 'Eilsa', className: '2C' },
  { nim: '22503015', name: 'Fikri Hasan Bungasae', className: '2C' },
  { nim: '22503016', name: 'Gizza Ramadhani', className: '2C' },
  { nim: '22503017', name: 'Ikram Arif Ananda', className: '2C' },
  { nim: '22503018', name: 'Jayanti Lestari Lambe', className: '2C' },
  { nim: '22503019', name: 'M. Alief Kurniawan', className: '2C' },
  { nim: '22503020', name: 'Meylani Ayu Nathasa', className: '2C' },
  { nim: '22503021', name: 'Muh. Januar Farouq', className: '2C' },
  { nim: '22503022', name: 'Muh. Muzammil Musta', className: '2C' },
  { nim: '22503023', name: 'Muh. Naufal Al Khair', className: '2C' },
  { nim: '22503024', name: 'Muh. Nendra Arif', className: '2C' },
  { nim: '22503025', name: 'Muh. Rajab Hidayah An', className: '2C' },
  { nim: '22503026', name: 'Nabil Ardiansyah', className: '2C' },
  { nim: '22503028', name: 'Nita', className: '2C' },
  { nim: '22503029', name: 'Nur Ainun Alfifa', className: '2C' },
  { nim: '22503030', name: 'Nur Hikma', className: '2C' },
  { nim: '22503031', name: 'Rasya Ahmad Al Fariezi.A', className: '2C' },
  { nim: '22503032', name: 'Rezal Pabiaran', className: '2C' },
  { nim: '22503033', name: 'Silvia Nur Azizah', className: '2C' },
  { nim: '22503034', name: 'Valentin Merrandan', className: '2C' },
  { nim: '22503035', name: 'Yhogi Oktavianus Iksel', className: '2C' },
  { nim: '22503036', name: 'Zahra Atifah Zal-Sabila', className: '2C' },
];

// Mapping Peserta DPP per Gelombang Sesuai Matriks Resmi Jadwal Kelas 2C
const GELOMBANG_MAPPING = {
  1: ['22503003', '22503008', '22503010', '22503013', '22503018', '22503026', '22503029', '22503031', '22503035'],
  2: ['22503004', '22503009', '22503014', '22503015', '22503016', '22503019', '22503032', '22503033', '22503034'],
  3: ['22503001', '22503002', '22503005', '22503023', '22503024', '22503028', '22503030'],
  4: ['22503006', '22503011', '22503020', '22503021', '22503025'],
  5: ['22503007', '22503012', '22503017', '22503022', '22503036'],
};

async function main() {
  console.log('🚀 Memulai Seed Data Praktik DPP 2 untuk Prodi RPM (Kelas 2C)...');

  // 1. Dapatkan Instruktur
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('email', INSTRUCTOR_EMAIL)
    .single();

  if (profileErr || !profileData) {
    console.error(`Instruktur ${INSTRUCTOR_EMAIL} tidak ditemukan:`, profileErr);
    return;
  }
  const instructorId = profileData.id;
  console.log(`✓ Profil Instruktur: ${profileData.name} (${instructorId})`);

  // 2. Insert Course DPP 2
  const coursePayload = {
    id: COURSE_ID,
    instructor_id: instructorId,
    name: 'Praktik DPP 2',
    code: 'DPP2',
    academic_year: '2026/2027',
    semester: 'Ganjil',
    slug: 'dpp-2-rpm',
    department: 'Rekayasa Perancangan Mekanik',
    description:
      'Praktik Desain dan Perancangan Produk 2 (DPP 2) Program Studi Rekayasa Perancangan Mekanik (RPM) Politeknik Sorowako. Meliputi metodologi perancangan produk manufaktur presisi, rekayasa nilai (value engineering), pemilihan material dan standard parts teknik, pemodelan 3D mekanikal presisi, analisis kelayakan perakitan (Design for Assembly - DFA) dan manufaktur (Design for Manufacturing - DFM), pembuatan prototype fungsional, serta penyusunan dokumen gambar kerja teknik manufaktur standar ISO.',
    status: 'PUBLISHED',
    updated_at: new Date().toISOString(),
  };

  const { error: courseError } = await supabase.from('courses').upsert(coursePayload, { onConflict: 'slug' });
  if (courseError) throw new Error(`Gagal menyimpan course DPP 2: ${courseError.message}`);
  console.log('✓ Mata Kuliah Praktik DPP 2 (Prodi RPM) berhasil dibuat/diupdate.');

  // 3. Insert Sub-CPMK Kurikulum OBE
  const subCpmkList = [
    {
      id: SUB_CPMK_IDS.cpmk1,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 1',
      description:
        'Mampu mengidentifikasi kebutuhan spesifikasi teknis produk, menyusun Product Design Specification (PDS), serta mengembangkan alternatif konsep desain produk mekanik presisi.',
      weight_percent: 20.0,
    },
    {
      id: SUB_CPMK_IDS.cpmk2,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 2',
      description:
        'Mampu menerapkan kaidah Design for Manufacturing (DFM) dan Design for Assembly (DFA) dalam pemilihan komponen mekanik presisi, material teknik, dan metode proses manufaktur.',
      weight_percent: 25.0,
    },
    {
      id: SUB_CPMK_IDS.cpmk3,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 3',
      description:
        'Mampu membuat pemodelan 3D CAD parametrik perakitan produk mekanikal presisi lengkap dengan analisis toleransi geometri (GD&T ISO 1101) dan bebas tabrakan (zero collision).',
      weight_percent: 30.0,
    },
    {
      id: SUB_CPMK_IDS.cpmk4,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 4',
      description:
        'Mampu menghasilkan prototype fungsional mekanik, menyusun Bill of Materials (BOM) terstruktur, dan menyajikan laporan rekayasa perancangan standar industri manufaktur.',
      weight_percent: 25.0,
    },
  ];

  for (const cpmk of subCpmkList) {
    const { error: cpmkErr } = await supabase.from('course_sub_cpmk').upsert(cpmk, { onConflict: 'id' });
    if (cpmkErr) console.warn('Sub-CPMK warning:', cpmkErr.message);
  }
  console.log('✓ 4 Sub-CPMK (Kurikulum OBE) DPP 2 berhasil disimpan.');

  // 4. Quality Rubrics
  const rubricsData = [
    {
      id: 'f3d4e5f6-d002-4000-8000-000000000401',
      sub_cpmk_id: SUB_CPMK_IDS.cpmk1,
      name: 'Ketajaman Analisis Spesifikasi Teknis & Kelengkapan PDS',
      category: 'QUALITY',
      description: 'Kejelasan batasan desain, kriteria kinerja mekanik, beban operasional, dan kepatuhan standar industri.',
    },
    {
      id: 'f3d4e5f6-d002-4000-8000-000000000402',
      sub_cpmk_id: SUB_CPMK_IDS.cpmk2,
      name: 'Efisiensi Desain Berdasarkan Kaidah DFM & DFA',
      category: 'QUALITY',
      description: 'Kemudahan perakitan (jumlah part minimal, tool access) dan kemudahan proses permesinan/fabrikasi komponen.',
    },
    {
      id: 'f3d4e5f6-d002-4000-8000-000000000403',
      sub_cpmk_id: SUB_CPMK_IDS.cpmk2,
      name: 'Kesesuaian Pemilihan Material & Standar Komponen Komersial',
      category: 'QUALITY',
      description: 'Rasionalitas pemilihan grade material (baja paduan, alumunium, polimer) dan penggunaan fastener/bearing standar DIN/ISO.',
    },
    {
      id: 'f3d4e5f6-d002-4000-8000-000000000404',
      sub_cpmk_id: SUB_CPMK_IDS.cpmk3,
      name: 'Akurasi Pemodelan 3D Assembly & Integritas Kinematika',
      category: 'QUALITY',
      description: 'Akurasi mates/constraints perakitan, mekanisme bebas interferensi gerakan, dan ketepatan rantai toleransi dimensi.',
    },
    {
      id: 'f3d4e5f6-d002-4000-8000-000000000405',
      sub_cpmk_id: SUB_CPMK_IDS.cpmk3,
      name: 'Standar Penerapan Toleransi Geometri (GD&T ISO 1101)',
      category: 'QUALITY',
      description: 'Penerapan datum, toleransi bentuk, orientasi, dan lokasi (posisi, runout, kesilindrisan) sesuai fungsi kerja part.',
    },
    {
      id: 'f3d4e5f6-d002-4000-8000-000000000406',
      sub_cpmk_id: SUB_CPMK_IDS.cpmk4,
      name: 'Kualitas Gambar Kerja Manufaktur 2D & Akurasi BOM',
      category: 'QUALITY',
      description: 'Kelengkapan proyeksi, potongan kompleks, detail ulir/chamfer, simbol kekasaran permukaan Ra, dan Bill of Materials.',
    },
    {
      id: 'f3d4e5f6-d002-4000-8000-000000000407',
      sub_cpmk_id: SUB_CPMK_IDS.cpmk4,
      name: 'Kinerja Prototype Fungsional & Presentasi Rekayasa',
      category: 'QUALITY',
      description: 'Keberhasilan operasional prototipe mekanik, pemenuhan kriteria PDS, dan profesionalisme penyajian laporan teknis.',
    },
  ];

  for (const rub of rubricsData) {
    await supabase.from('quality_rubrics').upsert(rub, { onConflict: 'id' });
  }
  console.log('✓ 7 Kriteria Rubrik Penilaian OBE DPP 2 berhasil disimpan.');

  // 5. Insert 35 Students of Class 2C into Master Students Table
  console.log(`Menginsert 35 Mahasiswa Kelas 2C ke Master Data...`);
  const studentRows = STUDENTS_2C.map(s => ({
    instructor_id: instructorId,
    nim: s.nim,
    name: s.name,
    class_name: s.className,
    updated_at: new Date().toISOString(),
  }));

  const { error: stdError } = await supabase
    .from('students')
    .upsert(studentRows, { onConflict: 'instructor_id,nim' });

  if (stdError) throw new Error(`Gagal upsert mahasiswa: ${stdError.message}`);
  console.log(`✓ 35 Mahasiswa Kelas 2C berhasil didaftarkan di Master Students.`);

  const { data: dbStudents, error: fetchStdErr } = await supabase
    .from('students')
    .select('id, nim')
    .eq('instructor_id', instructorId)
    .in('nim', STUDENTS_2C.map(s => s.nim));

  if (fetchStdErr || !dbStudents) {
    throw new Error('Gagal mengambil data student id dari DB');
  }

  const nimToId = {};
  for (const s of dbStudents) {
    nimToId[s.nim] = s.id;
  }

  // 6. Insert 5 Gelombang Periode Praktik DPP 2 Sesuai Kalender Akademik 2026
  const periodsData = [
    {
      id: PERIOD_IDS[0],
      course_id: COURSE_ID,
      name: 'Gelombang 1 (Minggu 34)',
      period_number: 1,
      start_date: '2026-08-17',
      end_date: '2026-08-21',
      status: 'COMPLETED',
    },
    {
      id: PERIOD_IDS[1],
      course_id: COURSE_ID,
      name: 'Gelombang 2 (Minggu 36)',
      period_number: 2,
      start_date: '2026-08-31',
      end_date: '2026-09-04',
      status: 'COMPLETED',
    },
    {
      id: PERIOD_IDS[2],
      course_id: COURSE_ID,
      name: 'Gelombang 3 (Minggu 38)',
      period_number: 3,
      start_date: '2026-09-14',
      end_date: '2026-09-18',
      status: 'ACTIVE',
    },
    {
      id: PERIOD_IDS[3],
      course_id: COURSE_ID,
      name: 'Gelombang 4 (Minggu 40)',
      period_number: 4,
      start_date: '2026-09-28',
      end_date: '2026-10-02',
      status: 'UPCOMING',
    },
    {
      id: PERIOD_IDS[4],
      course_id: COURSE_ID,
      name: 'Gelombang 5 (Minggu 43)',
      period_number: 5,
      start_date: '2026-10-19',
      end_date: '2026-10-23',
      status: 'UPCOMING',
    },
  ];

  for (const per of periodsData) {
    await supabase.from('practice_periods').upsert(per, { onConflict: 'id' });
  }
  console.log('✓ 5 Gelombang Periode Praktik DPP 2 berhasil disimpan.');

  // 7. Enroll Students to Corresponding Gelombang (35 Peserta Matriks Rotasi)
  let totalEnrolled = 0;
  for (let g = 1; g <= 5; g++) {
    const periodId = PERIOD_IDS[g - 1];
    const nims = GELOMBANG_MAPPING[g];
    const isCompleted = g <= 2;
    const isActive = g === 3;

    for (const nim of nims) {
      const studentId = nimToId[nim];
      if (!studentId) {
        console.warn(`NIM ${nim} tidak ditemukan di database!`);
        continue;
      }

      const participantPayload = {
        period_id: periodId,
        student_id: studentId,
        progress_status: isCompleted ? 'PUBLISHED' : isActive ? 'IN_PROGRESS' : 'NOT_STARTED',
        final_project_confirmed: isCompleted || isActive,
      };

      const { error: partErr } = await supabase
        .from('practice_participants')
        .upsert(participantPayload, { onConflict: 'period_id,student_id' });

      if (partErr) {
        console.warn(`Enrollment error NIM ${nim}:`, partErr.message);
      } else {
        totalEnrolled++;
      }
    }
  }
  console.log(`✓ ${totalEnrolled} enrollment peserta praktik DPP 2 (5 Gelombang) berhasil dipetakan.`);

  // 8. Learning Units (5 Modul Pembelajaran Praktik DPP 2)
  const learningUnitsData = [
    {
      id: UNIT_IDS[0],
      period_id: PERIOD_IDS[2], // Aktif di Gelombang 3 (dan Gelombang 1)
      title: 'Unit 1: Metodologi Perancangan Produk & Penyusunan PDS',
      order_number: 1,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk1,
      target_indicators: [
        'Mahasiswa mampu mengidentifikasi problem statement dan kebutuhan fungsional pengguna',
        'Mahasiswa mampu menyusun dokumen Product Design Specification (PDS) terstruktur',
        'Mahasiswa mampu membuat matriks morfologi dan memilih konsep desain terbaik',
      ],
    },
    {
      id: UNIT_IDS[1],
      period_id: PERIOD_IDS[2],
      title: 'Unit 2: Penerapan Kaidah DFM (Machining/Fabrication) & DFA',
      order_number: 2,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk2,
      target_indicators: [
        'Menerapkan prinsip minimalisasi jumlah komponen melalui integrasi fungsi',
        'Menentukan kemudahan akses perakitan manual maupun modular',
        'Memilih spesifikasi material teknik dan komponen standar katalog industri (fastener, bush, seal)',
      ],
    },
    {
      id: UNIT_IDS[2],
      period_id: PERIOD_IDS[2],
      title: 'Unit 3: Pemodelan Parametrik 3D Assembly & Analisis Interferensi',
      order_number: 3,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk3,
      target_indicators: [
        'Membangun model part solid 3D secara parametrik dengan geometri presisi',
        'Melakukan perakitan 3D mekanikal (mechanical mates, gear/cam constraint)',
        'Melakukan uji tabrakan pergerakan (kinematics collision detection) dan analisis clearance',
      ],
    },
    {
      id: UNIT_IDS[3],
      period_id: PERIOD_IDS[2],
      title: 'Unit 4: Gambar Kerja Manufaktur 2D Terstandarisasi GD&T ISO & BOM',
      order_number: 4,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk3,
      target_indicators: [
        'Menyusun gambar kerja detail 2D proyeksi orthogonal & section standar ISO',
        'Menerapkan toleransi geometri GD&T (posisi, konsentrisitas, kerataan) ISO 1101',
        'Menghasilkan Bill of Materials (BOM) otomatis lengkap dengan penomoran balon (balloon callouts)',
      ],
    },
    {
      id: UNIT_IDS[4],
      period_id: PERIOD_IDS[2],
      title: 'Unit 5: Pembuatan & Uji Validasi Prototype Fungsional Mekanik',
      order_number: 5,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk4,
      target_indicators: [
        'Merakit prototype fisik fungsional sesuai prosedur SOP perakitan',
        'Menguji kinerja mekanisme terhadap spesifikasi teknis awal (PDS)',
        'Menyusun laporan akhir rekayasa dan mempresentasikan hasil produk di depan penguji',
      ],
    },
  ];

  for (const u of learningUnitsData) {
    await supabase.from('learning_units').upsert(u, { onConflict: 'id' });
  }
  console.log('✓ 5 Unit Modul Pembelajaran Praktik DPP 2 berhasil disimpan.');

  // 9. Learning Materials (Buku Panduan & Bahan Ajar Teknis Standar Industri)
  const materialsData = [
    {
      id: 'a3d4e5f6-d002-4000-8000-000000000501',
      unit_id: UNIT_IDS[0],
      title: 'Pedoman Teknis Penyusunan Product Design Specification (PDS)',
      file_url: 'https://ftxinqzupcgncmvmeqjh.supabase.co/storage/v1/object/public/materials/panduan_pds_dpp2.pdf',
      file_type: 'PDF',
      description: 'Format baku penyusunan spesifikasi teknis produk presisi: aspek fungsionalitas, batasan dimensi, ergonomi, target berat, dan standar uji beban mekanik.',
      order_number: 1,
    },
    {
      id: 'a3d4e5f6-d002-4000-8000-000000000502',
      unit_id: UNIT_IDS[0],
      title: 'Studi Kasus Morfologi Desain & Evaluasi Matriks Keputusan (Pugh Matrix)',
      file_url: 'https://ftxinqzupcgncmvmeqjh.supabase.co/storage/v1/object/public/materials/pugh_matrix_dpp2.pdf',
      file_type: 'PDF',
      description: 'Metodologi perbandingan konsep desain berdasarkan kriteria bobot prioritas untuk menentukan solusi perancangan paling optimal.',
      order_number: 2,
    },
    {
      id: 'a3d4e5f6-d002-4000-8000-000000000503',
      unit_id: UNIT_IDS[1],
      title: 'Buku Pegangan Design for Assembly (DFA) & Design for Manufacturing (DFM)',
      file_url: 'https://ftxinqzupcgncmvmeqjh.supabase.co/storage/v1/object/public/materials/handbook_dfm_dfa.pdf',
      file_type: 'PDF',
      description: 'Panduan teknis Boothroyd-Dewhurst untuk optimasi kemudahan fabrikasi milling/turning, clearance radius pahat, dan minimasi arah perakitan satu sumbu.',
      order_number: 1,
    },
    {
      id: 'a3d4e5f6-d002-4000-8000-000000000504',
      unit_id: UNIT_IDS[1],
      title: 'Katalog Standar Komponen Mekanik & Pemilihan Material Teknik (DIN/ISO)',
      file_url: 'https://ftxinqzupcgncmvmeqjh.supabase.co/storage/v1/object/public/materials/katalog_material_standard_parts.pdf',
      file_type: 'PDF',
      description: 'Tabel sifat mekanik baja karbon (S45C, AISI 4140), alumunium paduan (6061-T6), serta standard parts fastener, dowel pin, dan bearing SKF/NSK.',
      order_number: 2,
    },
    {
      id: 'a3d4e5f6-d002-4000-8000-000000000505',
      unit_id: UNIT_IDS[2],
      title: 'Modul Praktik 3D Assembly Modeling & Kinematics Motion Simulation',
      file_url: 'https://ftxinqzupcgncmvmeqjh.supabase.co/storage/v1/object/public/materials/modul_3d_assembly_simulation.pdf',
      file_type: 'PDF',
      description: 'Langkah praktis membuat hierarchy perakitan 3D, sub-assembly, dynamic motion limit, dan deteksi kontak dinamis.',
      order_number: 1,
    },
    {
      id: 'a3d4e5f6-d002-4000-8000-000000000506',
      unit_id: UNIT_IDS[3],
      title: 'Standar Penerapan Geometrical Dimensioning & Tolerancing (GD&T ISO 1101)',
      file_url: 'https://ftxinqzupcgncmvmeqjh.supabase.co/storage/v1/object/public/materials/standar_gdt_iso1101.pdf',
      file_type: 'PDF',
      description: 'Aturan penulisan feature control frame, datum reference system, maximum material condition (MMC), dan toleransi suai ISO 286 (H7/g6, dsb.).',
      order_number: 1,
    },
    {
      id: 'a3d4e5f6-d002-4000-8000-000000000507',
      unit_id: UNIT_IDS[4],
      title: 'Pedoman Pembuatan Prototype, Pengujian Kinerja, & Laporan Akhir DPP 2',
      file_url: 'https://ftxinqzupcgncmvmeqjh.supabase.co/storage/v1/object/public/materials/pedoman_prototype_laporan_dpp2.pdf',
      file_type: 'PDF',
      description: 'Format laporan rekayasa perancangan produk lengkap dengan lampiran perhitungan teknis, bill of materials, gambar kerja 2D, dan dokumentasi prototipe.',
      order_number: 1,
    },
  ];

  for (const mat of materialsData) {
    await supabase.from('learning_materials').upsert(mat, { onConflict: 'id' });
  }
  console.log('✓ 7 Bahan Ajar Teknis Standar Industri DPP 2 berhasil disimpan.');

  // 10. Assignments (Penugasan Praktik DPP 2)
  const assignmentsData = [
    {
      id: 'b3d4e5f6-d002-4000-8000-000000000601',
      unit_id: UNIT_IDS[0],
      title: 'Tugas 1: Penyusunan Dokumen PDS & Matriks Konsep Produk',
      description: 'Susun dokumen spesifikasi kebutuhan produk (PDS) untuk mekanisme mekanik presisi yang ditugaskan, sertakan minimal 3 konsep desain dan seleksi matriks keputusan.',
      due_date: '2026-09-15T23:59:59.000Z',
    },
    {
      id: 'b3d4e5f6-d002-4000-8000-000000000602',
      unit_id: UNIT_IDS[1],
      title: 'Tugas 2: Lembar Kerja Analisis DFM / DFA & Pemilihan Material',
      description: 'Lakukan evaluasi DFM terhadap seluruh part kustom untuk meminimalkan setup permesinan dan pastikan urutan perakitan DFA logis tanpa blind assembly.',
      due_date: '2026-09-16T23:59:59.000Z',
    },
    {
      id: 'b3d4e5f6-d002-4000-8000-000000000603',
      unit_id: UNIT_IDS[2],
      title: 'Tugas 3: File Model 3D Assembly & Laporan Uji Interferensi',
      description: 'Kumpulkan model 3D rakitan lengkap (format CAD native & STEP), disertai tangkapan layar hasil pengecekan interferensi yang menunjukkan zero collision.',
      due_date: '2026-09-17T23:59:59.000Z',
    },
    {
      id: 'b3d4e5f6-d002-4000-8000-000000000604',
      unit_id: UNIT_IDS[3],
      title: 'Tugas 4: Dokumen Gambar Kerja 2D Manufaktur, GD&T, & BOM',
      description: 'Kumpulkan set gambar kerja 2D format PDF ukuran A3: gambar susunan lengkap dengan nomor balon/BOM dan gambar detail tiap part dengan toleransi GD&T ISO 1101.',
      due_date: '2026-09-18T16:00:00.000Z',
    },
    {
      id: 'b3d4e5f6-d002-4000-8000-000000000605',
      unit_id: UNIT_IDS[4],
      title: 'Tugas 5: Evaluasi Validasi Prototype Fungsional & Laporan Akhir Rekayasa',
      description: 'Kumpulkan laporan akhir proyek perancangan produk lengkap beserta video demonstrasi pengujian prototype fisik mekanisme mekanik.',
      due_date: '2026-09-18T23:59:59.000Z',
    },
  ];

  for (const asg of assignmentsData) {
    await supabase.from('assignments').upsert(asg, { onConflict: 'id' });
  }
  console.log('✓ 5 Tugas Penugasan Praktik DPP 2 berhasil disimpan.');

  console.log('\n======================================================');
  console.log('🎉 SUKSES! Praktik DPP 2 Prodi RPM Berhasil Dipush ke Supabase:');
  console.log('- 1 Course: Praktik DPP 2 (Rekayasa Perancangan Mekanik)');
  console.log('- 4 Sub-CPMK Kurikulum OBE');
  console.log('- 7 Kriteria Rubrik Penilaian');
  console.log('- 35 Mahasiswa Real Kelas 2C');
  console.log('- 5 Gelombang Periode Praktik (Sinkron Kalender 2026)');
  console.log('- 35 Enrollment Peserta Praktik Sesuai Matriks Resmi');
  console.log('- 5 Modul Pembelajaran LMS, 7 Bahan Ajar, & 5 Tugas Praktik');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Fatal Error saat seeding DPP 2:', err);
  process.exit(1);
});
