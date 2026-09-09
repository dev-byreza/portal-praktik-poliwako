-- Assignments can explicitly accept any file format. The 25 MB bucket limit
-- remains in force while MIME and extension filtering are delegated to the
-- assignment configuration in the application.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'submissions';

DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;

CREATE POLICY "Students upload submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'submissions');
