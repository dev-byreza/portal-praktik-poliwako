-- Allow instructors to describe the final project alongside its Drive folder.
ALTER TABLE public.practice_periods
  ADD COLUMN IF NOT EXISTS final_project_description TEXT;
