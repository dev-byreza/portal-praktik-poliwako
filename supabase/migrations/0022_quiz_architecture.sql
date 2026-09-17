-- Quiz architecture: keep quiz attached to a learning material, but store
-- questions, options, and attempts as queryable records.
-- Legacy JSON in learning_materials.content_text remains readable during the
-- transition and can be migrated by the application on the next save.

ALTER TABLE public.learning_materials
  DROP CONSTRAINT IF EXISTS learning_materials_type_check;

ALTER TABLE public.learning_materials
  ADD CONSTRAINT learning_materials_type_check
  CHECK (type IN ('RICHTEXT', 'PDF', 'YOUTUBE', 'EXTERNAL_LINK', 'QUIZ'));

CREATE TABLE IF NOT EXISTS public.quiz_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL UNIQUE REFERENCES public.learning_materials(id) ON DELETE CASCADE,
  description TEXT,
  shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  pass_score NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (pass_score >= 0 AND pass_score <= 100),
  max_attempts INTEGER NOT NULL DEFAULT 0 CHECK (max_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quiz_definitions(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT,
  explanation TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  correct_option_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quiz_id, position)
);

CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, position)
);

ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_correct_option_fk;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_correct_option_fk
  FOREIGN KEY (correct_option_id) REFERENCES public.quiz_options(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quiz_definitions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quiz_id, student_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.quiz_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON public.quiz_options(question_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id, period_id, submitted_at DESC);

-- One-time migration for quizzes created before the normalized tables
-- existed. Keeping the old content_text value makes rollback and older
-- clients safe while the new API starts reading quiz_definitions first.
DO $$
DECLARE
  v_material RECORD;
  v_payload JSONB;
  v_quiz_id UUID;
  v_question JSONB;
  v_option JSONB;
  v_question_id UUID;
  v_option_id UUID;
  v_correct_old_id TEXT;
  v_question_position INTEGER;
  v_option_position INTEGER;
BEGIN
  FOR v_material IN
    SELECT id, content_text
    FROM public.learning_materials
    WHERE type = 'QUIZ' AND content_text LIKE '\_\_POLIWAKO\_QUIZ\_V1\_\_%' ESCAPE '\'
  LOOP
    v_payload := substring(v_material.content_text FROM length('__POLIWAKO_QUIZ_V1__') + 1)::JSONB;
    SELECT id INTO v_quiz_id FROM public.quiz_definitions WHERE material_id = v_material.id;
    IF v_quiz_id IS NOT NULL THEN CONTINUE; END IF;

    INSERT INTO public.quiz_definitions(material_id, description, shuffle_questions, pass_score, max_attempts)
    VALUES (
      v_material.id,
      NULLIF(v_payload->>'description', ''),
      COALESCE((v_payload->>'shuffleQuestions')::BOOLEAN, FALSE),
      COALESCE(NULLIF(v_payload->>'passScore', '')::NUMERIC, 70),
      COALESCE(NULLIF(v_payload->>'maxAttempts', '')::INTEGER, 0)
    ) RETURNING id INTO v_quiz_id;

    v_question_position := 0;
    FOR v_question IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload->'questions', '[]'::JSONB)) LOOP
      v_question_id := gen_random_uuid();
      v_correct_old_id := v_question->>'correctOptionId';
      INSERT INTO public.quiz_questions(id, quiz_id, prompt, image_url, explanation, position)
      VALUES (v_question_id, v_quiz_id, COALESCE(v_question->>'prompt', ''), v_question->>'imageUrl', v_question->>'explanation', v_question_position);

      v_option_position := 0;
      FOR v_option IN SELECT value FROM jsonb_array_elements(COALESCE(v_question->'options', '[]'::JSONB)) LOOP
        v_option_id := gen_random_uuid();
        INSERT INTO public.quiz_options(id, question_id, option_text, position)
        VALUES (v_option_id, v_question_id, COALESCE(v_option->>'text', ''), v_option_position);
        IF v_option->>'id' = v_correct_old_id THEN
          UPDATE public.quiz_questions SET correct_option_id = v_option_id WHERE id = v_question_id;
        END IF;
        v_option_position := v_option_position + 1;
      END LOOP;
      v_question_position := v_question_position + 1;
    END LOOP;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- A malformed legacy quiz must not prevent the rest of the migration from
  -- applying; the application will continue to read it through its fallback.
  RAISE WARNING 'Legacy quiz migration skipped: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS set_quiz_definitions_updated_at ON public.quiz_definitions;
