DROP FUNCTION IF EXISTS public.student_auth_reset_own_password(TEXT);
DROP FUNCTION IF EXISTS private.student_auth_reset_own_password(TEXT);
DROP FUNCTION IF EXISTS public.student_auth_reset_password(UUID);
DROP FUNCTION IF EXISTS private.student_auth_reset_password(UUID);

CREATE OR REPLACE FUNCTION private.student_auth_issue_password_reset_token(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_token TEXT := upper(encode(gen_random_bytes(12), 'hex'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesi instruktur diperlukan untuk menerbitkan token reset.';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.practice_participants pp
    JOIN public.practice_periods p ON p.id = pp.period_id
    WHERE pp.student_id = v_student.id
      AND public.is_course_owner(p.course_id)
  ) THEN
    RAISE EXCEPTION 'Instruktur tidak berwenang mengelola akun mahasiswa ini.';
  END IF;

  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id
    AND purpose = 'PASSWORD_RESET'
    AND consumed_at IS NULL
    AND revoked_at IS NULL;

  INSERT INTO private.student_activation_codes(
    student_id, token_hash, purpose, created_by, expires_at
  ) VALUES (
    v_student.id,
    encode(digest(v_token, 'sha256'), 'hex'),
    'PASSWORD_RESET',
    auth.uid(),
    NOW() + INTERVAL '24 hours'
  );

  RETURN jsonb_build_object('success', TRUE, 'token', v_token, 'expiresInHours', 24);
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_issue_password_reset_token(p_student_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_issue_password_reset_token(p_student_id);
$$;

CREATE OR REPLACE FUNCTION private.student_auth_reset_password_with_token(
  p_nim TEXT,
  p_token TEXT,
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
  v_reset private.student_activation_codes%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_period_id UUID;
BEGIN
  IF octet_length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password minimal 8 karakter dan maksimal 72 byte.');
  END IF;
  IF length(trim(coalesce(p_token, ''))) <> 24 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Token reset tidak valid atau kedaluwarsa.');
  END IF;

  SELECT * INTO v_reset
  FROM private.student_activation_codes
  WHERE token_hash = encode(digest(upper(trim(p_token)), 'sha256'), 'hex')
    AND purpose = 'PASSWORD_RESET'
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND failed_attempts < 5
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Token reset tidak valid atau kedaluwarsa. Minta token baru kepada instruktur.');
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = v_reset.student_id
  FOR UPDATE;
  IF NOT FOUND OR lower(trim(v_student.nim)) <> lower(trim(coalesce(p_nim, ''))) THEN
    UPDATE private.student_activation_codes
    SET failed_attempts = failed_attempts + 1,
        revoked_at = CASE WHEN failed_attempts >= 4 THEN NOW() ELSE revoked_at END
    WHERE id = v_reset.id;
    RETURN jsonb_build_object('success', FALSE, 'message', 'NIM atau token reset tidak cocok.');
  END IF;

  SELECT pp.period_id INTO v_period_id
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
  SET consumed_at = NOW()
  WHERE id = v_reset.id;
  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id
    AND id <> v_reset.id
    AND consumed_at IS NULL
    AND revoked_at IS NULL;
  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Password berhasil diperbarui.');
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_reset_password_with_token(
  p_nim TEXT,
  p_token TEXT,
  p_password TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_reset_password_with_token(p_nim, p_token, p_password, p_course_slug, p_period_id);
$$;

REVOKE ALL ON FUNCTION private.student_auth_issue_password_reset_token(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_issue_password_reset_token(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_issue_password_reset_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_issue_password_reset_token(UUID) TO authenticated;

REVOKE ALL ON FUNCTION private.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
