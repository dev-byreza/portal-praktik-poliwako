-- ====================================================================
-- SEED SCRIPT: PRAKTIK DPP 2 & MAHASISWA KELAS 2C (PRODI RPM)
-- Politeknik Sorowako (POLIWAKO) - Semester Gasal 2026/2027
-- ====================================================================

DO $$
DECLARE
    v_instructor_id UUID;
    v_course_id UUID := 'c3d4e5f6-d002-4000-8000-000000000001'::UUID;
    v_cpmk1_id UUID := 'c3d4e5f6-d002-4000-8000-000000000101'::UUID;
    v_cpmk2_id UUID := 'c3d4e5f6-d002-4000-8000-000000000102'::UUID;
    v_cpmk3_id UUID := 'c3d4e5f6-d002-4000-8000-000000000103'::UUID;
    v_cpmk4_id UUID := 'c3d4e5f6-d002-4000-8000-000000000104'::UUID;
    
    v_per1_id UUID := 'e3d4e5f6-d002-4000-8000-000000000201'::UUID;
    v_per2_id UUID := 'e3d4e5f6-d002-4000-8000-000000000202'::UUID;
    v_per3_id UUID := 'e3d4e5f6-d002-4000-8000-000000000203'::UUID;
    v_per4_id UUID := 'e3d4e5f6-d002-4000-8000-000000000204'::UUID;
    v_per5_id UUID := 'e3d4e5f6-d002-4000-8000-000000000205'::UUID;

    v_unit1_id UUID := 'f3d4e5f6-d002-4000-8000-000000000301'::UUID;
    v_unit2_id UUID := 'f3d4e5f6-d002-4000-8000-000000000302'::UUID;
    v_unit3_id UUID := 'f3d4e5f6-d002-4000-8000-000000000303'::UUID;
    v_unit4_id UUID := 'f3d4e5f6-d002-4000-8000-000000000304'::UUID;
    v_unit5_id UUID := 'f3d4e5f6-d002-4000-8000-000000000305'::UUID;
