-- Store the editable branches of the 70% Quality grade with the course.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS quality_components JSONB NOT NULL DEFAULT '[]'::JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.courses'::regclass
      AND conname = 'courses_quality_components_array_check'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_quality_components_array_check
      CHECK (jsonb_typeof(quality_components) = 'array');
  END IF;
END
$$;

-- Preserve the grading formula already in use while making its four branches
-- editable. The four weights sum to 100% of Quality (which remains 70% of the
-- final grade in the application formula).
UPDATE public.courses
SET quality_components = jsonb_build_array(
  jsonb_build_object(
    'id', 'quality-entry',
    'type', 'ENTRY_BEHAVIOR',
    'name', 'Kesiapan Praktik',
    'description', 'Kesiapan awal, pemahaman prasyarat, dan kepatuhan SOP dasar.',
    'weightPercent', 10
  ),
  jsonb_build_object(
    'id', 'quality-sub-cpmk',
    'type', 'SUB_CPMK',
    'name', 'Ketercapaian Sub-CPMK',
    'description', 'Capaian proses praktik dan mutu benda kerja berdasarkan Sub-CPMK.',
    'weightPercent', 50
  ),
  jsonb_build_object(
    'id', 'quality-assignment',
    'type', 'ASSIGNMENT',
    'name', 'Tugas Praktik',
    'description', 'Nilai tugas dan worksheet dari materi praktik.',
    'weightPercent', 15
  ),
  jsonb_build_object(
    'id', 'quality-post-test',
    'type', 'POST_TEST',
    'name', 'Post-Test Praktik',
    'description', 'Nilai evaluasi akhir praktik dan inspection report.',
    'weightPercent', 25
  )
) || COALESCE((
  SELECT jsonb_agg(jsonb_build_object(
    'id', rubric.id::TEXT,
    'type', 'CUSTOM',
    'name', rubric.name,
    'description', COALESCE(rubric.description, ''),
    'weightPercent', 0
  ) ORDER BY rubric.created_at, rubric.id)
  FROM public.rubric_criteria AS rubric
  WHERE rubric.course_id = courses.id
    AND rubric.category = 'QUALITY'
    AND rubric.sub_cpmk_id IS NULL
), '[]'::JSONB)
WHERE quality_components = '[]'::JSONB;
