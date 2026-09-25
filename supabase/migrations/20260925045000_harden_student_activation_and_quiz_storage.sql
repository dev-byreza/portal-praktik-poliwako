-- Replace NIM-only first-password setup with instructor-issued, single-use
-- activation codes. Resets revoke prior browser sessions immediately.
CREATE TABLE IF NOT EXISTS private.student_activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('ACTIVATION', 'PASSWORD_RESET')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  failed_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_activation_codes_student
  ON private.student_activation_codes(student_id, expires_at DESC);
ALTER TABLE private.student_activation_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct student activation code access" ON private.student_activation_codes;
CREATE POLICY "No direct student activation code access"
  ON private.student_activation_codes FOR ALL TO anon, authenticated
  USING (FALSE) WITH CHECK (FALSE);
REVOKE ALL ON TABLE private.student_activation_codes FROM PUBLIC, anon, authenticated;

-- A NIM lookup may report enrollment and password state, but never returns a
-- student's name, email, or database ID before the student proves possession
-- of a password or one-time activation code.
CREATE OR REPLACE FUNCTION private.student_auth_lookup(
  p_nim TEXT,
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
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', FALSE, 'isEnrolled', FALSE, 'hasCreatedPassword', FALSE);
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

  RETURN jsonb_build_object(
    'exists', TRUE,
    'isEnrolled', v_period_id IS NOT NULL,
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'hasCreatedPassword', coalesce(v_student.password_hash, '') <> ''
  );
END;
$$;

-- Drop the old RPC shape, which let any caller knowing student ID + NIM set a
-- first password without proving ownership of the account.
DROP FUNCTION IF EXISTS public.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS private.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION private.student_auth_issue_activation_code(
  p_student_id UUID,
  p_reset_existing_password BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_code TEXT := upper(encode(gen_random_bytes(12), 'hex'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesi instruktur diperlukan untuk menerbitkan kode aktivasi.';
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

  IF NOT p_reset_existing_password AND coalesce(v_student.password_hash, '') <> '' THEN
    RAISE EXCEPTION 'Akun sudah aktif. Gunakan alur reset password untuk membuat kode baru.';
  END IF;

  IF p_reset_existing_password THEN
    UPDATE public.students SET password_hash = NULL, updated_at = NOW() WHERE id = v_student.id;
    UPDATE private.student_sessions
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE student_id = v_student.id AND revoked_at IS NULL;
  END IF;

  UPDATE private.student_activation_codes
    SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;

  INSERT INTO private.student_activation_codes(
    student_id, token_hash, purpose, created_by, expires_at
  ) VALUES (
    v_student.id,
    encode(digest(v_code, 'sha256'), 'hex'),
    CASE WHEN p_reset_existing_password THEN 'PASSWORD_RESET' ELSE 'ACTIVATION' END,
    auth.uid(),
    NOW() + INTERVAL '24 hours'
  );

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_issue_activation_code(
  p_student_id UUID,
  p_reset_existing_password BOOLEAN
)
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_issue_activation_code(p_student_id, p_reset_existing_password);
$$;

CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_nim TEXT,
  p_password TEXT,
  p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_activation private.student_activation_codes%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_period_id UUID;
  v_course_slug TEXT;
  v_session_token TEXT;
BEGIN
  IF octet_length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password harus 8 sampai 72 byte.');
  END IF;
  IF length(trim(coalesce(p_activation_code, ''))) <> 24 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Kode aktivasi tidak valid atau kedaluwarsa.');
  END IF;

  SELECT * INTO v_activation
  FROM private.student_activation_codes
  WHERE token_hash = encode(digest(upper(trim(p_activation_code)), 'sha256'), 'hex')
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND failed_attempts < 5
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Kode aktivasi tidak valid atau kedaluwarsa.');
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = v_activation.student_id
  FOR UPDATE;
  IF NOT FOUND OR lower(trim(v_student.nim)) <> lower(trim(p_nim)) THEN
    UPDATE private.student_activation_codes
      SET failed_attempts = failed_attempts + 1,
          revoked_at = CASE WHEN failed_attempts >= 4 THEN NOW() ELSE revoked_at END
      WHERE id = v_activation.id;
    RETURN jsonb_build_object('success', FALSE, 'message', 'NIM atau kode aktivasi tidak cocok.');
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
  UPDATE private.student_activation_codes SET consumed_at = NOW() WHERE id = v_activation.id;
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
  p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_activation_code, p_course_slug, p_period_id);
$$;

REVOKE ALL ON FUNCTION private.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.student_auth_issue_activation_code(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_issue_activation_code(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

-- The remedial re-upload path is stable while a rejected file is replaced.
-- Restrict Storage UPDATE to that student's own remedial row and live deadline.
DROP POLICY IF EXISTS "Students replace own remedial files" ON storage.objects;
CREATE POLICY "Students replace own remedial files"
  ON storage.objects FOR UPDATE TO anon
  USING (
    bucket_id = 'submissions'
    AND split_part(name, '/', 4) = 'remedial'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1 FROM public.remedial_assignments r
      WHERE r.id::TEXT = split_part(name, '/', 5)
        AND r.period_id::TEXT = split_part(name, '/', 2)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.submission_storage_path = objects.name
        AND r.status = 'BELUM_LULUS'
        AND r.deadline > NOW()
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 4) = 'remedial'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1 FROM public.remedial_assignments r
      WHERE r.id::TEXT = split_part(name, '/', 5)
        AND r.period_id::TEXT = split_part(name, '/', 2)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.submission_storage_path = objects.name
        AND r.status = 'BELUM_LULUS'
        AND r.deadline > NOW()
    )
  );

-- Persist only a private Storage path as the remedial locator. Signed URLs are
-- generated after the row is saved, when the owner-scoped read policy applies.
CREATE OR REPLACE FUNCTION public.protect_student_owned_row_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_course_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'practice_participants' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.period_id IS DISTINCT FROM OLD.period_id
      OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at
      OR NEW.progress_status IS DISTINCT FROM (CASE
        WHEN OLD.progress_status IN ('ASSESSED', 'PUBLISHED') THEN OLD.progress_status
        ELSE 'PROJECT_SUBMITTED'
      END)
      OR NEW.final_project_feedback IS DISTINCT FROM OLD.final_project_feedback
      OR OLD.final_project_review_status = 'ACCEPTED'
      OR NEW.final_project_confirmed IS DISTINCT FROM TRUE
      OR NEW.final_project_review_status IS DISTINCT FROM 'SUBMITTED'
      OR NEW.final_project_url IS NULL
      OR NEW.final_project_url !~ '^https://drive[.]google[.]com/'
      OR NEW.final_project_submitted_at IS NULL THEN
      RAISE EXCEPTION 'Mahasiswa hanya dapat mengirim tautan proyek miliknya sendiri.';
    END IF;
  ELSIF TG_TABLE_NAME = 'remedial_assignments' THEN
    SELECT course_id INTO v_course_id FROM public.practice_periods WHERE id = NEW.period_id;
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.period_id IS DISTINCT FROM OLD.period_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.deadline IS DISTINCT FROM OLD.deadline
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.status <> 'SUBMITTED'
      OR OLD.status NOT IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
      OR NEW.submission_file_name IS NULL
      OR NEW.submitted_at IS NULL
      OR NEW.submission_storage_path IS NULL
      OR v_course_id IS NULL
      OR NEW.submission_storage_path NOT LIKE v_course_id::TEXT || '/' || NEW.period_id::TEXT || '/' || NEW.student_id::TEXT || '/remedial/' || NEW.id::TEXT || '/%'
      OR NEW.submission_file_url IS NULL THEN
      RAISE EXCEPTION 'Mahasiswa hanya dapat mengirim berkas remedial miliknya sendiri.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Tabel ini tidak mendukung perubahan oleh mahasiswa.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_student_owned_row_updates() FROM PUBLIC, anon, authenticated;

-- Scrub legacy public JSON copies of quizzes. The normalized tables retain the
-- answer keys; learning_materials.content_text remains safe for anon reads.
UPDATE public.learning_materials
SET content_text = NULL
WHERE type = 'QUIZ'
  AND left(coalesce(content_text, ''), length('__POLIWAKO_QUIZ_V1__')) = '__POLIWAKO_QUIZ_V1__';

NOTIFY pgrst, 'reload schema';