BEGIN
    -- 1. Verifikasi profil instruktur
    SELECT id INTO v_instructor_id
    FROM public.profiles
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF v_instructor_id IS NULL THEN
        SELECT id INTO v_instructor_id
        FROM auth.users
        WHERE email = 'rezaf@politekniksorowako.ac.id';
    END IF;

    -- 2. Insert 35 Mahasiswa Kelas 2C ke Master Students
    INSERT INTO public.students (instructor_id, nim, name, class_name)
    VALUES
        (v_instructor_id, '22503001', 'Afdhal Nur Fauzan', '2C'),
        (v_instructor_id, '22503002', 'Ahmad Nabil', '2C'),
        (v_instructor_id, '22503003', 'Ainun Musdalifah', '2C'),
        (v_instructor_id, '22503004', 'Al Aura Anandita', '2C'),
        (v_instructor_id, '22503005', 'Al-Mubara', '2C'),
        (v_instructor_id, '22503006', 'Ananda Hexa Maulana', '2C'),
        (v_instructor_id, '22503007', 'Andi Jumharyansah', '2C'),
        (v_instructor_id, '22503008', 'Anugrah Pratama', '2C'),
        (v_instructor_id, '22503009', 'Athika Fauziah Satyaputri', '2C'),
        (v_instructor_id, '22503010', 'Deswita Dwianggia', '2C'),
        (v_instructor_id, '22503011', 'Devi Purnama Sari', '2C'),
        (v_instructor_id, '22503012', 'Dwilma Sophie Sisiliano', '2C'),
        (v_instructor_id, '22503013', 'Effer Cliff Mandalele', '2C'),
        (v_instructor_id, '22503014', 'Elisa', '2C'),
        (v_instructor_id, '22503015', 'Fikri Hasan Bungasae', '2C'),
        (v_instructor_id, '22503016', 'Gizza Ramadhani', '2C'),
        (v_instructor_id, '22503017', 'Ikram Arif Ananda', '2C'),
        (v_instructor_id, '22503018', 'Jayanti Lestari Lambe', '2C'),
        (v_instructor_id, '22503019', 'M. Alief Kurniawan', '2C'),
        (v_instructor_id, '22503020', 'Meylani Ayu Nathasa', '2C'),
        (v_instructor_id, '22503021', 'Muh. Januar Farouq', '2C'),
        (v_instructor_id, '22503022', 'Muh. Muzammil Musta', '2C'),
        (v_instructor_id, '22503023', 'Muh. Naufal Al Khair', '2C'),
        (v_instructor_id, '22503024', 'Muh. Nendra Arif', '2C'),
        (v_instructor_id, '22503025', 'Muh. Rajab Hidayah An', '2C'),
        (v_instructor_id, '22503026', 'Nabil Ardiansyah', '2C'),
        (v_instructor_id, '22503028', 'Nita', '2C'),
        (v_instructor_id, '22503029', 'Nur Ainun Alifda', '2C'),
        (v_instructor_id, '22503030', 'Nur Hikma', '2C'),
        (v_instructor_id, '22503031', 'Rasya Ahmad Al Farezi.A', '2C'),
        (v_instructor_id, '22503032', 'Rezal Pabiaran', '2C'),
        (v_instructor_id, '22503033', 'Silvia Nur Azizah', '2C'),
        (v_instructor_id, '22503034', 'Valentin Merrandan', '2C'),
        (v_instructor_id, '22503035', 'Yhogi Oktavianus Iksel', '2C'),
        (v_instructor_id, '22503036', 'Zahra Atifah Zal-Sabila', '2C')
    ON CONFLICT (instructor_id, nim) DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name;

    -- 3. Insert Mata Kuliah Praktik DPP 2 (Prodi RPM)
    INSERT INTO public.courses (
        id, instructor_id, name, code, academic_year, semester, slug,
        description, department, status, created_at, updated_at
    ) VALUES (
        v_course_id,
        v_instructor_id,
        'Praktik DPP 2',
        'DPP2',
        '2026/2027',
        'Ganjil',
        'dpp-2-rpm',
        'Praktik Desain dan Perancangan Produk 2 (DPP 2) Program Studi Rekayasa Perancangan Mekanik (RPM) Politeknik Sorowako. Meliputi metodologi perancangan produk manufaktur presisi, rekayasa nilai (value engineering), pemilihan material dan standard parts teknik, pemodelan 3D mekanikal presisi, analisis kelayakan perakitan (Design for Assembly - DFA) dan manufaktur (Design for Manufacturing - DFM), pembuatan prototype fungsional, serta penyusunan dokumen gambar kerja teknik manufaktur standar ISO.',
        'Rekayasa Perancangan Mekanik',
        'PUBLISHED',
        NOW(),
        NOW()
    ) ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        academic_year = EXCLUDED.academic_year,
        semester = EXCLUDED.semester,
        description = EXCLUDED.description,
        department = EXCLUDED.department,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- 4. Insert 4 Sub-CPMK Kurikulum OBE
    INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
    VALUES
        (v_cpmk1_id, v_course_id, 'Sub-CPMK 1', 'Mampu mengidentifikasi kebutuhan spesifikasi teknis produk, menyusun Product Design Specification (PDS), serta mengembangkan alternatif konsep desain produk mekanik presisi.', 20.0),
        (v_cpmk2_id, v_course_id, 'Sub-CPMK 2', 'Mampu menerapkan kaidah Design for Manufacturing (DFM) dan Design for Assembly (DFA) dalam pemilihan komponen mekanik presisi, material teknik, dan metode proses manufaktur.', 25.0),
        (v_cpmk3_id, v_course_id, 'Sub-CPMK 3', 'Mampu membuat pemodelan 3D CAD parametrik perakitan produk mekanikal presisi lengkap dengan analisis toleransi geometri (GD&T ISO 1101) dan bebas tabrakan (zero collision).', 30.0),
        (v_cpmk4_id, v_course_id, 'Sub-CPMK 4', 'Mampu menghasilkan prototype fungsional mekanik, menyusun Bill of Materials (BOM) terstruktur, dan menyajikan laporan rekayasa perancangan standar industri manufaktur.', 25.0)
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        weight_percent = EXCLUDED.weight_percent;

    -- 5. Insert 5 Gelombang Periode Praktik DPP 2
    INSERT INTO public.practice_periods (id, course_id, name, period_number, start_date, end_date, status)
    VALUES
        (v_per1_id, v_course_id, 'Gelombang 1 (Minggu 33)', 1, '2026-08-10', '2026-08-14', 'COMPLETED'),
        (v_per2_id, v_course_id, 'Gelombang 2 (Minggu 35)', 2, '2026-08-24', '2026-08-28', 'COMPLETED'),
        (v_per3_id, v_course_id, 'Gelombang 3 (Minggu 37)', 3, '2026-09-07', '2026-09-11', 'ACTIVE'),
        (v_per4_id, v_course_id, 'Gelombang 4 (Minggu 39)', 4, '2026-09-21', '2026-09-25', 'UPCOMING'),
        (v_per5_id, v_course_id, 'Gelombang 5 (Minggu 43)', 5, '2026-10-19', '2026-10-23', 'UPCOMING')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status;

    -- 6. Enroll Peserta Praktik Sesuai Matriks Resmi
    -- Gelombang 1
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per1_id, s.id, 'PUBLISHED', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503003', '22503008', '22503010', '22503013', '22503018', '22503026', '22503029', '22503031', '22503035')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 2
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per2_id, s.id, 'PUBLISHED', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503004', '22503009', '22503014', '22503015', '22503016', '22503019', '22503032', '22503033', '22503034')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 3
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per3_id, s.id, 'IN_PROGRESS', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503001', '22503002', '22503005', '22503023', '22503024', '22503028', '22503030')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 4
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per4_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503006', '22503011', '22503020', '22503021', '22503025')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 5
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per5_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503007', '22503012', '22503017', '22503022', '22503036')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- 7. Modul Pembelajaran Praktik DPP 2
    INSERT INTO public.learning_units (id, period_id, title, order_number, sub_cpmk_id, target_indicators)
    VALUES
        (v_unit1_id, v_per3_id, 'Unit 1: Metodologi Perancangan Produk & Penyusunan PDS', 1, v_cpmk1_id, '["Identifikasi problem statement dan spesifikasi fungsional", "Penyusunan dokumen PDS terstruktur", "Matriks morfologi & pemilihan konsep desain terbaik"]'::jsonb),
        (v_unit2_id, v_per3_id, 'Unit 2: Penerapan Kaidah DFM & DFA', 2, v_cpmk2_id, '["Minimalisasi part & eliminasi blind assembly", "Kemudahan proses permesinan dan perakitan", "Pemilihan material standar ISO & katalog komersial"]'::jsonb),
        (v_unit3_id, v_per3_id, 'Unit 3: Pemodelan Parametrik 3D Assembly & Analisis Interferensi', 3, v_cpmk3_id, '["Pemodelan 3D solid parametrik akurat", "Mechanical mates & sub-assembly", "Uji tabrakan collision detection bebas interferensi"]'::jsonb),
        (v_unit4_id, v_per3_id, 'Unit 4: Gambar Kerja Manufaktur 2D Terstandarisasi GD&T ISO & BOM', 4, v_cpmk3_id, '["Detail drafting proyeksi orthogonal & section ISO", "Penerapan toleransi geometri GD&T ISO 1101", "Bill of Materials (BOM) otomatis dengan nomor balon"]'::jsonb),
        (v_unit5_id, v_per3_id, 'Unit 5: Pembuatan & Uji Validasi Prototype Fungsional Mekanik', 5, v_cpmk4_id, '["Perakitan prototype fisik fungsional sesuai SOP", "Uji kinerja mekanisme terhadap parameter PDS", "Laporan akhir rekayasa dan sidang evaluasi produk"]'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        order_number = EXCLUDED.order_number,
        target_indicators = EXCLUDED.target_indicators;

END $$;
