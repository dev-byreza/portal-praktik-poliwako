-- Public instructor directory for the student course catalog.
-- Only non-sensitive profile fields are exposed; email and NIP remain private.

CREATE OR REPLACE VIEW public.instructor_directory
WITH (security_invoker = false) AS
SELECT id, name, department, avatar_url
FROM public.profiles;

REVOKE ALL ON public.instructor_directory FROM PUBLIC;
GRANT SELECT ON public.instructor_directory TO anon, authenticated;

-- Minimal enrollment map for student course visibility. This view contains no names or grades.
CREATE OR REPLACE VIEW public.student_course_enrollments
WITH (security_invoker = false) AS
SELECT id, period_id, student_id
FROM public.practice_participants;

REVOKE ALL ON public.student_course_enrollments FROM PUBLIC;
GRANT SELECT ON public.student_course_enrollments TO anon, authenticated;
