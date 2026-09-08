-- Countdown gate for LMS materials and assignments.
-- Existing rows remain available immediately by default.
ALTER TABLE public.learning_materials
  ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS countdown_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countdown_started_at TIMESTAMPTZ;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS countdown_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countdown_started_at TIMESTAMPTZ;

ALTER TABLE public.learning_materials
  ADD CONSTRAINT learning_materials_countdown_minutes_check
  CHECK (countdown_minutes >= 0);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_countdown_minutes_check
  CHECK (countdown_minutes >= 0);
