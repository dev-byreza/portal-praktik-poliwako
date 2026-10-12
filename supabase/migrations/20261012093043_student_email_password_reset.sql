DROP FUNCTION IF EXISTS public.student_google_login(TEXT, UUID);
DROP FUNCTION IF EXISTS private.student_google_login(TEXT, UUID);

CREATE OR REPLACE FUNCTION private.student_auth_reset_own_password(p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_student public.students%ROWTYPE;
  v_student_count BIGINT;
  v_amr JSONB := auth.jwt()->'amr';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Sesi reset email tidak ditemukan.');
  END IF;

  IF length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password minimal 8 karakter dan maksimal 72 byte.');
  END IF;

  SELECT lower(trim(u.email)) INTO v_email
  FROM auth.users AS u
  WHERE u.id = v_user_id
    AND u.email_confirmed_at IS NOT NULL
    AND lower(trim(u.email)) = lower(trim(auth.jwt()->>'email'));

  IF v_email IS NULL OR split_part(v_email, '@', 2) <> 'politekniksorowako.ac.id' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Email reset resmi mahasiswa tidak terverifikasi.');
  END IF;

  IF jsonb_typeof(v_amr) IS DISTINCT FROM 'array' OR NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_amr) = 'array' THEN v_amr ELSE '[]'::jsonb END) AS auth_method
    WHERE auth_method->>'method' IN ('otp', 'magiclink')
      AND (auth_method->>'timestamp') ~ '^[0-9]+$'
      AND (auth_method->>'timestamp')::numeric >= extract(epoch FROM now() - interval '15 minutes')
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Silakan gunakan tautan reset email yang baru dikirim.');
  END IF;

  SELECT count(*) INTO v_student_count
  FROM public.students AS student
  WHERE lower(trim(student.nim)) = split_part(v_email, '@', 1)
    AND coalesce(student.password_hash, '') <> ''
    AND EXISTS (
      SELECT 1 FROM public.practice_participants AS participant
      WHERE participant.student_id = student.id
    );

  IF v_student_count <> 1 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Akun mahasiswa dengan email tersebut tidak ditemukan atau tidak unik.');
  END IF;

  SELECT * INTO v_student
  FROM public.students AS student
  WHERE lower(trim(student.nim)) = split_part(v_email, '@', 1)
    AND coalesce(student.password_hash, '') <> ''
    AND EXISTS (
      SELECT 1 FROM public.practice_participants AS participant
      WHERE participant.student_id = student.id
    )
  FOR UPDATE;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = NOW()
  WHERE id = v_student.id;

  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;

  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Password berhasil direset.');
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_reset_own_password(p_password TEXT)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_reset_own_password(p_password);
$$;

REVOKE ALL ON FUNCTION private.student_auth_reset_own_password(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_reset_own_password(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_reset_own_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_reset_own_password(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
