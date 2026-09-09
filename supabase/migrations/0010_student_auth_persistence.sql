-- Persist NIM-based student passwords in Supabase so activation and login
-- work across browsers and devices without exposing password hashes.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.student_auth_lookup(
  p_nim TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
  v_course_slug TEXT;
  v_has_enrollment BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exists', FALSE,
      'isEnrolled', FALSE,
      'hasCreatedPassword', FALSE,
      'periodId', NULL
    );
  END IF;

  SELECT pp.period_id, c.slug INTO v_period_id, v_course_slug
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND (p_course_slug IS NULL OR c.slug = p_course_slug)
  ORDER BY (p_period_id IS NOT NULL AND p.id = p_period_id) DESC,
           (p.status = 'ACTIVE') DESC,
           p.period_number ASC
  LIMIT 1;

  v_has_enrollment := v_period_id IS NOT NULL;

  RETURN jsonb_build_object(
    'exists', TRUE,
    'isEnrolled', v_has_enrollment,
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'hasCreatedPassword', coalesce(v_student.password_hash, '') <> '',
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_student.email,
      'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_student_id UUID,
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
BEGIN
  IF length(trim(coalesce(p_password, ''))) < 4 OR length(p_password) > 200 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password harus 4 sampai 200 karakter.');
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND lower(trim(nim)) = lower(trim(p_nim));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Data mahasiswa tidak ditemukan.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND c.slug = p_course_slug
    AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF coalesce(v_student.password_hash, '') <> '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password akun ini sudah pernah dibuat. Silakan gunakan login password.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')),
      updated_at = now()
  WHERE id = v_student.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Password berhasil disimpan.',
    'periodId', v_period_id,
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_student.email,
      'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.student_auth_login(
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1;

  IF NOT FOUND OR coalesce(v_student.password_hash, '') = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Akun belum memiliki password. Silakan buat password terlebih dahulu.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND c.slug = p_course_slug
    AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF v_student.password_hash <> trim(p_password)
     AND crypt(trim(p_password), v_student.password_hash) <> v_student.password_hash THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password salah. Periksa kembali password Anda.');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Login berhasil.',
    'periodId', v_period_id,
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_student.email,
      'createdAt', v_student.created_at
    )
  );
END;
$$;

-- Public wrappers are invoker functions; privileged work stays in the
-- unexposed private schema and only returns the minimum response fields.
CREATE OR REPLACE FUNCTION public.student_auth_lookup(
  p_nim TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.student_auth_lookup(p_nim, p_course_slug, p_period_id); $$;

CREATE OR REPLACE FUNCTION public.student_auth_set_password(
  p_student_id UUID,
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.student_auth_set_password(p_student_id, p_nim, p_password, p_course_slug, p_period_id); $$;

CREATE OR REPLACE FUNCTION public.student_auth_login(
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.student_auth_login(p_nim, p_password, p_course_slug, p_period_id); $$;

REVOKE ALL ON FUNCTION private.student_auth_lookup(TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_auth_login(TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_lookup(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_login(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_lookup(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_login(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
