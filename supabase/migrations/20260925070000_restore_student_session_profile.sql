-- Restore the signed-in student's profile after a refresh using only the
-- valid server session token; the client cannot choose another student ID.
CREATE OR REPLACE FUNCTION private.student_restore_session_profile(
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
  SELECT jsonb_build_object(
    'success', TRUE,
    'student', jsonb_build_object(
      'id', student.id,
      'nim', student.nim,
      'name', student.name,
      'className', student.class_name,
      'email', student.email,
      'createdAt', student.created_at
    )
  )
  FROM private.student_sessions AS session
  JOIN public.students AS student ON student.id = session.student_id
  WHERE session.token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND session.revoked_at IS NULL
    AND session.expires_at > NOW()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.student_restore_session_profile(
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE SQL
SET search_path = public, private, pg_temp
AS $$
  SELECT COALESCE(
    private.student_restore_session_profile(p_session_token),
    jsonb_build_object('success', FALSE)
  );
$$;

REVOKE ALL ON FUNCTION private.student_restore_session_profile(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_restore_session_profile(TEXT)
  TO anon, authenticated;
REVOKE ALL ON FUNCTION public.student_restore_session_profile(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_restore_session_profile(TEXT)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
