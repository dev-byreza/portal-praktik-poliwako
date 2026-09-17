-- Add server-backed quiz result hydration for databases that already applied
-- migration 0022_quiz_architecture.sql.

CREATE OR REPLACE FUNCTION private.get_student_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_session private.student_sessions%ROWTYPE;
  v_quiz_id UUID;
  v_attempt public.quiz_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM private.student_sessions
  WHERE token_hash = encode(digest(trim(coalesce(p_session_token, '')), 'sha256'), 'hex')
    AND revoked_at IS NULL AND expires_at > NOW() AND period_id = p_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesi mahasiswa tidak valid atau telah berakhir.'; END IF;

  SELECT qd.id INTO v_quiz_id
  FROM public.quiz_definitions qd
  JOIN public.learning_materials lm ON lm.id = qd.material_id
  JOIN public.learning_units lu ON lu.id = lm.unit_id
  WHERE qd.material_id = p_material_id AND lu.period_id = p_period_id;
  IF v_quiz_id IS NULL THEN RAISE EXCEPTION 'Quiz tidak ditemukan pada periode mahasiswa.'; END IF;

  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE quiz_id = v_quiz_id AND student_id = v_session.student_id AND period_id = p_period_id
  ORDER BY submitted_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'attemptId', v_attempt.id,
    'score', v_attempt.score,
    'correct', v_attempt.correct_count,
    'total', v_attempt.total_questions,
    'submittedAt', v_attempt.submitted_at,
    'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'questionId', qq.id, 'correctOptionId', qq.correct_option_id, 'isCorrect', qa.is_correct
    )) FROM public.quiz_answers qa JOIN public.quiz_questions qq ON qq.id = qa.question_id WHERE qa.attempt_id = v_attempt.id), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION private.get_student_quiz_attempt(TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_student_quiz_attempt(TEXT, UUID, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_student_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.get_student_quiz_attempt(p_session_token, p_material_id, p_period_id);
$$;

REVOKE ALL ON FUNCTION public.get_student_quiz_attempt(TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_quiz_attempt(TEXT, UUID, UUID) TO anon, authenticated;
