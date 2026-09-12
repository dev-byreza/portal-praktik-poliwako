-- End-to-end assignment review workflow.
-- Instructors can accept a file or request a revision. Students may replace a
-- file after the normal deadline only when that exact submission needs revision.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS review_feedback TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 1;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.submissions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.submissions DROP CONSTRAINT %I', constraint_name);
  END IF;
END
$$;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('SUBMITTED', 'REVISION_REQUIRED', 'ACCEPTED', 'GRADED'));

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_revision_number_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_revision_number_check
  CHECK (revision_number >= 1);

-- Prevent browser clients from changing instructor-only review fields. A
-- student replacement must return the row to SUBMITTED and increment its
-- revision number exactly once.
CREATE OR REPLACE FUNCTION public.protect_submission_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_course_id UUID;
  deadline_is_open BOOLEAN;
BEGIN
  SELECT p.course_id, a.deadline > NOW()
  INTO submission_course_id, deadline_is_open
  FROM public.practice_periods p
  JOIN public.assignments a
    ON a.period_id = p.id
   AND a.id = NEW.assignment_id
  WHERE p.id = NEW.period_id;

  IF submission_course_id IS NULL THEN
    RAISE EXCEPTION 'Assignment dan periode submission tidak cocok.';
  END IF;

  IF auth.uid() IS NOT NULL AND public.is_course_owner(submission_course_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'SUBMITTED'
      OR NEW.review_feedback IS NOT NULL
      OR NEW.reviewed_at IS NOT NULL
      OR NEW.revision_number <> 1 THEN
      RAISE EXCEPTION 'Status pemeriksaan hanya dapat diubah oleh instruktur.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.assignment_id <> OLD.assignment_id
    OR NEW.student_id <> OLD.student_id
    OR NEW.period_id <> OLD.period_id THEN
    RAISE EXCEPTION 'Identitas submission tidak dapat diubah.';
  END IF;

  IF NOT deadline_is_open AND OLD.status <> 'REVISION_REQUIRED' THEN
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

DROP TRIGGER IF EXISTS protect_submission_review_fields_trigger ON public.submissions;
CREATE TRIGGER protect_submission_review_fields_trigger
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_submission_review_fields();

DROP POLICY IF EXISTS "Instructors manage submissions" ON public.submissions;
CREATE POLICY "Instructors manage submissions"
ON public.submissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    WHERE p.id = public.submissions.period_id
      AND public.is_course_owner(p.course_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    JOIN public.assignments a
      ON a.period_id = p.id
     AND a.id = public.submissions.assignment_id
    WHERE p.id = public.submissions.period_id
      AND public.is_course_owner(p.course_id)
  )
);

DROP POLICY IF EXISTS "Students update submissions before deadline" ON public.submissions;
DROP POLICY IF EXISTS "Students update submissions before deadline or for revision" ON public.submissions;
CREATE POLICY "Students update submissions before deadline or for revision"
ON public.submissions FOR UPDATE
TO anon, authenticated
USING (
  status = 'REVISION_REQUIRED'
  OR EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
)
WITH CHECK (
  status = 'SUBMITTED'
  AND review_feedback IS NULL
  AND reviewed_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
  )
);

DROP POLICY IF EXISTS "Students replace submission files before deadline" ON storage.objects;
DROP POLICY IF EXISTS "Students replace submission files before deadline or for revision" ON storage.objects;
CREATE POLICY "Students replace submission files before deadline or for revision"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'submissions'
  AND (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = (split_part(name, '/', 5))::uuid
        AND a.deadline > NOW()
    )
    OR EXISTS (
      SELECT 1
      FROM public.submissions s
      WHERE s.storage_path = name
        AND s.status = 'REVISION_REQUIRED'
    )
  )
)
WITH CHECK (
  bucket_id = 'submissions'
  AND (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = (split_part(name, '/', 5))::uuid
        AND a.deadline > NOW()
    )
    OR EXISTS (
      SELECT 1
      FROM public.submissions s
      WHERE s.storage_path = name
        AND s.status = 'REVISION_REQUIRED'
    )
  )
);
