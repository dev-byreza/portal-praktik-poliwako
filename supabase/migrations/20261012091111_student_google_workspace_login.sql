CREATE OR REPLACE FUNCTION private.student_google_login(
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_provider TEXT;
  v_providers JSONB;
  v_student public.students%ROWTYPE;
  v_student_id UUID;
  v_period_id UUID;
  v_course_slug TEXT;
  v_session_token TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Sesi Google tidak valid. Silakan masuk kembali.');
  END IF;

  SELECT lower(trim(u.email)), lower(COALESCE(u.raw_app_meta_data->>'provider', '')),
         u.raw_app_meta_data->'providers'
  INTO v_email, v_provider, v_providers
  FROM auth.users AS u
  WHERE u.id = v_user_id
    AND u.email_confirmed_at IS NOT NULL;

  IF v_email IS NULL
     OR split_part(v_email, '@', 2) <> 'politekniksorowako.ac.id'
     OR NOT (v_provider = 'google' OR COALESCE(v_providers ? 'google', FALSE)) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Gunakan akun Google Politeknik Sorowako dengan email NIM@politekniksorowako.ac.id.');
  END IF;

  SELECT student.id,
         period.id,
         course.slug
  INTO v_student_id, v_period_id, v_course_slug
  FROM public.students AS student
  JOIN public.practice_participants AS participant
    ON participant.student_id = student.id
  JOIN public.practice_periods AS period
    ON period.id = participant.period_id
  JOIN public.courses AS course
    ON course.id = period.course_id
  WHERE lower(trim(student.nim)) = split_part(v_email, '@', 1)
    AND course.status = 'PUBLISHED'
    AND (NULLIF(trim(p_course_slug), '') IS NULL OR course.slug = trim(p_course_slug))
    AND (p_period_id IS NULL OR period.id = p_period_id)
  ORDER BY
    CASE period.status WHEN 'ACTIVE' THEN 0 WHEN 'UPCOMING' THEN 1 ELSE 2 END,
    CASE WHEN period.status = 'UPCOMING' THEN period.start_date END ASC,
    period.start_date DESC,
    period.created_at DESC
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Email belum cocok dengan NIM mahasiswa yang terdaftar pada periode praktik aktif.');
  END IF;

  SELECT * INTO v_student
  FROM public.students AS student
  WHERE student.id = v_student_id;

  v_session_token := private.issue_student_session(v_student.id, v_period_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Login berhasil.',
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_email,
      'hasCreatedPassword', COALESCE(v_student.password_hash, '') <> '',
      'createdAt', v_student.created_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.student_google_login(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.student_google_login(TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.student_google_login(
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_google_login(p_course_slug, p_period_id);
$$;

REVOKE ALL ON FUNCTION public.student_google_login(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_google_login(TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_instructor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_department TEXT;
  v_nip TEXT;
  v_avatar_url TEXT;
BEGIN
  IF lower(COALESCE(NEW.email, '')) NOT LIKE '%@politekniksorowako.ac.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya akun email @politekniksorowako.ac.id yang diizinkan.';
  END IF;

  IF split_part(lower(trim(NEW.email)), '@', 2) = 'politekniksorowako.ac.id'
     AND EXISTS (
       SELECT 1
       FROM public.students AS student
       WHERE lower(trim(student.nim)) = split_part(lower(trim(NEW.email)), '@', 1)
     ) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );
  v_department := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Teknik Mesin');
  v_nip := NULLIF(NEW.raw_user_meta_data->>'nip', '');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
  VALUES (NEW.id, lower(NEW.email), v_name, v_nip, v_department, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
