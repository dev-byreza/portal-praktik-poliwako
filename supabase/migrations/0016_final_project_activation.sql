-- Let instructors control when the final-file submission opens for a period.
ALTER TABLE public.practice_periods
  ADD COLUMN IF NOT EXISTS final_project_enabled boolean NOT NULL DEFAULT false;

-- Preserve currently published Drive folders when the flag is introduced.
UPDATE public.practice_periods
SET final_project_enabled = true
WHERE final_project_drive_url IS NOT NULL
  AND btrim(final_project_drive_url) <> '';

NOTIFY pgrst, 'reload schema';
