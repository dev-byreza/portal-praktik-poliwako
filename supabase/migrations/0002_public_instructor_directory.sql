-- Public instructor directory for the student course catalog.
-- Only non-sensitive profile fields are exposed; email and NIP remain private.

CREATE OR REPLACE VIEW public.instructor_directory
WITH (security_invoker = false) AS
SELECT id, name, department, avatar_url
FROM public.profiles;

REVOKE ALL ON public.instructor_directory FROM PUBLIC;
GRANT SELECT ON public.instructor_directory TO anon, authenticated;
