-- Unit-wide countdown gate. A single timer controls all materials and tasks in a unit.
ALTER TABLE public.learning_units
  ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS countdown_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countdown_started_at TIMESTAMPTZ;

ALTER TABLE public.learning_units
  DROP CONSTRAINT IF EXISTS learning_units_countdown_minutes_check;

ALTER TABLE public.learning_units
  ADD CONSTRAINT learning_units_countdown_minutes_check
  CHECK (countdown_minutes >= 0);
