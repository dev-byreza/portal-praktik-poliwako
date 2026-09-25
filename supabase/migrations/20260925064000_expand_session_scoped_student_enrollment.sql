-- Let a verified student session discover all of that student's published
-- course enrollments. The session token remains the only identity proof.
DROP FUNCTION IF EXISTS public.student_list_course_enrollments(TEXT);

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
  JOIN public.practice_periods AS period
    ON period.id = participant.period_id
  JOIN public.courses AS course
    ON course.id = period.course_id
  WHERE session.token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND session.revoked_at IS NULL
    AND session.expires_at > NOW()
    AND course.status = 'PUBLISHED';
$$;

REVOKE ALL ON FUNCTION public.student_list_course_enrollments(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_course_enrollments(TEXT)
  TO anon, authenticated;

-- A student may switch only to a period in which the token owner is enrolled.
-- The returned capability is newly scoped to that requested period.
CREATE OR REPLACE FUNCTION public.student_create_period_session(
  p_session_token TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student_id UUID;
  v_session_token TEXT;
BEGIN
  SELECT student_id INTO v_student_id
  FROM private.student_sessions
  WHERE token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND revoked_at IS NULL
    AND expires_at > NOW()
  LIMIT 1;

  IF v_student_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.practice_participants AS participant
    JOIN public.practice_periods AS period ON period.id = participant.period_id
    JOIN public.courses AS course ON course.id = period.course_id
    WHERE participant.student_id = v_student_id
      AND participant.period_id = p_period_id
      AND course.slug = p_course_slug
      AND course.status = 'PUBLISHED'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mata kuliah atau periode tidak terdaftar.');
  END IF;

  v_session_token := private.issue_student_session(v_student_id, p_period_id);
  RETURN jsonb_build_object('success', TRUE, 'sessionToken', v_session_token);
END;
$$;

REVOKE ALL ON FUNCTION public.student_create_period_session(TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_create_period_session(TEXT, TEXT, UUID)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
