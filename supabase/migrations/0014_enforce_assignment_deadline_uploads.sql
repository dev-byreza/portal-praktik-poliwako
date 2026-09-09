-- Reject late submissions at the database and Storage policy layers.
-- A changed deadline is honored automatically because the policies read the
-- current assignment row at the moment of the upload.

DROP POLICY IF EXISTS "Students insert submissions" ON public.submissions;

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
