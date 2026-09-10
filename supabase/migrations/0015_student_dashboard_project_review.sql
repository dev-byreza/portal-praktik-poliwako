-- Additive migration; no existing records or permissions are removed.
ALTER TABLE public.practice_participants
  ADD COLUMN IF NOT EXISTS final_project_url text,
  ADD COLUMN IF NOT EXISTS final_project_review_status text CHECK (final_project_review_status IN ('SUBMITTED', 'REVISION_REQUIRED', 'ACCEPTED')),
  ADD COLUMN IF NOT EXISTS final_project_feedback text;

ALTER TABLE public.remedial_assignments ADD COLUMN IF NOT EXISTS submission_storage_path text;
NOTIFY pgrst, 'reload schema';
