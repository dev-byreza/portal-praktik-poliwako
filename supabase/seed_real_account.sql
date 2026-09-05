-- ====================================================================
-- SEED SCRIPT: Akun Instruktur Real & Storage Configuration
-- Akun: rezaf@politekniksorowako.ac.id
-- Password: 732401#Jhe
-- ====================================================================

-- 1. Pastikan ekstensi pgcrypto aktif untuk enkripsi password bcrypt
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    existing_user_id UUID;
BEGIN
    -- Cek apakah user sudah ada di auth.users
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF existing_user_id IS NULL THEN
        -- Insert user baru ke auth.users Supabase dengan password terenkripsi bcrypt
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            role,
            aud,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'rezaf@politekniksorowako.ac.id',
            crypt('732401#Jhe', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"M. Reza Firmansyah","department":"Teknik Mesin"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );

        -- Insert ke public.profiles
        INSERT INTO public.profiles (
            id,
            email,
            name,
            nip,
            department,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            'rezaf@politekniksorowako.ac.id',
            'M. Reza Firmansyah',
            '198709122015041002',
            'Teknik Mesin',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            updated_at = NOW();

        RAISE NOTICE 'Akun instruktur rezaf@politekniksorowako.ac.id berhasil dibuat dengan ID %', new_user_id;
    ELSE
        -- Update password dan profil jika user sudah pernah terdaftar
        UPDATE auth.users
        SET encrypted_password = crypt('732401#Jhe', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = existing_user_id;

        INSERT INTO public.profiles (
            id,
            email,
            name,
            nip,
            department,
            created_at,
            updated_at
        ) VALUES (
            existing_user_id,
            'rezaf@politekniksorowako.ac.id',
            'M. Reza Firmansyah',
            '198709122015041002',
            'Teknik Mesin',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            updated_at = NOW();

        RAISE NOTICE 'Akun instruktur rezaf@politekniksorowako.ac.id berhasil diperbarui (ID: %)', existing_user_id;
    END IF;
END $$;

-- ====================================================================
-- 2. KONFIGURASI STORAGE BUCKET UNTUK TUGAS PDF
-- PRD Reference: Section 42, 43, 83 (Internal PDF Submission Only)
-- ====================================================================

-- Bucket 'submissions' untuk pengumpulan tugas mahasiswa (Private, PDF-only, max 25MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'submissions',
    'submissions',
    FALSE,
    26214400, -- 25MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf'];

-- Bucket 'materials' untuk materi kuliah dan instruksi (Public-read, max 50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'materials',
    'materials',
    TRUE,
    52428800, -- 50MB
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 52428800;

-- ====================================================================
-- 3. POLICIES STORAGE BUCKET SUBMISSIONS
-- ====================================================================

-- Instruktur memiliki akses penuh (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Instructors full access to submissions'
    ) THEN
        CREATE POLICY "Instructors full access to submissions"
        ON storage.objects FOR ALL
        TO authenticated
        USING (bucket_id = 'submissions');
    END IF;
END $$;

-- Mahasiswa dapat mengunggah file tugas PDF ke bucket 'submissions'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Students upload PDF to submissions'
    ) THEN
        CREATE POLICY "Students upload PDF to submissions"
        ON storage.objects FOR INSERT
        TO anon, authenticated
        WITH CHECK (
            bucket_id = 'submissions' AND 
            (LOWER(storage.extension(name)) = 'pdf')
        );
    END IF;
END $$;

-- Mahasiswa dapat membaca submission melalui Signed URL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Students view submission via signed URL'
    ) THEN
        CREATE POLICY "Students view submission via signed URL"
        ON storage.objects FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'submissions');
    END IF;
END $$;
