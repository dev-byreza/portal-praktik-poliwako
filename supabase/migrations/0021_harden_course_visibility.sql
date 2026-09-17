-- Harden course visibility after the student read policies were introduced.
--
-- Instructor sessions use the authenticated role. The public student portal
-- uses the anonymous role, so a published-course policy must not also apply to
-- authenticated users: PostgreSQL combines permissive policies with OR.

DROP POLICY IF EXISTS "Public view published courses" ON public.courses;
DROP POLICY IF EXISTS "Student view published courses" ON public.courses;
CREATE POLICY "Student view published courses"
  ON public.courses FOR SELECT
  TO anon
  USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "Instructors manage own courses" ON public.courses;
CREATE POLICY "Instructors manage own courses"
  ON public.courses FOR ALL
  TO authenticated
  USING ((select auth.uid()) = instructor_id)
  WITH CHECK ((select auth.uid()) = instructor_id);
