-- Scope student-private data and Storage objects to the opaque session issued
-- by private.student_auth_login / private.student_auth_set_password.
-- Instructor RLS remains tied to auth.uid() and course ownership.

CREATE OR REPLACE FUNCTION private.current_student_id(p_period_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_token TEXT;
  v_student_id UUID;
BEGIN
  v_token := NULLIF(
    BTRIM(COALESCE(
      current_setting('request.headers', TRUE)::JSONB ->> 'x-poliwako-student-session',
      ''
    )),
    ''
  );
  IF v_token IS NULL THEN RETURN NULL; END IF;

  SELECT student_id INTO v_student_id
  FROM private.student_sessions
  WHERE token_hash = encode(digest(v_token, 'sha256'), 'hex')
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND (p_period_id IS NULL OR period_id = p_period_id)
  LIMIT 1;

  RETURN v_student_id;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.current_student_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_student_id(UUID) TO anon, authenticated;

-- Remove broad enrollment access, then make the minimal enrollment view obey
-- practice_participants RLS instead of running with its owner's privileges.
DROP POLICY IF EXISTS "Public view participants" ON public.practice_participants;
DROP POLICY IF EXISTS "Student view participants" ON public.practice_participants;
DROP POLICY IF EXISTS "Students update own confirmation" ON public.practice_participants;
CREATE POLICY "Student view own participant row"
  ON public.practice_participants FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));
CREATE POLICY "Student update own final project confirmation"
  ON public.practice_participants FOR UPDATE TO anon
  USING (student_id = private.current_student_id(period_id))
  WITH CHECK (student_id = private.current_student_id(period_id));

ALTER VIEW public.student_course_enrollments SET (security_invoker = TRUE);

-- Students may see only their own unit progress. No student-side write is
-- needed by the live API; completion remains authoritative to the server.
DROP POLICY IF EXISTS "Students manage own unit progress" ON public.unit_progress;
DROP POLICY IF EXISTS "Student view own unit progress" ON public.unit_progress;
CREATE POLICY "Student view own unit progress"
  ON public.unit_progress FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));

-- Submissions: scope reads, initial uploads, and revisions by authenticated
-- session. Keep instructor operations under the existing course-owner policy.
DROP POLICY IF EXISTS "Students insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students update submissions before deadline" ON public.submissions;
DROP POLICY IF EXISTS "Students update submissions before deadline or for revision" ON public.submissions;
CREATE POLICY "Student view own submissions"
  ON public.submissions FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));
CREATE POLICY "Student insert own submissions"
  ON public.submissions FOR INSERT TO anon
  WITH CHECK (
    student_id = private.current_student_id(period_id)
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND a.period_id = submissions.period_id
        AND a.deadline > NOW()
    )
  );
CREATE POLICY "Student update own submissions"
  ON public.submissions FOR UPDATE TO anon
  USING (
    student_id = private.current_student_id(period_id)
    AND (
      status = 'REVISION_REQUIRED'
      OR EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id = submissions.assignment_id
          AND a.period_id = submissions.period_id
          AND a.deadline > NOW()
      )
    )
  )
  WITH CHECK (
    student_id = private.current_student_id(period_id)
    AND status = 'SUBMITTED'
    AND review_feedback IS NULL
    AND reviewed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND a.period_id = submissions.period_id
    )
  );

-- Keep server-side review fields and submission identity protected even when
-- an anonymous caller knows another student's row ID.
CREATE OR REPLACE FUNCTION public.protect_submission_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_course_id UUID;
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT p.course_id, a.deadline
  INTO v_course_id, v_deadline
  FROM public.practice_periods p
  JOIN public.assignments a
    ON a.period_id = p.id AND a.id = NEW.assignment_id
  WHERE p.id = NEW.period_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Assignment dan periode submission tidak cocok.';
  END IF;

  IF auth.uid() IS NOT NULL AND public.is_course_owner(v_course_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.student_id IS DISTINCT FROM private.current_student_id(NEW.period_id) THEN
    RAISE EXCEPTION 'Sesi tidak berhak mengirim submission mahasiswa ini.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'SUBMITTED'
      OR NEW.review_feedback IS NOT NULL
      OR NEW.reviewed_at IS NOT NULL
      OR NEW.revision_number <> 1
      OR v_deadline <= NOW() THEN
      RAISE EXCEPTION 'Submission tidak valid atau tenggat telah berakhir.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
    OR NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.period_id IS DISTINCT FROM OLD.period_id THEN
    RAISE EXCEPTION 'Identitas submission tidak dapat diubah.';
  END IF;
  IF v_deadline <= NOW() AND OLD.status <> 'REVISION_REQUIRED' THEN
    RAISE EXCEPTION 'Tenggat pengumpulan sudah berakhir.';
  END IF;
  IF NEW.status <> 'SUBMITTED'
    OR NEW.review_feedback IS NOT NULL
    OR NEW.reviewed_at IS NOT NULL
    OR NEW.revision_number <> OLD.revision_number + 1 THEN
    RAISE EXCEPTION 'Unggah ulang harus mereset pemeriksaan dan menaikkan nomor revisi.';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_submission_review_fields() FROM PUBLIC, anon, authenticated;

-- Assessment and attendance are private student records; publish state alone
-- is not sufficient authorization to read somebody else's grade.
DROP POLICY IF EXISTS "Students view attendance" ON public.attendance_records;
CREATE POLICY "Student view own attendance"
  ON public.attendance_records FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));

