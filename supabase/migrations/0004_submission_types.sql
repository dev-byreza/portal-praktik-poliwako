-- Distinguish module tasks, reports, post-tests, and remedial submissions.
-- Run this migration once in Supabase SQL Editor before deploying the UI.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'ASSIGNMENT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assignments_submission_type_check'
      AND conrelid = 'public.assignments'::regclass
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_submission_type_check
      CHECK (submission_type IN ('ASSIGNMENT', 'REPORT', 'POST_TEST'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignments_submission_type
  ON public.assignments (submission_type);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'ASSIGNMENT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'submissions_submission_type_check'
      AND conrelid = 'public.submissions'::regclass
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT submissions_submission_type_check
      CHECK (submission_type IN ('ASSIGNMENT', 'REPORT', 'POST_TEST', 'REMEDIAL'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_submissions_submission_type
  ON public.submissions (submission_type);
