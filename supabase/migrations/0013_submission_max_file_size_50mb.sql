-- Raise the student submissions bucket limit to 50 MB and allow every file type.
-- The assignment's allowedFileType setting still controls the format shown and
-- accepted by the student form when an instructor selects a specific format.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = NULL
WHERE id = 'submissions';
