-- Read the student's enrollment from the primary database using the
-- server-issued, period-scoped bearer session. No client-supplied student ID
-- participates in the authorization decision.
CREATE OR REPLACE FUNCTION public.student_list_course_enrollments(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  period_id UUID,
  student_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
  SELECT participant.id, participant.period_id, participant.student_id
  FROM private.student_sessions AS session
  JOIN public.practice_participants AS participant
    ON participant.student_id = session.student_id
    AND participant.period_id = session.period_id
  WHERE session.token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND session.revoked_at IS NULL
    AND session.expires_at > NOW();
$$;

REVOKE ALL ON FUNCTION public.student_list_course_enrollments(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_course_enrollments(TEXT)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
