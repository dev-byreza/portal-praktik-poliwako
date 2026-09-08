-- Course configuration is part of the student learning view as well.
-- Keep the instructor write policies from 0001 and expose only read access.

DROP POLICY IF EXISTS "Student view course sub-cpmk" ON public.course_sub_cpmk;
CREATE POLICY "Student view course sub-cpmk"
  ON public.course_sub_cpmk FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Student view course rubrics" ON public.rubric_criteria;
CREATE POLICY "Student view course rubrics"
  ON public.rubric_criteria FOR SELECT
  TO anon, authenticated
  USING (TRUE);
