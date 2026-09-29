-- Fix student submission uploads rejected by Storage RLS.
--
-- The previous policies used an unqualified `name` inside subqueries that
-- joined practice_periods. PostgreSQL resolved it to practice_periods.name
-- instead of storage.objects.name, so the assignment/path checks could never
-- match. A new object also needs a SELECT policy that covers the validated
-- path while Storage returns the inserted object metadata, before the public
-- submissions row is created by the client.

DROP POLICY IF EXISTS "Instructors manage course submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students read own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own remedial files" ON storage.objects;
DROP POLICY IF EXISTS "Students replace own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students replace own remedial files" ON storage.objects;

CREATE POLICY "Instructors manage course submission files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(objects.name, '/', 5)
          AND p.id::TEXT = split_part(objects.name, '/', 2)
          AND p.course_id::TEXT = split_part(objects.name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.remedial_assignments r
        JOIN public.practice_periods p ON p.id = r.period_id
        WHERE r.id::TEXT = split_part(objects.name, '/', 5)
          AND p.id::TEXT = split_part(objects.name, '/', 2)
          AND p.course_id::TEXT = split_part(objects.name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(objects.name, '/', 5)
          AND p.id::TEXT = split_part(objects.name, '/', 2)
          AND p.course_id::TEXT = split_part(objects.name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.remedial_assignments r
        JOIN public.practice_periods p ON p.id = r.period_id
        WHERE r.id::TEXT = split_part(objects.name, '/', 5)
          AND p.id::TEXT = split_part(objects.name, '/', 2)
          AND p.course_id::TEXT = split_part(objects.name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
    )
  );

CREATE POLICY "Students read own submission files"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'submissions'
    AND (
      EXISTS (
        SELECT 1
        FROM public.submissions s
        WHERE s.storage_path = objects.name
          AND s.student_id = private.current_student_id(s.period_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.remedial_assignments r
        WHERE r.submission_storage_path = objects.name
          AND r.student_id = private.current_student_id(r.period_id)
      )
      OR (
        split_part(objects.name, '/', 3) = private.current_student_id(split_part(objects.name, '/', 2)::UUID)::TEXT
        AND (
          (
            split_part(objects.name, '/', 4) IN ('assignment', 'report', 'post_test')
            AND EXISTS (
              SELECT 1
              FROM public.assignments a
              JOIN public.learning_units u ON u.id = a.unit_id
              JOIN public.practice_periods p ON p.id = u.period_id
              WHERE a.id::TEXT = split_part(objects.name, '/', 5)
                AND u.period_id::TEXT = split_part(objects.name, '/', 2)
                AND p.course_id::TEXT = split_part(objects.name, '/', 1)
                AND a.deadline > NOW()
            )
          )
          OR (
            split_part(objects.name, '/', 4) = 'remedial'
            AND EXISTS (
              SELECT 1
              FROM public.remedial_assignments r
              JOIN public.practice_periods p ON p.id = r.period_id
              WHERE r.id::TEXT = split_part(objects.name, '/', 5)
                AND r.period_id::TEXT = split_part(objects.name, '/', 2)
                AND p.course_id::TEXT = split_part(objects.name, '/', 1)
                AND r.student_id = private.current_student_id(r.period_id)
                AND r.status IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
                AND r.deadline > NOW()
            )
          )
        )
      )
    )
  );

CREATE POLICY "Students upload own assignment files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(objects.name, '/', 4) IN ('assignment', 'report', 'post_test')
    AND split_part(objects.name, '/', 3) = private.current_student_id(split_part(objects.name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.learning_units u ON u.id = a.unit_id
      JOIN public.practice_periods p ON p.id = u.period_id
      WHERE a.id::TEXT = split_part(objects.name, '/', 5)
        AND u.period_id::TEXT = split_part(objects.name, '/', 2)
        AND p.course_id::TEXT = split_part(objects.name, '/', 1)
        AND a.deadline > NOW()
    )
  );

CREATE POLICY "Students upload own remedial files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(objects.name, '/', 4) = 'remedial'
    AND split_part(objects.name, '/', 3) = private.current_student_id(split_part(objects.name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.remedial_assignments r
      JOIN public.practice_periods p ON p.id = r.period_id
      WHERE r.id::TEXT = split_part(objects.name, '/', 5)
        AND r.period_id::TEXT = split_part(objects.name, '/', 2)
        AND p.course_id::TEXT = split_part(objects.name, '/', 1)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.status IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
        AND r.deadline > NOW()
    )
  );

CREATE POLICY "Students replace own submission files"
  ON storage.objects FOR UPDATE TO anon
  USING (
    bucket_id = 'submissions'
    AND split_part(objects.name, '/', 3) = private.current_student_id(split_part(objects.name, '/', 2)::UUID)::TEXT
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(objects.name, '/', 5)
          AND u.period_id::TEXT = split_part(objects.name, '/', 2)
          AND p.course_id::TEXT = split_part(objects.name, '/', 1)
          AND a.deadline > NOW()
      )
      OR EXISTS (
        SELECT 1
        FROM public.submissions s
        WHERE s.storage_path = objects.name
          AND s.student_id = private.current_student_id(s.period_id)
          AND s.status = 'REVISION_REQUIRED'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(objects.name, '/', 3) = private.current_student_id(split_part(objects.name, '/', 2)::UUID)::TEXT
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(objects.name, '/', 5)
          AND u.period_id::TEXT = split_part(objects.name, '/', 2)
          AND p.course_id::TEXT = split_part(objects.name, '/', 1)
          AND a.deadline > NOW()
      )
      OR EXISTS (
        SELECT 1
        FROM public.submissions s
        WHERE s.storage_path = objects.name
          AND s.student_id = private.current_student_id(s.period_id)
          AND s.status = 'REVISION_REQUIRED'
      )
    )
  );

CREATE POLICY "Students replace own remedial files"
  ON storage.objects FOR UPDATE TO anon
  USING (
    bucket_id = 'submissions'
    AND split_part(objects.name, '/', 4) = 'remedial'
    AND split_part(objects.name, '/', 3) = private.current_student_id(split_part(objects.name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.remedial_assignments r
      WHERE r.id::TEXT = split_part(objects.name, '/', 5)
        AND r.period_id::TEXT = split_part(objects.name, '/', 2)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.submission_storage_path = objects.name
        AND r.status = 'BELUM_LULUS'
        AND r.deadline > NOW()
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(objects.name, '/', 4) = 'remedial'
    AND split_part(objects.name, '/', 3) = private.current_student_id(split_part(objects.name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.remedial_assignments r
      WHERE r.id::TEXT = split_part(objects.name, '/', 5)
        AND r.period_id::TEXT = split_part(objects.name, '/', 2)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.submission_storage_path = objects.name
        AND r.status = 'BELUM_LULUS'
        AND r.deadline > NOW()
    )
  );

NOTIFY pgrst, 'reload schema';
