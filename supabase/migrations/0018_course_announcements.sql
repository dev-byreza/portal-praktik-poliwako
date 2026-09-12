-- Course and period announcements shown on the student dashboard.
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.practice_periods(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL CHECK (char_length(trim(title)) > 0),
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  priority VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (priority IN ('INFO', 'IMPORTANT', 'URGENT')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT announcements_expiry_after_publish CHECK (expires_at IS NULL OR expires_at > published_at)
);

CREATE INDEX IF NOT EXISTS idx_announcements_course_published
  ON public.announcements (course_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_period
  ON public.announcements (period_id)
  WHERE period_id IS NOT NULL;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active announcements" ON public.announcements;
CREATE POLICY "Public read active announcements"
ON public.announcements
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Instructors manage own announcements" ON public.announcements;
CREATE POLICY "Instructors manage own announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.courses course
    WHERE course.id = announcements.course_id
      AND course.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.courses course
    WHERE course.id = announcements.course_id
      AND course.instructor_id = auth.uid()
  )
  AND (
    announcements.period_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.practice_periods period
      WHERE period.id = announcements.period_id
        AND period.course_id = announcements.course_id
    )
  )
);