DROP POLICY IF EXISTS "Students view published assessment" ON public.assessments;
CREATE POLICY "Student view own published assessment"
  ON public.assessments FOR SELECT TO anon
  USING (
    is_published = TRUE
    AND student_id = private.current_student_id(period_id)
  );

-- Students can read and submit only their own remedial work. They cannot
-- create remedials, delete them, or set the instructor's pass/review status.
DROP POLICY IF EXISTS "Students view and submit remedial" ON public.remedial_assignments;
CREATE POLICY "Student view own remedials"
  ON public.remedial_assignments FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));
CREATE POLICY "Student update own remedial submission"
  ON public.remedial_assignments FOR UPDATE TO anon
  USING (
    student_id = private.current_student_id(period_id)
    AND status IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
    AND deadline > NOW()
  )
  WITH CHECK (
    student_id = private.current_student_id(period_id)
    AND status = 'SUBMITTED'
  );

CREATE OR REPLACE FUNCTION public.protect_student_owned_row_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

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
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.period_id IS DISTINCT FROM OLD.period_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.deadline IS DISTINCT FROM OLD.deadline
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.status <> 'SUBMITTED'
      OR OLD.status NOT IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
      OR NEW.submission_file_name IS NULL
      OR NEW.submission_file_url IS NULL
      OR NEW.submitted_at IS NULL THEN
      RAISE EXCEPTION 'Mahasiswa hanya dapat mengirim berkas untuk remedial miliknya.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Tabel ini tidak mendukung perubahan oleh mahasiswa.';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_student_owned_row_updates() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_student_participant_fields ON public.practice_participants;
CREATE TRIGGER protect_student_participant_fields
  BEFORE UPDATE ON public.practice_participants
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_owned_row_updates();

DROP TRIGGER IF EXISTS protect_student_remedial_fields ON public.remedial_assignments;
CREATE TRIGGER protect_student_remedial_fields
  BEFORE UPDATE ON public.remedial_assignments
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_owned_row_updates();

-- Storage paths are <course>/<period>/<student>/<type>/<item>/<filename>.
-- Check the row owner and live deadline before allowing the browser to touch
-- private submission objects.
DROP POLICY IF EXISTS "Instructors full access to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students download own submission via signed URL" ON storage.objects;
DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students replace submission files before deadline" ON storage.objects;
DROP POLICY IF EXISTS "Students replace submission files before deadline or for revision" ON storage.objects;

CREATE POLICY "Instructors manage course submission files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.remedial_assignments r
        JOIN public.practice_periods p ON p.id = r.period_id
        WHERE r.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.remedial_assignments r
        JOIN public.practice_periods p ON p.id = r.period_id
        WHERE r.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
    )
  );

CREATE POLICY "Students read own submission files"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.storage_path = objects.name
        AND s.student_id = private.current_student_id(s.period_id)
    )
    OR bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.remedial_assignments r
      WHERE r.submission_storage_path = objects.name
        AND r.student_id = private.current_student_id(r.period_id)
    )
  );

CREATE POLICY "Students upload own assignment files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.learning_units u ON u.id = a.unit_id
      JOIN public.practice_periods p ON p.id = u.period_id
      WHERE a.id::TEXT = split_part(name, '/', 5)
        AND u.period_id::TEXT = split_part(name, '/', 2)
        AND p.course_id::TEXT = split_part(name, '/', 1)
        AND a.deadline > NOW()
    )
  );

CREATE POLICY "Students upload own remedial files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 4) = 'remedial'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.remedial_assignments r
      JOIN public.practice_periods p ON p.id = r.period_id
      WHERE r.id::TEXT = split_part(name, '/', 5)
        AND r.period_id::TEXT = split_part(name, '/', 2)
        AND p.course_id::TEXT = split_part(name, '/', 1)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.status IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
        AND r.deadline > NOW()
    )
  );

CREATE POLICY "Students replace own submission files"
  ON storage.objects FOR UPDATE TO anon
  USING (
    bucket_id = 'submissions'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND u.period_id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND a.deadline > NOW()
      )
      OR EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.storage_path = objects.name
          AND s.student_id = private.current_student_id(s.period_id)
          AND s.status = 'REVISION_REQUIRED'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND u.period_id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND a.deadline > NOW()
      )
      OR EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.storage_path = objects.name
          AND s.student_id = private.current_student_id(s.period_id)
          AND s.status = 'REVISION_REQUIRED'
      )
    )
  );

NOTIFY pgrst, 'reload schema';
