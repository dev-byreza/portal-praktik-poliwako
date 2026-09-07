-- ====================================================================
-- SEED SCRIPT: Mata Kuliah CAD 2 & 36 Mahasiswa Real Kelas 2D - TRPF
-- Instruktur: rezaf@politekniksorowako.ac.id (Reza Febriadi Rauf)
-- Program Studi: Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF)
-- Politeknik Sorowako - Semester Genap 2026/2027
-- ====================================================================

DO $$
DECLARE
    v_instructor_id UUID;
    v_course_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000001'::UUID;
    v_cpmk1_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000101'::UUID;
    v_cpmk2_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000102'::UUID;
    v_cpmk3_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000103'::UUID;
    v_cpmk4_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000104'::UUID;
    
    v_per1_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000201'::UUID;
    v_per2_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000202'::UUID;
    v_per3_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000203'::UUID;
    v_per4_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000204'::UUID;
    v_per5_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000205'::UUID;
    v_per6_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000206'::UUID;

    v_unit1_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000301'::UUID;
    v_unit2_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000302'::UUID;
    v_unit3_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000303'::UUID;
    v_unit4_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000304'::UUID;
    v_unit5_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000305'::UUID;
BEGIN
    -- 1. Cari atau verifikasi profile instruktur
    SELECT id INTO v_instructor_id
    FROM public.profiles
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF v_instructor_id IS NULL THEN
        SELECT id INTO v_instructor_id
        FROM auth.users
        WHERE email = 'rezaf@politekniksorowako.ac.id';

        IF v_instructor_id IS NULL THEN
            v_instructor_id := gen_random_uuid();
            INSERT INTO auth.users (
                id, instance_id, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
            ) VALUES (
                v_instructor_id, '00000000-0000-0000-0000-000000000000', 'rezaf@politekniksorowako.ac.id',
                crypt('732401#Jhe', gen_salt('bf')), NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                '{"name":"Reza Febriadi Rauf","department":"Teknologi Rekayasa Pengelasan dan Fabrikasi"}'::jsonb,
                'authenticated', 'authenticated', NOW(), NOW()
            );
        END IF;

        INSERT INTO public.profiles (id, email, name, nip, department, created_at, updated_at)
        VALUES (
            v_instructor_id,
            'rezaf@politekniksorowako.ac.id',
            'Reza Febriadi Rauf',
            '198709122015041002',
            'Teknologi Rekayasa Pengelasan dan Fabrikasi',
            NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- ====================================================================
    -- 2. INSERT 35 MAHASISWA REAL KELAS 2D - TRPF
    -- ====================================================================
    INSERT INTO public.students (instructor_id, nim, name, class_name)
    VALUES
        (v_instructor_id, '22502001', 'A. Kireyna Riyadhul Jinan', '2D - TRPF'),
        (v_instructor_id, '22502002', 'A. Muh. Akbar Al Rasyid', '2D - TRPF'),
        (v_instructor_id, '22502003', 'Ahmad Ghufron Muhtadin', '2D - TRPF'),
        (v_instructor_id, '22502004', 'Ahmad Roqib Abdillah', '2D - TRPF'),
        (v_instructor_id, '22502005', 'Akmal Lasampa', '2D - TRPF'),
        (v_instructor_id, '22502006', 'Almulqi Naftaly Mahbub', '2D - TRPF'),
        (v_instructor_id, '22502007', 'Amarillah Achyar', '2D - TRPF'),
        (v_instructor_id, '22502008', 'Anriansa', '2D - TRPF'),
        (v_instructor_id, '22502009', 'Ardiansyah A. Roge', '2D - TRPF'),
        (v_instructor_id, '22502010', 'Bucek', '2D - TRPF'),
        (v_instructor_id, '22502011', 'Cristianto Ambatoding', '2D - TRPF'),
        (v_instructor_id, '22502012', 'Dafa Algazali Effendy', '2D - TRPF'),
        (v_instructor_id, '22502013', 'Dina Ayu Rizqi', '2D - TRPF'),
        (v_instructor_id, '22502014', 'Dixzar Tri Winarta', '2D - TRPF'),
        (v_instructor_id, '22502015', 'Fitryadeningsi Tompi', '2D - TRPF'),
        (v_instructor_id, '22502016', 'Gadiza Ferdinasari Asril', '2D - TRPF'),
        (v_instructor_id, '22502017', 'Geraldy Zefanya Peruge', '2D - TRPF'),
        (v_instructor_id, '22502018', 'Grey Faldi Tandililing', '2D - TRPF'),
        (v_instructor_id, '22502019', 'Irfansyah', '2D - TRPF'),
        (v_instructor_id, '22502020', 'Irsyad Rasya', '2D - TRPF'),
        (v_instructor_id, '22502022', 'Jeason Dwi Alexander P. A.', '2D - TRPF'),
        (v_instructor_id, '22502023', 'Jhesen Parinding', '2D - TRPF'),
        (v_instructor_id, '22502024', 'Keysya Arwiana Fitri', '2D - TRPF'),
        (v_instructor_id, '22502025', 'Khalaf Dhafin Alghifari', '2D - TRPF'),
        (v_instructor_id, '22502026', 'M. Habil', '2D - TRPF'),
        (v_instructor_id, '22502027', 'Maryo Putra Luneri Billahi', '2D - TRPF'),
        (v_instructor_id, '22502028', 'Muh. Firdzan', '2D - TRPF'),
        (v_instructor_id, '22502029', 'Muhammad Fauzan Al Dzakwan', '2D - TRPF'),
        (v_instructor_id, '22502030', 'Muhammad Reza', '2D - TRPF'),
        (v_instructor_id, '22502031', 'Muhammad Rifky Anugrah Surahman', '2D - TRPF'),
        (v_instructor_id, '22502032', 'Muhammad Wilby Noufal', '2D - TRPF'),
        (v_instructor_id, '22502033', 'Najwa Aqila Hafsah Elman', '2D - TRPF'),
        (v_instructor_id, '22502034', 'Phika Surtiani', '2D - TRPF'),
        (v_instructor_id, '22502035', 'Salwa Amelia', '2D - TRPF'),
        (v_instructor_id, '22502036', 'Zahran Adnan', '2D - TRPF')
    ON CONFLICT (instructor_id, nim) DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name;

    -- ====================================================================
    -- 3. INSERT MATA KULIAH CAD 2 (PRODI TRPF)
    -- ====================================================================
    INSERT INTO public.courses (
        id, instructor_id, name, code, academic_year, semester, slug,
        description, department, status, created_at, updated_at
    ) VALUES (
        v_course_id,
        v_instructor_id,
        'CAD 2',
        'CAD2',
        '2026/2027',
        'Genap',
        'cad-2-trpf',
        'Praktik perancangan konstruksi berbantuan komputer tingkat lanjut (CAD 2) Program Studi Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF) Politeknik Sorowako. Meliputi pemodelan rangka konstruksi baja las (weldments/structural steel), desain lembaran logam (sheet metal design & unfolding), pemodelan bejana tekan dan piping spool, perakitan struktur fabrikasi & BOM, serta penyusunan gambar kerja fabrikasi 2D standar ISO dengan simbol pengelasan AWS A2.4 / ISO 2553.',
        'Teknologi Rekayasa Pengelasan dan Fabrikasi',
        'PUBLISHED',
        NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        department = EXCLUDED.department,
        description = EXCLUDED.description,
        status = 'PUBLISHED';

    -- ====================================================================
    -- 4. INSERT SUB-CPMK (OBE)
    -- ====================================================================
    INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
    VALUES
        (v_cpmk1_id, v_course_id, 'Sub-CPMK 1', 'Mampu merancang pemodelan rangka konstruksi baja dan struktur las (Weldments & Structural Members) lengkap dengan gusset, end cap, weld bead, dan penyusunan Cut List fabrikasi presisi.', 25.00),
        (v_cpmk2_id, v_course_id, 'Sub-CPMK 2', 'Mampu merancang komponen lembaran logam (Sheet Metal Design), menentukan K-Factor / Bend Allowance, serta menghasilkan pola bentangan (flat pattern) untuk proses fabrikasi shearing dan bending.', 25.00),
        (v_cpmk3_id, v_course_id, 'Sub-CPMK 3', 'Mampu memodelkan perakitan (Assembly Modeling) struktur fabrikasi, bejana tekan, atau sistem perpipaan (piping spool) serta melakukan analisis interferensi part dan Bill of Materials (BOM).', 25.00),
        (v_cpmk4_id, v_course_id, 'Sub-CPMK 4', 'Mampu menyusun gambar kerja fabrikasi (Shop Drawing / Isometric Spool) 2D standar ISO dengan penunjukan simbol pengelasan (ISO 2553 / AWS A2.4), toleransi dimensi, dan instruksi perakitan.', 25.00)
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        weight_percent = EXCLUDED.weight_percent;

    -- ====================================================================
    -- 5. INSERT 6 GELOMBANG PERIODE PRAKTIK CAD 2
    -- ====================================================================
    INSERT INTO public.practice_periods (id, course_id, name, period_number, start_date, end_date, status)
    VALUES
        (v_per1_id, v_course_id, 'Gelombang 1 (Blok Praktik 1)', 1, '2026-09-07', '2026-09-11', 'ACTIVE'),
        (v_per2_id, v_course_id, 'Gelombang 2 (Blok Praktik 2)', 2, '2026-09-14', '2026-09-18', 'UPCOMING'),
        (v_per3_id, v_course_id, 'Gelombang 3 (Blok Praktik 3)', 3, '2026-09-21', '2026-09-25', 'UPCOMING'),
        (v_per4_id, v_course_id, 'Gelombang 4 (Blok Praktik 4)', 4, '2026-09-28', '2026-10-02', 'UPCOMING'),
        (v_per5_id, v_course_id, 'Gelombang 5 (Blok Praktik 5)', 5, '2026-10-05', '2026-10-09', 'UPCOMING'),
        (v_per6_id, v_course_id, 'Gelombang 6 (Blok Praktik 6)', 6, '2026-10-12', '2026-10-16', 'UPCOMING')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status;

    -- ====================================================================
    -- 6. ENROLL PESERTA PRAKTIK SESUAI MATRIKS ROTASI RESMI (6 Gelombang x 6 Siswa)
    -- ====================================================================
    -- Gelombang 1
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per1_id, s.id, 'IN_PROGRESS', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502003', '22502007', '22502014', '22502020', '22502027', '22502034')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 2
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per2_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502004', '22502009', '22502015', '22502022', '22502028', '22502033')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 3
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per3_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502005', '22502010', '22502016', '22502023', '22502030', '22502036')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 4
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per4_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502002', '22502007', '22502018', '22502026', '22502031', '22502035')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 5
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per5_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502001', '22502012', '22502019', '22502025', '22502029', '22502032')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 6
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per6_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502006', '22502008', '22502011', '22502013', '22502017', '22502024')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- ====================================================================
    -- 7. INSERT 5 UNIT MODUL PEMBELAJARAN
    -- ====================================================================
    INSERT INTO public.learning_units (id, period_id, unit_number, title, description)
    VALUES
        (v_unit1_id, v_per1_id, 1, 'Modul 1: Pemodelan Rangka Struktur Baja Las (Weldment & Structural Member)', 'Pemodelan struktur rangka batang baja, pemilihan standar profil, corner treatment (miter/butt), gusset, end cap, dan Cut List fabrikasi.'),
        (v_unit2_id, v_per1_id, 2, 'Modul 2: Perancangan Lembaran Logam & Pola Bentangan (Sheet Metal Design & Unfold)', 'Fitur Base Flange, Edge Flange, Miter Flange, Hem, penentuan parameter K-Factor/Bend Allowance, dan pola bentangan datar (flat pattern).'),
        (v_unit3_id, v_per1_id, 3, 'Modul 3: Desain Tangki, Bejana Tekan & Sistem Perpipaan (Pressure Vessel & Piping Spool)', 'Pemodelan silinder shell roll, head torispherical/ellipsoidal, orientasi nozzle, dan perancangan jalur piping spool.'),
        (v_unit4_id, v_per1_id, 4, 'Modul 4: Perakitan Struktur Fabrikasi & Bill of Materials (Assembly & Cut List BOM)', 'Strategi assembly konstruksi fabrikasi, constraint geometri, uji tabrakan interferensi, dan otomatisasi tabel BOM.'),
        (v_unit5_id, v_per1_id, 5, 'Modul 5: Technical Drafting Fabrikasi & Notasi Simbol Las Standar (ISO 2553 & AWS A2.4)', 'Penyusunan gambar kerja shop drawing A3 ISO, proyeksi ortogonal, irisan detail sambungan las, dan notasi simbol pengelasan AWS/ISO.')
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description;

    -- ====================================================================
    -- 8. PENUGASAN PRAKTIK CAD 2
    -- ====================================================================
    INSERT INTO public.assignments (id, period_id, unit_id, title, description, deadline, max_score, allowed_file_type)
    VALUES
        ('a2c3d4e5-cad2-4000-8000-000000000601'::UUID, v_per1_id, v_unit1_id, 'Tugas Modul 1: Desain & Cut List Rangka Meja Fabrikasi Heavy-Duty', 'Kumpulkan lembar gambar kerja 3D Weldment rangka meja kerja fabrikasi lengkap dengan Cut List Table terinci. Format file PDF.', NOW() + INTERVAL '7 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000602'::UUID, v_per1_id, v_unit2_id, 'Tugas Modul 2: Pemodelan Enclosure Fabrikasi Lembaran Logam & Flat Pattern', 'Upload laporan hasil pemodelan 3D bodi enclosure, diagram bentangan datar (Flat Pattern Unfold), dan tabel K-factor. Format PDF.', NOW() + INTERVAL '10 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000603'::UUID, v_per1_id, v_unit3_id, 'Tugas Modul 3: Desain Tangki Penampung Fluida & Isometrik Spool Pipa', 'Kumpulkan gambar model 3D tangki bertekanan dengan nozzle dan isometrik spool jalur perpipaan standar ASME. Format PDF.', NOW() + INTERVAL '14 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000604'::UUID, v_per1_id, v_unit4_id, 'Tugas Modul 4: Evaluasi Perakitan Gantry Frame & Tabel Bill of Materials (BOM)', 'Laporan analisis perakitan struktur fabrikasi gantry crane, hasil uji tabrakan part, dan tabel BOM lengkap estimasi berat. Format PDF.', NOW() + INTERVAL '18 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000605'::UUID, v_per1_id, v_unit5_id, 'Tugas Modul 5 (Tugas Akhir): Shop Drawing Fabrikasi Komprehensif Berstandar Simbol Las ISO/AWS', 'Karya akhir gambar kerja shop drawing fabrikasi ukuran A3 standar Politeknik Sorowako lengkap simbol pengelasan AWS/ISO dan etiket resmi. Format PDF.', NOW() + INTERVAL '21 days', 100, 'PDF')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Seed CAD 2 (Prodi TRPF) Berhasil: Course, 35 Mahasiswa Kelas 2D - TRPF, 6 Gelombang Periode, 5 Unit Modul, dan Tugas Telah Didaftarkan!';
END $$;
