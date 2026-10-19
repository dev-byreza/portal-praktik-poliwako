DROP POLICY IF EXISTS "System admins add students" ON public.students;
DROP POLICY IF EXISTS "System admins delete students" ON public.students;
DROP FUNCTION IF EXISTS public.is_system_admin();

CREATE OR REPLACE FUNCTION private.is_system_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS user_account
    WHERE user_account.id = (SELECT auth.uid())
      AND lower(user_account.email) = 'rezaf@politekniksorowako.ac.id'
      AND user_account.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION private.is_system_admin() FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_system_admin() TO authenticated;

CREATE POLICY "System admins add students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (private.is_system_admin());

CREATE POLICY "System admins delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (private.is_system_admin());

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
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menerbitkan token reset password.';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;

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

NOTIFY pgrst, 'reload schema';
