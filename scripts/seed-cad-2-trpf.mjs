// Script to seed CAD 2 course for Prodi TRPF (Teknologi Rekayasa Pengelasan dan Fabrikasi)
// Real 36 Students of Class 2 D - TRPF with 6 Practice Rotations, Sub-CPMK, Units, Materials & Assignments
// Usage: node scripts/seed-cad-2-trpf.mjs

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

// UUID Constants for Deterministic Idempotency
const INSTRUCTOR_EMAIL = 'rezaf@politekniksorowako.ac.id';
const COURSE_ID = 'b2c3d4e5-cad2-4000-8000-000000000001';

const SUB_CPMK_IDS = {
  cpmk1: 'b2c3d4e5-cad2-4000-8000-000000000101',
  cpmk2: 'b2c3d4e5-cad2-4000-8000-000000000102',
  cpmk3: 'b2c3d4e5-cad2-4000-8000-000000000103',
  cpmk4: 'b2c3d4e5-cad2-4000-8000-000000000104',
};

const PERIOD_IDS = [
  'c2b2c3d4-cad2-4000-8000-000000000201', // Gelombang 1
  'c2b2c3d4-cad2-4000-8000-000000000202', // Gelombang 2
  'c2b2c3d4-cad2-4000-8000-000000000203', // Gelombang 3
  'c2b2c3d4-cad2-4000-8000-000000000204', // Gelombang 4
  'c2b2c3d4-cad2-4000-8000-000000000205', // Gelombang 5
  'c2b2c3d4-cad2-4000-8000-000000000206', // Gelombang 6
];

const UNIT_IDS = [
  'd2b2c3d4-cad2-4000-8000-000000000301',
  'd2b2c3d4-cad2-4000-8000-000000000302',
  'd2b2c3d4-cad2-4000-8000-000000000303',
  'd2b2c3d4-cad2-4000-8000-000000000304',
  'd2b2c3d4-cad2-4000-8000-000000000305',
];

// 35 Unique Students of Class 2 D - TRPF (Politeknik Sorowako)
const STUDENTS_2D_TRPF = [
  { nim: '22502001', name: 'A. Kireyna Riyadhul Jinan' },
  { nim: '22502002', name: 'A. Muh. Akbar Al Rasyid' },
  { nim: '22502003', name: 'Ahmad Ghufron Muhtadin' },
  { nim: '22502004', name: 'Ahmad Roqib Abdillah' },
  { nim: '22502005', name: 'Akmal Lasampa' },
  { nim: '22502006', name: 'Almulqi Naftaly Mahbub' },
  { nim: '22502007', name: 'Amarillah Achyar' },
  { nim: '22502008', name: 'Anriansa' },
  { nim: '22502009', name: 'Ardiansyah A. Roge' },
  { nim: '22502010', name: 'Bucek' },
  { nim: '22502011', name: 'Cristianto Ambatoding' },
  { nim: '22502012', name: 'Dafa Algazali Effendy' },
  { nim: '22502013', name: 'Dina Ayu Rizqi' },
  { nim: '22502014', name: 'Dixzar Tri Winarta' },
  { nim: '22502015', name: 'Fitryadeningsi Tompi' },
  { nim: '22502016', name: 'Gadiza Ferdinasari Asril' },
  { nim: '22502017', name: 'Geraldy Zefanya Peruge' },
  { nim: '22502018', name: 'Grey Faldi Tandililing' },
  { nim: '22502019', name: 'Irfansyah' },
  { nim: '22502020', name: 'Irsyad Rasya' },
  { nim: '22502022', name: 'Jeason Dwi Alexander P. A.' },
  { nim: '22502023', name: 'Jhesen Parinding' },
  { nim: '22502024', name: 'Keysya Arwiana Fitri' },
  { nim: '22502025', name: 'Khalaf Dhafin Alghifari' },
  { nim: '22502026', name: 'M. Habil' },
  { nim: '22502027', name: 'Maryo Putra Luneri Billahi' },
  { nim: '22502028', name: 'Muh. Firdzan' },
  { nim: '22502029', name: 'Muhammad Fauzan Al Dzakwan' },
  { nim: '22502030', name: 'Muhammad Reza' },
  { nim: '22502031', name: 'Muhammad Rifky Anugrah Surahman' },
  { nim: '22502032', name: 'Muhammad Wilby Noufal' },
  { nim: '22502033', name: 'Najwa Aqila Hafsah Elman' },
  { nim: '22502034', name: 'Phika Surtiani' },
  { nim: '22502035', name: 'Salwa Amelia' },
  { nim: '22502036', name: 'Zahran Adnan' },
];

// Schedule Mapping (NIMs per Gelombang/Rotation Column for CAD2)
const GELOMBANG_MAPPING = {
  1: ['22502003', '22502007', '22502014', '22502020', '22502027', '22502034'],
  2: ['22502004', '22502009', '22502015', '22502022', '22502028', '22502033'],
  3: ['22502005', '22502010', '22502016', '22502023', '22502030', '22502036'],
  4: ['22502002', '22502007', '22502018', '22502026', '22502031', '22502035'],
  5: ['22502001', '22502012', '22502019', '22502025', '22502029', '22502032'],
  6: ['22502006', '22502008', '22502011', '22502013', '22502017', '22502024'],
};

