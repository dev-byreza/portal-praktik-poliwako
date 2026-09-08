-- Instructor data isolation and shared master-student access.
-- Apply after 0000_initial_schema.sql.

-- Published courses were previously visible to every client. Instructor
-- dashboards must only receive rows owned by the authenticated instructor.
DROP POLICY IF EXISTS "Public view published courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors manage own courses" ON public.courses;
CREATE POLICY "Instructors manage own courses"
  ON public.courses FOR ALL
  TO authenticated
  USING ((select auth.uid()) = instructor_id)
  WITH CHECK ((select auth.uid()) = instructor_id);

-- Course configuration and delivery data follow the same ownership boundary.
DROP POLICY IF EXISTS "Public view Sub-CPMK" ON public.course_sub_cpmk;
DROP POLICY IF EXISTS "Instructors manage Sub-CPMK" ON public.course_sub_cpmk;
CREATE POLICY "Instructors manage Sub-CPMK"
  ON public.course_sub_cpmk FOR ALL
  TO authenticated
  USING (public.is_course_owner(course_id))
  WITH CHECK (public.is_course_owner(course_id));

DROP POLICY IF EXISTS "Public view Rubrics" ON public.rubric_criteria;
DROP POLICY IF EXISTS "Instructors manage Rubrics" ON public.rubric_criteria;
CREATE POLICY "Instructors manage Rubrics"
  ON public.rubric_criteria FOR ALL
  TO authenticated
  USING (public.is_course_owner(course_id))
  WITH CHECK (public.is_course_owner(course_id));

DROP POLICY IF EXISTS "Public view periods" ON public.practice_periods;
DROP POLICY IF EXISTS "Instructors manage periods" ON public.practice_periods;
CREATE POLICY "Instructors manage periods"
  ON public.practice_periods FOR ALL
  TO authenticated
  USING (public.is_course_owner(course_id))
  WITH CHECK (public.is_course_owner(course_id));

DROP POLICY IF EXISTS "Public view participants" ON public.practice_participants;
DROP POLICY IF EXISTS "Instructors manage participants" ON public.practice_participants;
CREATE POLICY "Instructors manage participants"
  ON public.practice_participants FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_periods p
    WHERE p.id = period_id AND public.is_course_owner(p.course_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practice_periods p
    WHERE p.id = period_id AND public.is_course_owner(p.course_id)
  ));

DROP POLICY IF EXISTS "Public view learning units" ON public.learning_units;
DROP POLICY IF EXISTS "Instructors manage learning units" ON public.learning_units;
CREATE POLICY "Instructors manage learning units"
  ON public.learning_units FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_periods p
    WHERE p.id = period_id AND public.is_course_owner(p.course_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practice_periods p
    WHERE p.id = period_id AND public.is_course_owner(p.course_id)
  ));

DROP POLICY IF EXISTS "Public view learning materials" ON public.learning_materials;
DROP POLICY IF EXISTS "Instructors manage learning materials" ON public.learning_materials;
CREATE POLICY "Instructors manage learning materials"
  ON public.learning_materials FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.learning_units u
    JOIN public.practice_periods p ON p.id = u.period_id
    WHERE u.id = unit_id AND public.is_course_owner(p.course_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.learning_units u
    JOIN public.practice_periods p ON p.id = u.period_id
    WHERE u.id = unit_id AND public.is_course_owner(p.course_id)
  ));

DROP POLICY IF EXISTS "Public view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Instructors manage assignments" ON public.assignments;
CREATE POLICY "Instructors manage assignments"
  ON public.assignments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_periods p
    WHERE p.id = period_id AND public.is_course_owner(p.course_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practice_periods p
    WHERE p.id = period_id AND public.is_course_owner(p.course_id)
  ));

DROP POLICY IF EXISTS "Public view feedback rules" ON public.feedback_rules;
DROP POLICY IF EXISTS "Instructors manage feedback rules" ON public.feedback_rules;
CREATE POLICY "Instructors manage feedback rules"
  ON public.feedback_rules FOR ALL
  TO authenticated
  USING (public.is_course_owner(course_id))
  WITH CHECK (public.is_course_owner(course_id));

-- The student master is shared by instructors. Keep it out of anonymous
-- access, while allowing any authenticated instructor to read and maintain it.
DROP POLICY IF EXISTS "Public view active students" ON public.students;
DROP POLICY IF EXISTS "Instructors manage own students" ON public.students;
CREATE POLICY "Authenticated instructors view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated instructors add students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated instructors update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated instructors delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- A master list has one record per NIM, regardless of which instructor first
-- imported it. Existing data was checked before this constraint is applied.
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS uq_instructor_nim;
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_nim_global ON public.students (lower(nim));
