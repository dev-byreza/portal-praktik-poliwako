-- Allow students to replace an existing assignment file while its deadline is open.
-- The current assignment deadline is checked for both the database row and the
-- Storage object so a late replacement is rejected at either layer.

DROP POLICY IF EXISTS "Students update submissions before deadline" ON public.submissions;

CREATE POLICY "Students update submissions before deadline"
ON public.submissions FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
);

DROP POLICY IF EXISTS "Students replace submission files before deadline" ON storage.objects;

CREATE POLICY "Students replace submission files before deadline"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
)
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);