CREATE TRIGGER set_quiz_definitions_updated_at
BEFORE UPDATE ON public.quiz_definitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.quiz_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Public students may read quiz content only from published courses. The
-- correct answer column is intentionally not granted to anon below.
DROP POLICY IF EXISTS "Student view published quiz definitions" ON public.quiz_definitions;
CREATE POLICY "Student view published quiz definitions"
  ON public.quiz_definitions FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.learning_materials lm
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE lm.id = quiz_definitions.material_id AND c.status = 'PUBLISHED'
  ));

DROP POLICY IF EXISTS "Instructors manage own quiz definitions" ON public.quiz_definitions;
CREATE POLICY "Instructors manage own quiz definitions"
  ON public.quiz_definitions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.learning_materials lm
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE lm.id = quiz_definitions.material_id AND c.instructor_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.learning_materials lm
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE lm.id = quiz_definitions.material_id AND c.instructor_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Student view published quiz questions" ON public.quiz_questions;
CREATE POLICY "Student view published quiz questions"
  ON public.quiz_questions FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_questions.quiz_id AND c.status = 'PUBLISHED'
  ));

DROP POLICY IF EXISTS "Instructors manage own quiz questions" ON public.quiz_questions;
CREATE POLICY "Instructors manage own quiz questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_questions.quiz_id AND c.instructor_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_questions.quiz_id AND c.instructor_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Student view published quiz options" ON public.quiz_options;
CREATE POLICY "Student view published quiz options"
  ON public.quiz_options FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    JOIN public.quiz_definitions qd ON qd.id = qq.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qq.id = quiz_options.question_id AND c.status = 'PUBLISHED'
  ));

DROP POLICY IF EXISTS "Instructors manage own quiz options" ON public.quiz_options;
CREATE POLICY "Instructors manage own quiz options"
  ON public.quiz_options FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    JOIN public.quiz_definitions qd ON qd.id = qq.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qq.id = quiz_options.question_id AND c.instructor_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    JOIN public.quiz_definitions qd ON qd.id = qq.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qq.id = quiz_options.question_id AND c.instructor_id = (select auth.uid())
  ));

-- Attempt rows are instructor-readable. Students submit through the RPC below
-- so the answer key never needs to be exposed to the browser.
DROP POLICY IF EXISTS "Instructors view quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Instructors view quiz attempts"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_attempts.quiz_id AND c.instructor_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Instructors view quiz answers" ON public.quiz_answers;
CREATE POLICY "Instructors view quiz answers"
  ON public.quiz_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_attempts qa
    JOIN public.quiz_definitions qd ON qd.id = qa.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qa.id = quiz_answers.attempt_id AND c.instructor_id = (select auth.uid())
  ));

-- Limit anonymous question reads to the safe columns. Authenticated
-- instructors retain full access through RLS and the table grants.
REVOKE SELECT ON public.quiz_questions FROM anon;
GRANT SELECT (id, quiz_id, prompt, image_url, explanation, position) ON public.quiz_questions TO anon;
GRANT SELECT ON public.quiz_definitions, public.quiz_options TO anon;

CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = true)
AS
SELECT id, quiz_id, prompt, image_url, explanation, position
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_public TO anon, authenticated;

