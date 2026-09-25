-- Return only the student's database-derived study-program label during NIM
-- lookup. Name, class, email, and database ID remain hidden until proof of
-- password or activation-code possession.
CREATE OR REPLACE FUNCTION private.student_auth_lookup(
  p_nim TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
  v_course_slug TEXT;
  v_program_code TEXT;
  v_program_name TEXT;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', FALSE, 'isEnrolled', FALSE, 'hasCreatedPassword', FALSE);
  END IF;

  SELECT pp.period_id, c.slug INTO v_period_id, v_course_slug
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND (p_course_slug IS NULL OR c.slug = p_course_slug)
    AND (p_period_id IS NULL OR p.id = p_period_id)
  ORDER BY (p.status = 'ACTIVE') DESC, p.period_number ASC
  LIMIT 1;

  IF v_period_id IS NOT NULL THEN
    IF upper(v_student.class_name) LIKE '%TRPF%'
      OR upper(v_student.class_name) ~ '[0-9]D($|[^A-Z0-9])' THEN
      v_program_code := 'TRPF';
      v_program_name := 'Teknologi Rekayasa Pengelasan dan Fabrikasi';
    ELSIF upper(v_student.class_name) LIKE '%RPM%'
      OR upper(v_student.class_name) ~ '[0-9]C($|[^A-Z0-9])' THEN
      v_program_code := 'RPM';
      v_program_name := 'Rekayasa Perancangan Mekanik';
    ELSIF upper(v_student.class_name) LIKE '%PPM%'
      OR upper(v_student.class_name) ~ '[0-9][AB]($|[^A-Z0-9])' THEN
      v_program_code := 'PPM';
      v_program_name := 'Perawatan dan Perbaikan Mesin';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'exists', TRUE,
    'isEnrolled', v_period_id IS NOT NULL,
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'hasCreatedPassword', coalesce(v_student.password_hash, '') <> '',
    'studyProgramCode', v_program_code,
    'studyProgramName', v_program_name
  );
END;
$$;
