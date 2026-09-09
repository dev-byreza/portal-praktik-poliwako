-- Reject late submissions at the database and Storage policy layers.
-- A changed deadline is honored automatically because the policies read the
-- current assignment row at the moment of the upload.

DROP POLICY IF EXISTS "Students insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Instructors manage submissions" ON public.submissions;

CREATE POLICY "Instructors manage submissions"
ON public.submissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    WHERE p.id = public.submissions.period_id
      AND is_course_owner(p.course_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    JOIN public.assignments a ON a.period_id = p.id
    WHERE p.id = public.submissions.period_id
      AND a.id = public.submissions.assignment_id
      AND is_course_owner(p.course_id)
      AND a.deadline > NOW()
  )
);

CREATE POLICY "Students insert submissions"
ON public.submissions FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
);

DROP POLICY IF EXISTS "Students upload PDF to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload files to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;
DROP POLICY IF EXISTS "Instructors full access to submissions" ON storage.objects;

CREATE POLICY "Instructors full access to submissions"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'submissions')
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);

CREATE POLICY "Students upload submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);
