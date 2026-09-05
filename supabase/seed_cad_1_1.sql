-- ====================================================================
-- SEED SCRIPT: Mata Kuliah CAD 1.1 & 36 Mahasiswa Real Kelas 1C
-- Instruktur: rezaf@politekniksorowako.ac.id (Reza Febriadi Rauf)
-- Program Studi: Rekayasa Perancangan Mekanik
-- Politeknik Sorowako - Semester Gasal 2026/2027
-- ====================================================================

DO $$
DECLARE
    v_instructor_id UUID;
    v_course_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000001'::UUID;
    v_cpmk1_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000101'::UUID;
    v_cpmk2_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000102'::UUID;
    v_cpmk3_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000103'::UUID;
    
    v_per1_id UUID := 'b1b2c3d4-cad1-4000-8000-000000000201'::UUID;
    v_per2_id UUID := 'b1b2c3d4-cad1-4000-8000-000000000202'::UUID;
    v_per3_id UUID := 'b1b2c3d4-cad1-4000-8000-000000000203'::UUID;
    v_per4_id UUID := 'b1b2c3d4-cad1-4000-8000-000000000204'::UUID;
BEGIN
    -- 1. Cari atau buat profile instruktur
    SELECT id INTO v_instructor_id
    FROM public.profiles
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF v_instructor_id IS NULL THEN
        -- Cek auth.users jika profile belum dibuat
        SELECT id INTO v_instructor_id
        FROM auth.users
        WHERE email = 'rezaf@politekniksorowako.ac.id';

        IF v_instructor_id IS NULL THEN
            v_instructor_id := gen_random_uuid();
            -- Insert auth.users
            INSERT INTO auth.users (
                id, instance_id, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
            ) VALUES (
                v_instructor_id, '00000000-0000-0000-0000-000000000000', 'rezaf@politekniksorowako.ac.id',
                crypt('732401#Jhe', gen_salt('bf')), NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                '{"name":"Reza Febriadi Rauf","department":"Rekayasa Perancangan Mekanik"}'::jsonb,
                'authenticated', 'authenticated', NOW(), NOW()
            );
        END IF;

        -- Pastikan profile ada
        INSERT INTO public.profiles (id, email, name, nip, department, created_at, updated_at)
        VALUES (
            v_instructor_id,
            'rezaf@politekniksorowako.ac.id',
            'Reza Febriadi Rauf',
            '198709122015041002',
            'Rekayasa Perancangan Mekanik',
            NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            department = EXCLUDED.department;
    ELSE
        UPDATE public.profiles
        SET name = 'Reza Febriadi Rauf',
            department = 'Rekayasa Perancangan Mekanik'
        WHERE id = v_instructor_id;
    END IF;


    -- ====================================================================
    -- 2. INSERT 36 MAHASISWA REAL KELAS 1C
    -- ====================================================================
    INSERT INTO public.students (instructor_id, nim, name, class_name)
    VALUES
        (v_instructor_id, '22603001', 'Achmad Fawzan', '1C'),
        (v_instructor_id, '22603002', 'Ade Meilan Alifia Sulaeman', '1C'),
        (v_instructor_id, '22603003', 'Affan Farsyah', '1C'),
        (v_instructor_id, '22603004', 'Afiqah Azwa Safrina', '1C'),
        (v_instructor_id, '22603005', 'Andika Azis', '1C'),
        (v_instructor_id, '22603006', 'Anesya Nurhawizah', '1C'),
        (v_instructor_id, '22603007', 'Ayu Anugrah', '1C'),
        (v_instructor_id, '22603008', 'Ayu Irmayanti', '1C'),
        (v_instructor_id, '22603009', 'Bunga Cahya Putri Jenal', '1C'),
        (v_instructor_id, '22603010', 'Daniel Adian Sura Parinding', '1C'),
        (v_instructor_id, '22603011', 'Dede Irawan', '1C'),
        (v_instructor_id, '22603012', 'Faiya Aisyah Naswah', '1C'),
        (v_instructor_id, '22603013', 'Haura Hafizhah', '1C'),
        (v_instructor_id, '22603014', 'Juan Farand', '1C'),
        (v_instructor_id, '22603015', 'Khumaira Khaerunnisa', '1C'),
        (v_instructor_id, '22603016', 'M. Fauzan Adhitya Pratama H', '1C'),
        (v_instructor_id, '22603017', 'Muh. Anugrah Sesar', '1C'),
        (v_instructor_id, '22603018', 'Muh. Diaz Raditya B.', '1C'),
        (v_instructor_id, '22603019', 'Muh. Fakhrul Al Farezy Rozadin', '1C'),
        (v_instructor_id, '22603020', 'Muh. Raihan Aryan', '1C'),
        (v_instructor_id, '22603021', 'Muhammad Abyan Zaky', '1C'),
        (v_instructor_id, '22603022', 'Muhammad Agam Haq', '1C'),
        (v_instructor_id, '22603023', 'Muhammad Aidil Ahmadi', '1C'),
        (v_instructor_id, '22603024', 'Nadya Zalzabila', '1C'),
        (v_instructor_id, '22603025', 'Ranita Rosa Putri', '1C'),
        (v_instructor_id, '22603026', 'Rausyan Fikran', '1C'),
        (v_instructor_id, '22603027', 'Rizky Ramadhani A.', '1C'),
        (v_instructor_id, '22603028', 'Rudhi Adhana Zet', '1C'),
        (v_instructor_id, '22603029', 'Salsabila Aprilia Sukardi', '1C'),
        (v_instructor_id, '22603030', 'Saskia Uhti Ramadhani', '1C'),
        (v_instructor_id, '22603031', 'Sayyef Al Islam', '1C'),
        (v_instructor_id, '22603032', 'Tazkia Kausara', '1C'),
        (v_instructor_id, '22603033', 'Wahidatul Hasanah', '1C'),
        (v_instructor_id, '22603034', 'William Gredi Sidwel Alinsky', '1C'),
        (v_instructor_id, '22603035', 'Winda Tri Lestari', '1C'),
        (v_instructor_id, '22603036', 'Yulfikatrin Yuyun', '1C')
    ON CONFLICT (instructor_id, nim) DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name;

    -- ====================================================================
    -- 3. INSERT MATA KULIAH CAD 1.1
    -- ====================================================================
    INSERT INTO public.courses (
        id, instructor_id, name, code, academic_year, semester, slug,
        description, department, status, created_at, updated_at
    ) VALUES (
        v_course_id,
        v_instructor_id,
        'CAD 1.1',
        'CAD1.1',
        '2026/2027',
        'Ganjil',
        'cad-1-1',
        'Praktik perancangan mekanik berbantuan komputer (CAD 1.1) Program Studi Rekayasa Perancangan Mekanik. Meliputi 2D sketching parametrik, pemodelan 3D solid part, assembly komponen mesin, dan drafting gambar kerja standar ISO.',
        'Rekayasa Perancangan Mekanik',
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
    -- 4. INSERT SUB-CPMK
    -- ====================================================================
    INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
    VALUES
        (v_cpmk1_id, v_course_id, 'Sub-CPMK 1', 'Mampu memahami antarmuka software CAD, navigasi viewport, dan parameter sketching 2D sesuai standar ISO.', 30.00),
        (v_cpmk2_id, v_course_id, 'Sub-CPMK 2', 'Mampu membuat pemodelan part 3D parametrik (Extrude, Revolve, Sweep, Fillet/Chamfer) dengan akurasi dimensi.', 40.00),
        (v_cpmk3_id, v_course_id, 'Sub-CPMK 3', 'Mampu menyusun gambar kerja drafting 2D lengkap dengan proyeksi orthogonal, potongan (section), dan toleransi geometri.', 30.00)
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        weight_percent = EXCLUDED.weight_percent;

    -- ====================================================================
    -- 5. INSERT 4 GELOMBANG PERIODE PRAKTIK CAD 1.1 (Minggu 34, 36, 37, 38)
    -- ====================================================================
    INSERT INTO public.practice_periods (id, course_id, name, period_number, start_date, end_date, status)
    VALUES
        (v_per1_id, v_course_id, 'Gelombang 1 (Minggu 34)', 1, '2026-08-17', '2026-08-21', 'COMPLETED'),
        (v_per2_id, v_course_id, 'Gelombang 2 (Minggu 36)', 2, '2026-08-31', '2026-09-04', 'ACTIVE'),
        (v_per3_id, v_course_id, 'Gelombang 3 (Minggu 37)', 3, '2026-09-07', '2026-09-11', 'UPCOMING'),
        (v_per4_id, v_course_id, 'Gelombang 4 (Minggu 38)', 4, '2026-09-14', '2026-09-18', 'UPCOMING')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status;

    -- ====================================================================
    -- 6. ENROLL PESERTA PRAKTIK SESUAI PEMBAGIAN JADWAL RESMI
    -- ====================================================================
    -- Gelombang 1 (Minggu 34: 12 Mahasiswa)
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per1_id, s.id, 'LEARNING_COMPLETE', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22603003', '22603004', '22603006', '22603010', '22603012', '22603015', '22603020', '22603021', '22603025', '22603027', '22603030', '22603035')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 2 (Minggu 36: 11 Mahasiswa)
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per2_id, s.id, 'IN_PROGRESS', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22603001', '22603005', '22603007', '22603011', '22603013', '22603016', '22603018', '22603024', '22603028', '22603031', '22603036')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 3 (Minggu 37: 9 Mahasiswa)
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per3_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22603008', '22603009', '22603014', '22603017', '22603022', '22603026', '22603029', '22603032', '22603034')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 4 (Minggu 38: 4 Mahasiswa)
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per4_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22603002', '22603019', '22603023', '22603033')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- ====================================================================
    -- 7. INSERT 5 UNIT PEMBELAJARAN & PENUGASAN CAD 1.1 (Gelombang 2 Active)
    -- ====================================================================
    INSERT INTO public.learning_units (id, period_id, unit_number, title, description)
    VALUES
        ('c1b2c3d4-cad1-4000-8000-000000000301'::UUID, v_per2_id, 1, 'Modul 1: Antarmuka CAD & 2D Sketching Parametrik', 'Pengenalan UI/UX software CAD, origin, planes, constraint dimensi dan geometri dasar.'),
        ('c1b2c3d4-cad1-4000-8000-000000000302'::UUID, v_per2_id, 2, 'Modul 2: Fitur 3D Solid Dasar (Extrude & Revolve)', 'Pembuatan part solid 3D dasar, cut extrude, fillet, chamfer, dan shell feature.'),
        ('c1b2c3d4-cad1-4000-8000-000000000303'::UUID, v_per2_id, 3, 'Modul 3: Pemodelan Kompleks (Sweep, Loft & Pattern)', 'Pemodelan kontur berulang, helical sweep, draft angle, dan circular/linear pattern.'),
        ('c1b2c3d4-cad1-4000-8000-000000000304'::UUID, v_per2_id, 4, 'Modul 4: Assembly Modeling & Standard Fasteners', 'Perakitan komponen multi-part, mate constraints (coincident, concentric, distance), bill of materials.'),
        ('c1b2c3d4-cad1-4000-8000-000000000305'::UUID, v_per2_id, 5, 'Modul 5: 2D Technical Drafting & GD&T ISO', 'Penyusunan etiket gambar, proyeksi orthogonal Amerika/Eropa, section view, dan toleransi geometri ISO.')
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description;

    -- Penugasan Modul
    INSERT INTO public.assignments (period_id, unit_id, title, description, deadline, max_score, allowed_file_type)
    VALUES
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000301'::UUID, 'Tugas Modul 1: Lembar Latihan 2D Sketching', 'Kumpulkan lembar gambar kerja 2D sketching berdimensi presisi dalam format PDF.', NOW() + INTERVAL '7 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000302'::UUID, 'Tugas Modul 2: Pemodelan Part Flange & Shaft', 'Upload laporan hasil pemodelan 3D solid part beserta drawing views PDF.', NOW() + INTERVAL '10 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000303'::UUID, 'Tugas Modul 3: Pemodelan Rotor Impeller', 'Laporan langkah kerja fitur sweep dan pattern pada komponen rotor.', NOW() + INTERVAL '14 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000304'::UUID, 'Tugas Modul 4: Evaluasi Perakitan Gearbox', 'Laporan assembly, cek interferensi part, dan bill of materials (BOM).', NOW() + INTERVAL '18 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000305'::UUID, 'Tugas Modul 5: Gambar Kerja Lengkap Etiket & Toleransi ISO', 'Karya akhir gambar kerja 2D standar industri manufaktur dalam format PDF.', NOW() + INTERVAL '21 days', 100, 'PDF')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed CAD 1.1 Berhasil: Course, 36 Mahasiswa Kelas 1C, 4 Gelombang Periode, dan 5 Unit Modul Telah Didaftarkan!';
END $$;

