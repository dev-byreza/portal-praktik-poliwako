-- Remove legacy demo PDF references. Run once in Supabase SQL Editor.
DELETE FROM public.learning_materials
WHERE lower(coalesce(content_url, '')) LIKE '%w3.org/wai/er/tests/xhtml/testfiles/resources/pdf/dummy.pdf%';

UPDATE public.assessments
SET post_test_file_url = NULL
WHERE lower(coalesce(post_test_file_url, '')) LIKE '%posttest_komprehensif.pdf%'
  AND post_test_file_url NOT LIKE 'http%';

UPDATE public.remedial_assignments
SET submission_file_name = NULL,
    submission_file_url = NULL,
    submitted_at = NULL,
    status = 'PENDING_SUBMISSION'
WHERE lower(coalesce(submission_file_url, '')) LIKE '%w3.org/wai/er/tests/xhtml/testfiles/resources/pdf/dummy.pdf%';
