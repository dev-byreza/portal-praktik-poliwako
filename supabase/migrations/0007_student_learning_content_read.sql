-- Restore the read path used by the NIM-based student portal.
--
-- Students sign in with their NIM in the application and therefore do not
-- have a Supabase auth.uid(). Migration 0001 correctly restricted write
-- operations to course owners, but it also removed the public SELECT policies
-- that the student portal needs. Without these policies a task can appear
-- optimistically in the instructor screen, then disappear after refresh.
-- The UI still filters courses by the student's enrollment map; these policies
-- only make the published learning content readable through the Data API.

DROP POLICY IF EXISTS "Student view published courses" ON public.courses;
CREATE POLICY "Student view published courses"
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "Student view periods" ON public.practice_periods;
CREATE POLICY "Student view periods"
  ON public.practice_periods FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Student view participants" ON public.practice_participants;
CREATE POLICY "Student view participants"
  ON public.practice_participants FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Student view learning units" ON public.learning_units;
CREATE POLICY "Student view learning units"
  ON public.learning_units FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Student view learning materials" ON public.learning_materials;
CREATE POLICY "Student view learning materials"
  ON public.learning_materials FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Student view assignments" ON public.assignments;
CREATE POLICY "Student view assignments"
  ON public.assignments FOR SELECT
  TO anon, authenticated
  USING (TRUE);