async function seedCad2Trpf() {
  console.log('🚀 Memulai Seed Data Praktik CAD 2 untuk Prodi TRPF...');

  // 1. Get Instructor Profile
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('email', INSTRUCTOR_EMAIL)
    .single();

  if (profileErr || !profileData) {
    console.error('Instruktur rezaf@politekniksorowako.ac.id tidak ditemukan di profiles:', profileErr);
    return;
  }
  const instructorId = profileData.id;
  console.log(`✓ Profil Instruktur: ${profileData.name} (${instructorId})`);

  // 2. Insert Course CAD 2
  const coursePayload = {
    id: COURSE_ID,
    instructor_id: instructorId,
    name: 'CAD 2',
    code: 'CAD2',
    academic_year: '2026/2027',
    semester: 'Genap',
    slug: 'cad-2-trpf',
    department: 'Teknologi Rekayasa Pengelasan dan Fabrikasi',
    description:
      'Praktik perancangan konstruksi berbantuan komputer tingkat lanjut (CAD 2) Program Studi Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF) Politeknik Sorowako. Meliputi pemodelan rangka konstruksi baja las (weldments/structural steel), desain lembaran logam (sheet metal design & unfolding), pemodelan bejana tekan dan piping spool, perakitan struktur fabrikasi & BOM, serta penyusunan gambar kerja fabrikasi 2D standar ISO dengan simbol pengelasan AWS A2.4 / ISO 2553.',
    status: 'PUBLISHED',
    updated_at: new Date().toISOString(),
  };

  const { error: courseError } = await supabase.from('courses').upsert(coursePayload, { onConflict: 'slug' });
  if (courseError) throw new Error(`Gagal menyimpan course CAD 2: ${courseError.message}`);
  console.log('✓ Mata Kuliah CAD 2 (Prodi TRPF) berhasil dibuat/diupdate.');

  // 3. Insert Sub-CPMK
  const subCpmkList = [
    {
      id: SUB_CPMK_IDS.cpmk1,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 1',
      description:
        'Mampu merancang pemodelan rangka konstruksi baja dan struktur las (Weldments & Structural Members) lengkap dengan gusset, end cap, weld bead, dan penyusunan Cut List fabrikasi presisi.',
      weight_percent: 25.0,
    },
    {
      id: SUB_CPMK_IDS.cpmk2,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 2',
      description:
        'Mampu merancang komponen lembaran logam (Sheet Metal Design), menentukan K-Factor / Bend Allowance, serta menghasilkan pola bentangan (flat pattern) untuk proses fabrikasi shearing dan bending.',
      weight_percent: 25.0,
    },
    {
      id: SUB_CPMK_IDS.cpmk3,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 3',
      description:
        'Mampu memodelkan perakitan (Assembly Modeling) struktur fabrikasi, bejana tekan, atau sistem perpipaan (piping spool) serta melakukan analisis interferensi part dan Bill of Materials (BOM).',
      weight_percent: 25.0,
    },
    {
      id: SUB_CPMK_IDS.cpmk4,
      course_id: COURSE_ID,
      code: 'Sub-CPMK 4',
      description:
        'Mampu menyusun gambar kerja fabrikasi (Shop Drawing / Isometric Spool) 2D standar ISO dengan penunjukan simbol pengelasan (ISO 2553 / AWS A2.4), toleransi dimensi, dan instruksi perakitan.',
      weight_percent: 25.0,
    },
  ];

  for (const cpmk of subCpmkList) {
    const { error: cpmkErr } = await supabase.from('course_sub_cpmk').upsert(cpmk, { onConflict: 'id' });
    if (cpmkErr) console.warn(`Notice sub-cpmk: ${cpmkErr.message}`);
  }
  console.log('✓ 4 Sub-CPMK (OBE Curriculum) CAD 2 berhasil disimpan.');

  // 4. Insert Rubric Criteria
  const rubrics = [
    {
      id: 'e2c3d4e5-cad2-4000-8000-000000000401',
      course_id: COURSE_ID,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk1,
      name: 'Akurasi Dimensi & Fitur Konstruksi Las (Weldments Cut List)',
      category: 'QUALITY',
      description: 'Ketepatan penetapan profil baja struktural, corner treatment (miter/butt), end cap, gusset, dan akurasi cut list.',
    },
    {
      id: 'e2c3d4e5-cad2-4000-8000-000000000402',
      course_id: COURSE_ID,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk2,
      name: 'Presisi Flat Pattern & Parameter Bending Sheet Metal',
      category: 'QUALITY',
      description: 'Perhitungan tepat K-Factor, bend deduction, relief cut, dan akurasi pola bentangan (unfold pattern).',
    },
    {
      id: 'e2c3d4e5-cad2-4000-8000-000000000403',
      course_id: COURSE_ID,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk3,
      name: 'Ketepatan Assembly & Analisis Bebas Interferensi Part',
      category: 'QUALITY',
      description: 'Penyusunan mate/constraint perakitan struktur, cek tabrakan interferensi, dan integrasi spool perpipaan.',
    },
    {
      id: 'e2c3d4e5-cad2-4000-8000-000000000404',
      course_id: COURSE_ID,
      sub_cpmk_id: SUB_CPMK_IDS.cpmk4,
      name: 'Standar Gambar Kerja & Kelengkapan Simbol Las (ISO 2553 / AWS)',
      category: 'QUALITY',
      description: 'Penerapan standar shop drawing ISO, detail potongan las, penunjukan simbol las AWS/ISO dan notasi ekor WPS.',
    },
    {
      id: 'e2c3d4e5-cad2-4000-8000-000000000405',
      course_id: COURSE_ID,
      sub_cpmk_id: null,
      name: 'Sikap Kerja, Kedisiplinan & Keselamatan K3 Bengkel/Studio',
      category: 'ATTITUDE',
      description: 'Disiplin kehadiran WITA, kepatuhan K3 keselamatan lab, etika kerja, dan tanggung jawab workstation CAD.',
    },
    {
      id: 'e2c3d4e5-cad2-4000-8000-000000000406',
      course_id: COURSE_ID,
      sub_cpmk_id: null,
      name: 'Inisiatif Optimasi Desain Fabrikasi & Efisiensi Material (Nesting)',
      category: 'CREATIVITY',
      description: 'Inisiatif optimasi layout profil struktur, nesting lembaran plat untuk meminimalkan scrap material fabrikasi.',
    },
    {
      id: 'e2c3d4e5-cad2-4000-8000-000000000407',
      course_id: COURSE_ID,
      sub_cpmk_id: null,
      name: 'Sistematika Laporan Gambar Kerja & Dokumen Fabrikasi',
      category: 'REPORT',
      description: 'Kerapian format laporan, etiket standar Politeknik Sorowako, dan kelengkapan lembar instruksi kerja fabrikasi.',
    },
  ];

  for (const rub of rubrics) {
    await supabase.from('rubric_criteria').upsert(rub, { onConflict: 'id' });
  }
  console.log('✓ 7 Kriteria Rubrik Penilaian OBE berhasil disimpan.');

  // 5. Insert Master Students (Class: 2D - TRPF)
  const studentPayloads = STUDENTS_2D_TRPF.map((s) => ({
    instructor_id: instructorId,
    nim: s.nim,
    name: s.name,
    class_name: '2D - TRPF',
    updated_at: new Date().toISOString(),
  }));

  const { error: stdErr } = await supabase.from('students').upsert(studentPayloads, {
    onConflict: 'instructor_id,nim',
  });
  if (stdErr) throw new Error(`Gagal menyimpan students: ${stdErr.message}`);
  console.log(`✓ 35 Mahasiswa Kelas 2D - TRPF berhasil didaftarkan di Master Students.`);

  // Get Map of student NIM -> UUID
  const { data: dbStudents, error: fetchStdErr } = await supabase
    .from('students')
    .select('id, nim')
    .eq('instructor_id', instructorId)
    .in(
      'nim',
      STUDENTS_2D_TRPF.map((s) => s.nim)
    );

  if (fetchStdErr || !dbStudents) {
    throw new Error('Gagal mengambil data student id dari DB');
  }

  const nimToId = {};
  dbStudents.forEach((st) => {
    nimToId[st.nim] = st.id;
  });

  // 6. Insert 6 Practice Periods (Gelombang 1 - 6)
  const periodsData = [
    {
      id: PERIOD_IDS[0],
      course_id: COURSE_ID,
      name: 'Gelombang 1 (Blok Praktik 1)',
      period_number: 1,
      start_date: '2026-09-07',
      end_date: '2026-09-11',
      status: 'ACTIVE',
    },
    {
      id: PERIOD_IDS[1],
      course_id: COURSE_ID,
      name: 'Gelombang 2 (Blok Praktik 2)',
      period_number: 2,
      start_date: '2026-09-14',
      end_date: '2026-09-18',
      status: 'UPCOMING',
    },
    {
      id: PERIOD_IDS[2],
      course_id: COURSE_ID,
      name: 'Gelombang 3 (Blok Praktik 3)',
      period_number: 3,
      start_date: '2026-09-21',
      end_date: '2026-09-25',
      status: 'UPCOMING',
    },
    {
      id: PERIOD_IDS[3],
      course_id: COURSE_ID,
      name: 'Gelombang 4 (Blok Praktik 4)',
      period_number: 4,
      start_date: '2026-09-28',
      end_date: '2026-10-02',
      status: 'UPCOMING',
    },
    {
      id: PERIOD_IDS[4],
      course_id: COURSE_ID,
      name: 'Gelombang 5 (Blok Praktik 5)',
      period_number: 5,
      start_date: '2026-10-05',
      end_date: '2026-10-09',
      status: 'UPCOMING',
    },
    {
      id: PERIOD_IDS[5],
      course_id: COURSE_ID,
      name: 'Gelombang 6 (Blok Praktik 6)',
      period_number: 6,
      start_date: '2026-10-12',
      end_date: '2026-10-16',
      status: 'UPCOMING',
    },
  ];

  for (const per of periodsData) {
    await supabase.from('practice_periods').upsert(per, { onConflict: 'id' });
  }
  console.log('✓ 6 Gelombang Periode Praktik CAD 2 berhasil disimpan.');

  // 7. Enroll Students to Corresponding Gelombang (Practice Participants)
  let totalEnrolled = 0;
  for (let g = 1; g <= 6; g++) {
    const periodId = PERIOD_IDS[g - 1];
    const nims = GELOMBANG_MAPPING[g];
    const isGelombang1 = g === 1;

    for (const nim of nims) {
      const studentId = nimToId[nim];
      if (!studentId) {
        console.warn(`NIM ${nim} tidak ditemukan di database!`);
        continue;
      }

      await supabase.from('practice_participants').upsert(
        {
          period_id: periodId,
          student_id: studentId,
          progress_status: isGelombang1 ? 'IN_PROGRESS' : 'NOT_STARTED',
          final_project_confirmed: isGelombang1,
        },
        { onConflict: 'period_id,student_id' }
      );
      totalEnrolled++;
    }
  }
  console.log(`✓ ${totalEnrolled} enrollment mahasiswa (6 peserta per gelombang) berhasil dipetakan.`);

  // 8. Insert 5 Learning Units (Modul LMS) untuk Gelombang 1 (Active)
  const unitsData = [
    {
      id: UNIT_IDS[0],
      period_id: PERIOD_IDS[0],
      unit_number: 1,
      title: 'Modul 1: Pemodelan Rangka Struktur Baja Las (Weldment & Structural Member)',
      description:
        'Pemodelan struktur rangka batang baja, pemilihan standar profil (UNP, WF, Hollow/SHS, Siku L), perlakuan sudut (Miter/Butt), pemasangan gusset, end cap, serta penyusunan Cut List fabrikasi.',
    },
    {
      id: UNIT_IDS[1],
      period_id: PERIOD_IDS[0],
      unit_number: 2,
      title: 'Modul 2: Perancangan Lembaran Logam & Pola Bentangan (Sheet Metal Design & Unfold)',
      description:
        'Fitur Base Flange, Edge Flange, Miter Flange, Hem, dan Corner Relief. Penentuan parameter K-Factor, Bend Allowance, Bend Deduction, dan ekstraksi pola bentangan datar (flat pattern) untuk fabrikasi plat.',
    },
    {
      id: UNIT_IDS[2],
      period_id: PERIOD_IDS[0],
      unit_number: 3,
      title: 'Modul 3: Desain Tangki, Bejana Tekan & Sistem Perpipaan (Pressure Vessel & Piping Spool)',
      description:
        'Pemodelan silinder shell hasil roll, torispherical/ellipsoidal head, orientasi nozzle, serta perancangan jalur perpipaan isometrik (piping spool) dengan fitting butt-weld/flange standar ASME/ISO.',
    },
    {
      id: UNIT_IDS[3],
      period_id: PERIOD_IDS[0],
      unit_number: 4,
      title: 'Modul 4: Perakitan Struktur Fabrikasi & Bill of Materials (Assembly & Cut List BOM)',
      description:
        'Strategi perakitan struktur fabrikasi multi-part, penetapan constraint/mate hubungan geometri, deteksi tabrakan (interference check), dan otomatisasi tabel Bill of Materials (BOM) beserta estimasi berat baja.',
    },
    {
      id: UNIT_IDS[4],
      period_id: PERIOD_IDS[0],
      unit_number: 5,
      title: 'Modul 5: Technical Drafting Fabrikasi & Notasi Simbol Las Standar (ISO 2553 & AWS A2.4)',
      description:
        'Penyusunan gambar kerja fabrikasi 2D standar industri (Shop Drawing A3), proyeksi ortogonal, irisan detail sambungan las, dimensi toleransi, dan spesifikasi simbol pengelasan lengkap (AWS A2.4 / ISO 2553).',
    },
  ];

  for (const unit of unitsData) {
    await supabase.from('learning_units').upsert(unit, { onConflict: 'id' });
  }
  console.log('✓ 5 Unit Modul Pembelajaran CAD 2 berhasil disimpan.');

  // 9. Insert Rich Learning Materials for each Unit
  const materialsData = [
    // Unit 1 Materials
    {
      id: 'f2c3d4e5-cad2-4000-8000-000000000501',
      unit_id: UNIT_IDS[0],
      title: 'Panduan Teknis 1.1: Pemodelan Profil Baja Struktural & Corner Treatment',
      type: 'RICHTEXT',
      content_text: `### MATERI PRAKTIK CAD 2 - MODUL 1
**Program Studi: Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF)**
**Topik: Pemodelan Rangka Struktur Baja Las (Weldments)**

#### 1. Konsep Dasar Weldments
Modul weldment pada software CAD memungkinkan perancang untuk memodelkan struktur rangka pipa atau profil baja secara efisien menggunakan pendekatan **3D Sketch Skeleton**. Kerangka kawat (wireframe) dibuat sebagai sumbu netral profil, lalu profil struktural diterapkan secara otomatis.

#### 2. Pemilihan Standar Profil Baja Konstruksi
- **Hollow Structural Section (HSS / SHS / RHS)**: Profil pipa kotak/persegi panjang sesuai standar ASTM A500 atau JIS G3466.
- **Wide Flange (WF) & I-Beam**: Digunakan untuk balok struktural utama penahan momen lentur (ASTM A36 / SS400).
- **Kanal U (UNP)**: Digunakan untuk rangka sekunder, tangga industri, atau bracing pengaku.
- **Baja Siku (Equal / Unequal Angle)**: Untuk bracing lateral dan rangka pelindung.

#### 3. Pengaturan Sambungan Sudut (Corner Treatment)
- **End Miter**: Pemotongan miring 45° pada sudut 90° sehingga kedua profil bertemu serasi. Sangat ideal untuk profil hollow tertutup agar mencegah masuknya air dan korosi internal.
- **End Butt 1 & End Butt 2**: Salah satu profil dipotong tegak lurus dan profil lainnya menumpuk. Perlu diperhatikan celah penetrasi las (*root opening*).
- **Trim/Extend Tool**: Memotong atau memanjangkan profil agar pas berpotongan dengan profil lain pada sudut tertentu.

#### 4. Fitur Gusset & End Cap
- **Gusset (Plat Penguat Sudut)**: Plat segitiga atau poligon yang dipasang pada sudut pertemuan profil untuk menaikkan kekuatan sambungan terhadap beban lentur dan puntir.
- **End Cap (Plat Penutup Ujung)**: Menutup ujung profil terbuka dengan plat tebal 3-6 mm untuk estetika, keamanan pekerja bengkel dari tepi tajam, dan pencegahan oksidasi.

#### 5. Cut List Table Fabrikasi
Fitur Weldment Cut List secara otomatis mengelompokkan profil yang identik dan menghitung:
1. Item No & Kuantitas batang (QTY).
2. Dimensi profil (misal SHS 50x50x3.2).
3. Panjang potong bersih (*Cut Length*).
4. Sudut potong kiri dan kanan (*Miter Cut Angles*).`,
    },
    {
      id: 'f2c3d4e5-cad2-4000-8000-000000000502',
      unit_id: UNIT_IDS[0],
      title: 'Instruksi Praktik 1.2: Pemodelan Meja Fabrikasi Heavy-Duty & Cut List',
      type: 'RICHTEXT',
      content_text: `### LEMBAR KERJA PRAKTIKUM 1 (JOB SHEET 1)
**Komponen: Meja Kerja Fabrikasi & Pengelasan (Welding Table Frame)**

#### Spesifikasi Desain:
1. Dimensi keseluruhan: Panjang 1800 mm, Lebar 900 mm, Tinggi 850 mm.
2. Material Kaki Utama: Hollow Square SHS 80 x 80 x 4.5 mm.
3. Rangka Atas & Bawah: Hollow Rectangular RHS 80 x 40 x 3.2 mm.
4. Penguat Sudut: Gusset Plat Baja tebal 6 mm (dimensi 100 x 100 mm) pada setiap sudut kaki.
5. Kaki Meja: End Cap dengan pelat dasar tebal 10 mm + lubang M16 untuk levelling pad.

#### Langkah Kerja CAD:
1. Buat sketch 3D kubus kerangka sesuai ukuran luar.
2. Terapkan fitur *Structural Member* dengan profil yang telah ditentukan.
3. Terapkan *Corner Treatment* tipe Miter pada rangka atas.
4. Gunakan perintah *Trim/Extend* untuk memotong sambungan kaki dengan rangka bawah.
5. Tambahkan 8 buah gusset pada pertemuan kaki dan rangka penopang atas.
6. Perbarui *Cut List Table* dan pastikan tidak ada overlapping bodi profil (*zero interference*).`,
    },

    // Unit 2 Materials
    {
      id: 'f2c3d4e5-cad2-4000-8000-000000000503',
      unit_id: UNIT_IDS[1],
      title: 'Panduan Teknis 2.1: Prinsip Desain Lembaran Logam & Bending Allowance',
      type: 'RICHTEXT',
      content_text: `### MATERI PRAKTIK CAD 2 - MODUL 2
**Program Studi: Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF)**
**Topik: Perancangan Lembaran Logam (Sheet Metal Design & Unfolding)**

#### 1. Karakteristik Lembaran Logam dalam Fabrikasi
Dalam fabrikasi modern, banyak struktur pendukung, cover pelindung mesin, dan panel kontrol dibuat dari plat lembaran tipis (1.2 mm - 4.5 mm) melalui proses pemotongan laser/plasma (*CNC Cutting*) dan penekukan hidrolik (*CNC Press Brake Bending*).

#### 2. Parameter Fisik Penekukan (Bending)
Ketika lembaran logam ditekuk:
- Sisi luar tekukan mengalami gaya tarik (*tension* / meregang).
- Sisi dalam tekukan mengalami gaya tekan (*compression* / memadat).
- **Sumbu Netral (Neutral Axis)**: Garis serat material yang tidak mengalami perubahan panjang selama proses penekukan.
- **K-Factor**: Rasio posisi sumbu netral terhadap ketebalan material:
  $$\\text{K-Factor} = \\frac{t}{T}$$
  *(t = jarak dari permukaan dalam ke sumbu netral, T = tebal plat keseluruhan).*
  Untuk baja lunak (Mild Steel JIS SS400/ASTM A36) penekukan 90° dengan air bending, nilai K-Factor empiris umumnya berkisar antara **0.38 - 0.44**.

#### 3. Fitur Utama Sheet Metal CAD
1. **Base Flange**: Lembaran awal yang menjadi landasan pola lipatan.
2. **Edge Flange**: Menarik tekukan baru dari tepi plat yang sudah ada dengan sudut dan panjang tertentu.
3. **Miter Flange**: Membuat profil lipatan kontinu di sepanjang beberapa tepi plat yang bersambung.
4. **Hem**: Melipat tepi plat 180° untuk memperkaku pinggiran plat dan menghilangkan tepi tajam demi keselamatan kerja.
5. **Corner Relief**: Pembebasan sudut (tipe tear, round, atau rectangular) untuk mencegah material robek atau berkerut pada pertemuan dua tekukan.

#### 4. Flat Pattern (Pola Datar / Bentangan)
Fungsi utama CAD Sheet Metal adalah kemampuan menghasilkan gambar pola bentangan (*unfolded state*) dengan akurasi dimensi 1:1, yang diekspor menjadi format DXF/DWG untuk program mesin potong CNC cutting.`,
    },
    {
      id: 'f2c3d4e5-cad2-4000-8000-000000000504',
      unit_id: UNIT_IDS[1],
      title: 'Instruksi Praktik 2.2: Desain Enclosure Panel Fabrikasi & Flat Pattern DXF',
      type: 'RICHTEXT',
      content_text: `### LEMBAR KERJA PRAKTIKUM 2 (JOB SHEET 2)
**Komponen: Electrical Control Box Enclosure IP65**

#### Parameter Desain:
- Tebal Plat ($T$): 2.0 mm (Mild Steel SPCC).
- Radius Tekukan ($R$): 2.0 mm ($R = T$).
- K-Factor: 0.40.
- Dimensi box: Panjang 400 mm, Lebar 300 mm, Kedalaman 180 mm.
- Tepi luar pintu dan box dilengkapi lipatan pelindung air (drip hem).

#### Tugas Mahasiswa:
1. Rancang bodi utama kotak enclosure menggunakan fitur Sheet Metal.
2. Buat pintu enclosure terpisah lengkap dengan lubang sakelar darurat (Emergency Stop Ø22 mm) dan lubang pengukur voltase.
3. Terapkan Corner Relief tipe Round agar tepi tekukan rapi saat ditekuk di mesin press brake.
4. Lakukan Flatten (Unfold) dan amati perubahan dimensi bentangan dari bentuk 3D.
5. Susun gambar kerja drafting 2D yang menampilkan:
   - Pandangan isometrik 3D terlipat.
   - Pandangan bentangan datar (Flat Pattern) lengkap dengan garis tekuk (Bend Lines: UP/DOWN direction & angle).`,
    },

    // Unit 3 Materials
    {
      id: 'f2c3d4e5-cad2-4000-8000-000000000505',
      unit_id: UNIT_IDS[2],
      title: 'Panduan Teknis 3.1: Konstruksi Bejana Tekan & Standar Piping Spool',
      type: 'RICHTEXT',
      content_text: `### MATERI PRAKTIK CAD 2 - MODUL 3
**Program Studi: Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF)**
**Topik: Pemodelan Bejana Tekan & Sistem Perpipaan (Piping Spool)**

#### 1. Anatomi Bejana Tekan (Pressure Vessel)
Bejana tekan merupakan salah satu produk fabrikasi primer di industri pertambangan, minyak & gas, serta pengolahan nikel seperti di Sorowako. Elemen pokoknya meliputi:
- **Cylindrical Shell**: Plat lembaran yang di-roll membentuk silinder dan disambung dengan las longitudinal (*Butt Weld full penetration*).
- **Dished Heads / End Closures**:
  - *Torispherical Head* (Klöpper head / ASME F&D).
  - *2:1 Ellipsoidal Head* (standar bejana bertekanan menengah ke tinggi).
  - *Hemispherical Head* (efisiensi tegangan paling optimal).
- **Nozzle Neck & Reinforcement Pad (Repad)**: Lubang pipa inlet/outlet yang dilas pada shell, diperkuat dengan plat penguat melingkar jika tegangan lokal melebihi batas aman.

#### 2. Standar Jalur Perpipaan (Piping Spool)
Spool perpipaan adalah rakitan segmen pipa dan fiting (flange, elbow, reducer, tee) yang difabrikasi di bengkel sebelum diangkut ke lokasi instalasi untuk disambung (*field weld*).
- **Komponen Utama**:
  - Pipa Nominal Pipe Size (NPS) Schedule 40/80 (ASTM A106 Gr. B).
  - Elbow 90° Long Radius ($R = 1.5D$) dan Short Radius ($R = 1.0D$).
  - Concentric & Eccentric Reducer.
  - Weld Neck Flange (WNF) Class 150 / 300 (ASME B16.5).
- **Sambungan Las Pipa**:
  - Butt Weld: bevel 37.5° dengan root face 1.6 mm dan root gap 2.4-3.2 mm (standar WPS SMAW/GTAW).`,
    },

    // Unit 4 Materials
    {
      id: 'f2c3d4e5-cad2-4000-8000-000000000506',
      unit_id: UNIT_IDS[3],
      title: 'Panduan Teknis 4.1: Perakitan Struktur Fabrikasi & Otomatisasi BOM',
      type: 'RICHTEXT',
      content_text: `### MATERI PRAKTIK CAD 2 - MODUL 4
**Program Studi: Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF)**
**Topik: Perakitan Struktur Fabrikasi & Bill of Materials (BOM)**

#### 1. Metodologi Perakitan Konstruksi Fabrikasi
- **Bottom-Up Assembly**: Memodelkan masing-masing komponen profil, pelat gusset, dan baut secara independen, kemudian menyatukannya dalam lingkungan assembly (*.sldasm / *.iam).
- **Top-Down Assembly (In-Context Modeling)**: Memodelkan komponen di dalam konteks perakitan berpatokan pada geometri part tetangga. Sangat efektif untuk memastikan lubang baut pada base plate sejajar presisi dengan struktur pondasi.

#### 2. Pengujian Tabrakan Geometri (Interference Detection)
Sebelum file CAD dikirim ke bagian fabrikasi bengkel, perancang wajib melakukan:
1. **Interference Check**: Memastikan tidak ada volume bodi padat yang saling bertumpuk yang dapat mengakibatkan part tidak dapat dirakit saat di bengkel.
2. **Clearance Verification**: Memeriksa kelonggaran gerak untuk tool alat las (torch MIG/TIG) agar welder memiliki akses sudut elektroda yang memadai.

#### 3. Manajemen Bill of Materials (BOM) & Penomoran Balon
- Tabel BOM harus memuat:
  - **Item No**: Nomor urut yang berkorelasi langsung dengan balon (balloon) di gambar rakitan.
  - **Part Number / Mark No**: Kode penandaan part untuk fabrikasi (misal: MK-01, PL-05).
  - **Deskripsi & Spesifikasi Material**: Misal Plat ASTM A36 t=12 mm, Profil UNP 100x50x5.
  - **Kuantitas (QTY)**.
  - **Estimasi Berat (Weight in Kg)**: Dihitung otomatis berdasarkan massa jenis baja ($7.85 \\text{ g/cm}^3$).`,
    },

    // Unit 5 Materials
    {
      id: 'f2c3d4e5-cad2-4000-8000-000000000507',
      unit_id: UNIT_IDS[4],
      title: 'Panduan Lengkap 5.1: Notasi Simbol Pengelasan Standar ISO 2553 & AWS A2.4',
      type: 'RICHTEXT',
      content_text: `### MATERI PRAKTIK CAD 2 - MODUL 5
**Program Studi: Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF)**
**Topik: Simbol Pengelasan Standar Industri (AWS A2.4 & ISO 2553)**

#### 1. Anatomi Simbol Pengelasan Standar
Simbol las adalah bahasa universal komunikasi antara desainer/engineer perancangan dan juru las (welder) / inspektur las (welding inspector).
Komponen dasar simbol las terdiri dari:
1. **Reference Line (Garis Referensi)**: Garis horizontal tempat semua instruksi pengelasan diletakkan.
   - Sisi bawah garis = *Arrow Side* (sisi yang ditunjuk panah).
   - Sisi atas garis = *Other Side* (sisi berlawanan dari panah).
   *(Pada standar ISO 2553 terdapat garis putus-putus identifikasi di atas/bawah garis referensi).*
2. **Arrow (Panah Penunjuk)**: Menunjuk langsung ke garis batas sambungan yang akan dilas.
3. **Basic Weld Symbol**:
   - Segitiga siku = *Fillet Weld* (Las Sudut).
   - Dua garis tegak lurus = *Square Groove*.
   - Huruf V = *Single-V Groove Butt Weld*.
   - Garis miring satu sisi = *Single-Bevel Groove*.
   - Huruf U / J = *U-Groove / J-Groove Weld*.
4. **Dimensi Sambungan**:
   - Di sebelah kiri simbol = Ukuran kaki las (*leg size* $z$ atau *throat* $s$ untuk fillet) atau kedalaman preparasi kampuh ($S$).
   - Di sebelah kanan simbol = Panjang las (*length of weld* $L$) dan jarak antara (*pitch* $P$) jika sambungan las berselang (*intermittent weld*).
5. **Supplementary Symbols (Simbol Tambahan)**:
   - Lingkaran pada pertemuan panah dan garis referensi = **Weld All-Around** (Las Keliling Penuh).
   - Bendera hitam = **Field Weld** (Pengelasan Lapangan saat instalasi, bukan di bengkel fabrikasi).
   - Garis lengkung/datar di atas simbol = Kontur permukaan las (Flush, Convex, Concave).
6. **Tail (Ekor Simbol)**:
   - Memuat nomor prosedur pengelasan (WPS No.), proses las yang digunakan (misal: 111-SMAW, 135-GMAW, 141-GTAW), atau persyaratan uji tak merusak (NDT: UT 100%, RT 10%, Visual Only).`,
    },
  ];

  for (const mat of materialsData) {
    await supabase.from('learning_materials').upsert(mat, { onConflict: 'id' });
  }
  console.log('✓ 7 Bahan Ajar Teknis (Buku Petunjuk & Pedoman Standar) berhasil disimpan.');

  // 10. Insert 5 Assignments (Tugas Praktik CAD 2)
  const assignmentsData = [
    {
      id: 'a2c3d4e5-cad2-4000-8000-000000000601',
      period_id: PERIOD_IDS[0],
      unit_id: UNIT_IDS[0],
      title: 'Tugas Modul 1: Desain & Cut List Rangka Meja Fabrikasi Heavy-Duty',
      description:
        'Kumpulkan lembar gambar kerja 3D Weldment rangka meja kerja fabrikasi lengkap dengan tampilan Cut List Table terinci, detail sambungan gusset, dan end cap profil hollow. Format file wajib PDF.',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      max_score: 100,
      allowed_file_type: 'PDF',
    },
    {
      id: 'a2c3d4e5-cad2-4000-8000-000000000602',
      period_id: PERIOD_IDS[0],
      unit_id: UNIT_IDS[1],
      title: 'Tugas Modul 2: Pemodelan Enclosure Fabrikasi Lembaran Logam & Flat Pattern',
      description:
        'Upload laporan hasil pemodelan 3D bodi enclosure dan pintu panel, diagram bentangan datar (Flat Pattern Unfolding) berdimensi tekuk, dan tabel parameter K-factor. Format file wajib PDF.',
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      max_score: 100,
      allowed_file_type: 'PDF',
    },
    {
      id: 'a2c3d4e5-cad2-4000-8000-000000000603',
      period_id: PERIOD_IDS[0],
      unit_id: UNIT_IDS[2],
      title: 'Tugas Modul 3: Desain Tangki Penampung Fluida & Isometrik Spool Pipa',
      description:
        'Kumpulkan gambar model 3D tangki bertekanan sederhana dengan nozzle connection dan gambar isometrik spool jalur perpipaan berstandar ASME B16.5 dalam format PDF.',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      max_score: 100,
      allowed_file_type: 'PDF',
    },
    {
      id: 'a2c3d4e5-cad2-4000-8000-000000000604',
      period_id: PERIOD_IDS[0],
      unit_id: UNIT_IDS[3],
      title: 'Tugas Modul 4: Evaluasi Perakitan Gantry Frame & Tabel Bill of Materials (BOM)',
      description:
        'Laporan analisis perakitan struktur fabrikasi gantry crane mini, hasil uji tabrakan part (Interference Detection report), serta tabel Bill of Materials (BOM) lengkap dengan estimasi berat. Format PDF.',
      deadline: new Date(Date.now() + 18 * 86400000).toISOString(),
      max_score: 100,
      allowed_file_type: 'PDF',
    },
    {
      id: 'a2c3d4e5-cad2-4000-8000-000000000605',
      period_id: PERIOD_IDS[0],
      unit_id: UNIT_IDS[4],
      title: 'Tugas Modul 5 (Tugas Akhir): Shop Drawing Fabrikasi Komprehensif Berstandar Simbol Las ISO/AWS',
      description:
        'Karya akhir gambar kerja shop drawing fabrikasi ukuran A3 standar Politeknik Sorowako lengkap dengan proyeksi ortogonal, detail sambungan las dengan simbol las AWS A2.4 / ISO 2553, notasi WPS, bill of materials, dan etiket resmi. Format PDF.',
      deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
      max_score: 100,
      allowed_file_type: 'PDF',
    },
  ];

  for (const assign of assignmentsData) {
    await supabase.from('assignments').upsert(assign, { onConflict: 'id' });
  }
  console.log('✓ 5 Tugas Penugasan Praktik CAD 2 berhasil disimpan.');

  console.log('\n======================================================');
  console.log('🎉 SUKSES! Praktik CAD 2 Prodi TRPF Berhasil Dipush ke Supabase:');
  console.log('- 1 Course: CAD 2 (Teknologi Rekayasa Pengelasan dan Fabrikasi)');
  console.log('- 4 Sub-CPMK Kurikulum OBE');
  console.log('- 7 Kriteria Rubrik Penilaian');
  console.log('- 35 Mahasiswa Real Kelas 2D - TRPF');
  console.log('- 6 Gelombang Periode Praktik');
  console.log('- 36 Enrollment Rotasi Praktik');
  console.log('- 5 Modul Pembelajaran LMS, 7 Bahan Ajar, & 5 Tugas Praktik');
  console.log('======================================================\n');
}

seedCad2Trpf().catch((err) => {
  console.error('Terjadi kesalahan saat seed CAD 2:', err);
  process.exit(1);
});
