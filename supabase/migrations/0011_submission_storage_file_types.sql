-- Keep the submissions bucket aligned with the formats configured on an assignment.
-- Uploads are still restricted by the assignment-specific client validation;
-- this policy only prevents Storage from rejecting valid configured formats.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/zip',
  'application/vnd.rar'
]::text[]
WHERE id = 'submissions';

DROP POLICY IF EXISTS "Students upload PDF to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;

CREATE POLICY "Students upload submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND lower(storage.extension(name)) IN ('pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'zip', 'rar')
);