-- Per-student session tokens allow the existing NIM/password flow to submit a
-- quiz without trusting a student_id sent by the browser.
CREATE TABLE IF NOT EXISTS private.student_sessions (
  token_hash TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

REVOKE ALL ON TABLE private.student_sessions FROM PUBLIC;
REVOKE ALL ON TABLE private.student_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.issue_student_session(p_student_id UUID, p_period_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_token TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
  INSERT INTO private.student_sessions(token_hash, student_id, period_id)
  VALUES (encode(digest(v_token, 'sha256'), 'hex'), p_student_id, p_period_id);
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION private.issue_student_session(UUID, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.student_submit_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_session private.student_sessions%ROWTYPE;
  v_quiz public.quiz_definitions%ROWTYPE;
  v_attempt_id UUID;
  v_attempt_number INTEGER;
  v_total INTEGER;
  v_correct INTEGER := 0;
  v_answer JSONB;
  v_question public.quiz_questions%ROWTYPE;
  v_selected UUID;
  v_is_correct BOOLEAN;
BEGIN
  SELECT * INTO v_session
  FROM private.student_sessions
  WHERE token_hash = encode(digest(trim(coalesce(p_session_token, '')), 'sha256'), 'hex')
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND period_id = p_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi mahasiswa tidak valid atau telah berakhir.';
  END IF;

  SELECT qd.* INTO v_quiz
  FROM public.quiz_definitions qd
  JOIN public.learning_materials lm ON lm.id = qd.material_id
  JOIN public.learning_units lu ON lu.id = lm.unit_id
  WHERE qd.material_id = p_material_id AND lu.period_id = p_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz tidak ditemukan pada periode mahasiswa.';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id;
  IF v_total = 0 THEN RAISE EXCEPTION 'Quiz belum memiliki pertanyaan.'; END IF;

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
  FROM public.quiz_attempts
  WHERE quiz_id = v_quiz.id AND student_id = v_session.student_id;
  IF v_quiz.max_attempts > 0 AND v_attempt_number > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Batas percobaan quiz telah tercapai.';
  END IF;

  INSERT INTO public.quiz_attempts(quiz_id, student_id, period_id, attempt_number, score, correct_count, total_questions)
  VALUES (v_quiz.id, v_session.student_id, p_period_id, v_attempt_number, 0, 0, v_total)
  RETURNING id INTO v_attempt_id;

  FOR v_answer IN SELECT value FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) LOOP
    SELECT * INTO v_question FROM public.quiz_questions
    WHERE id = NULLIF(v_answer->>'questionId', '')::UUID AND quiz_id = v_quiz.id;
    IF FOUND THEN
      v_selected := NULLIF(v_answer->>'optionId', '')::UUID;
      v_is_correct := v_selected IS NOT NULL AND v_selected = v_question.correct_option_id;
      IF v_is_correct THEN v_correct := v_correct + 1; END IF;
      INSERT INTO public.quiz_answers(attempt_id, question_id, selected_option_id, is_correct)
      VALUES (v_attempt_id, v_question.id, v_selected, v_is_correct);
    END IF;
  END LOOP;

  UPDATE public.quiz_attempts
  SET correct_count = v_correct, score = ROUND((v_correct::NUMERIC / v_total::NUMERIC) * 100, 2)
  WHERE id = v_attempt_id;

  RETURN jsonb_build_object(
    'attemptId', v_attempt_id,
    'score', ROUND((v_correct::NUMERIC / v_total::NUMERIC) * 100, 2),
    'correct', v_correct,
    'total', v_total,
    'passed', ROUND((v_correct::NUMERIC / v_total::NUMERIC) * 100, 2) >= v_quiz.pass_score,
    'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'questionId', qq.id,
      'correctOptionId', qq.correct_option_id,
      'isCorrect', qa.is_correct
    )) FROM public.quiz_answers qa JOIN public.quiz_questions qq ON qq.id = qa.question_id WHERE qa.attempt_id = v_attempt_id), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION private.student_submit_quiz_attempt(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.student_submit_quiz_attempt(TEXT, UUID, UUID, JSONB) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_submit_quiz_attempt(p_session_token, p_material_id, p_period_id, p_answers);
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(TEXT, UUID, UUID, JSONB) TO anon, authenticated;

-- Extend the existing custom student login functions with an opaque session
-- token. The public wrappers created in migration 0010 continue to work.
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
  v_session_token TEXT;
BEGIN
  IF length(trim(coalesce(p_password, ''))) < 4 OR length(p_password) > 200 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password harus 4 sampai 200 karakter.');
  END IF;

  SELECT * INTO v_student FROM public.students
  WHERE id = p_student_id AND lower(trim(nim)) = lower(trim(p_nim));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Data mahasiswa tidak ditemukan.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id AND c.slug = p_course_slug AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF coalesce(v_student.password_hash, '') <> '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password akun ini sudah pernah dibuat. Silakan gunakan login password.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = now()
  WHERE id = v_student.id;
  v_session_token := private.issue_student_session(v_student.id, v_period_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Password berhasil disimpan.',
    'periodId', v_period_id,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id, 'nim', v_student.nim, 'name', v_student.name,
      'className', v_student.class_name, 'email', v_student.email, 'createdAt', v_student.created_at
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
  v_session_token TEXT;
BEGIN
  SELECT * INTO v_student FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim)) LIMIT 1;
  IF NOT FOUND OR coalesce(v_student.password_hash, '') = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Akun belum memiliki password. Silakan buat password terlebih dahulu.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id AND c.slug = p_course_slug AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF v_student.password_hash <> trim(p_password)
     AND crypt(trim(p_password), v_student.password_hash) <> v_student.password_hash THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password salah. Periksa kembali password Anda.');
  END IF;

  v_session_token := private.issue_student_session(v_student.id, v_period_id);
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Login berhasil.',
    'periodId', v_period_id,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id, 'nim', v_student.nim, 'name', v_student.name,
      'className', v_student.class_name, 'email', v_student.email, 'createdAt', v_student.created_at
    )
  );
END;
$$;
