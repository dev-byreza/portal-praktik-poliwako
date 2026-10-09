-- Enrolled students create their first password directly after NIM lookup.
-- Existing passwords can only be cleared by an authorized course instructor.
CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_nim TEXT,
  p_password TEXT,
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
  v_session_token TEXT;
BEGIN
  IF length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password minimal 8 karakter dan maksimal 72 byte.');
  END IF;

  -- Serialize attempts so two callers cannot overwrite a newly created password.
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'NIM tidak ditemukan.');
  END IF;
  IF coalesce(v_student.password_hash, '') <> '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password akun ini sudah pernah dibuat. Silakan gunakan login password.');
  END IF;

  SELECT pp.period_id, c.slug INTO v_period_id, v_course_slug
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND (p_course_slug IS NULL OR c.slug = p_course_slug)
    AND (p_period_id IS NULL OR p.id = p_period_id)
  ORDER BY (p.status = 'ACTIVE') DESC, p.period_number ASC
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada periode praktik ini.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = NOW()
  WHERE id = v_student.id;
  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;
  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;
  v_session_token := private.issue_student_session(v_student.id, v_period_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Password berhasil dibuat.',
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id, 'nim', v_student.nim, 'name', v_student.name,
      'className', v_student.class_name, 'email', v_student.email, 'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_set_password(
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_course_slug, p_period_id);
$$;

-- Older clients may still send the former code argument. Both signatures use
-- the same first-password-only guard; a code can no longer replace a password.
CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_nim TEXT, p_password TEXT, p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL, p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_course_slug, p_period_id);
$$;

CREATE OR REPLACE FUNCTION public.student_auth_set_password(
  p_nim TEXT, p_password TEXT, p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL, p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_course_slug, p_period_id);
$$;

CREATE OR REPLACE FUNCTION private.student_auth_reset_password(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesi instruktur diperlukan untuk mereset password.';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.practice_participants pp
    JOIN public.practice_periods p ON p.id = pp.period_id
    WHERE pp.student_id = v_student.id AND public.is_course_owner(p.course_id)
  ) THEN
    RAISE EXCEPTION 'Instruktur tidak berwenang mengelola akun mahasiswa ini.';
  END IF;

  UPDATE public.students SET password_hash = NULL, updated_at = NOW() WHERE id = v_student.id;
  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;
  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Password direset. Mahasiswa dapat langsung membuat password baru.');
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_reset_password(p_student_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_reset_password(p_student_id);
$$;

REVOKE ALL ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION private.student_auth_reset_password(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_reset_password(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_reset_password(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_reset_password(UUID) TO authenticated;

-- Retain historical records while retiring code issuance from the API.
REVOKE ALL ON FUNCTION private.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
