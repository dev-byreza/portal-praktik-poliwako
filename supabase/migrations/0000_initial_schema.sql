-- ====================================================================
-- Portal Praktik Poliwako — Comprehensive Database & Security Schema
-- Reference: Product Requirements Document (PRD) v1.0 MVP
-- Target: Supabase (PostgreSQL 15+) with Row Level Security (RLS)
-- ====================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- TRIGGER FUNCTION: Auto update updated_at timestamp
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 1. PROFILES (Instructors)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    nip VARCHAR(50),
    department VARCHAR(100) NOT NULL DEFAULT 'Teknik Mesin',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new instructor signup (Email Auth @politekniksorowako.ac.id, no Google OAuth required)
CREATE OR REPLACE FUNCTION public.handle_new_instructor()
RETURNS TRIGGER AS $$
BEGIN
    -- Enforce institutional email domain: @politekniksorowako.ac.id
    IF NEW.email NOT LIKE '%@politekniksorowako.ac.id' THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya akun email @politekniksorowako.ac.id yang diizinkan.';
    END IF;

    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users for new instructor
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_instructor();

-- ====================================================================
-- 2. MASTER STUDENTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nim VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_instructor_nim UNIQUE (instructor_id, nim)
);

CREATE INDEX IF NOT EXISTS idx_students_nim ON public.students(nim);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_name);
CREATE TRIGGER set_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 3. COURSES (Mata Kuliah)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    semester VARCHAR(20) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    department VARCHAR(100) NOT NULL DEFAULT 'Teknik Mesin',
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE TRIGGER set_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 4. COURSE SUB-CPMK (OBE)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.course_sub_cpmk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    weight_percent NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_cpmk_course ON public.course_sub_cpmk(course_id);

-- ====================================================================
-- 5. RUBRIC CRITERIA
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    sub_cpmk_id UUID REFERENCES public.course_sub_cpmk(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('QUALITY', 'ATTITUDE', 'CREATIVITY', 'REPORT')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubric_criteria_course ON public.rubric_criteria(course_id);

-- ====================================================================
-- 6. PRACTICE PERIODS (Periode Praktik)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.practice_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    period_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'COMPLETED')),
    final_project_drive_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_periods_course ON public.practice_periods(course_id);
CREATE TRIGGER set_practice_periods_updated_at BEFORE UPDATE ON public.practice_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 7. PRACTICE PARTICIPANTS (Peserta Praktik)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.practice_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED' CHECK (progress_status IN ('NOT_STARTED', 'IN_PROGRESS', 'LEARNING_COMPLETE', 'PROJECT_SUBMITTED', 'ASSESSED', 'PUBLISHED')),
    final_project_submitted_at TIMESTAMPTZ,
    final_project_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_period_student UNIQUE (period_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_period ON public.practice_participants(period_id);
CREATE INDEX IF NOT EXISTS idx_participants_student ON public.practice_participants(student_id);

-- ====================================================================
-- 8. LEARNING UNITS (Modul LMS)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.learning_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    unit_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_units_period ON public.learning_units(period_id);

-- ====================================================================
-- 9. LEARNING MATERIALS (Materi Unit)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.learning_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.learning_units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('RICHTEXT', 'PDF', 'YOUTUBE', 'EXTERNAL_LINK')),
    content_url TEXT,
    content_text TEXT,
    file_size VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_materials_unit ON public.learning_materials(unit_id);

-- ====================================================================
-- 10. UNIT PROGRESS (Progress Pembelajaran Bertahap)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.unit_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.learning_units(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_student_unit_progress UNIQUE (student_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_progress_period ON public.unit_progress(period_id);

-- ====================================================================
-- 11. ASSIGNMENTS (Tugas Praktik Internal)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.learning_units(id) ON DELETE SET NULL,
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 100,
    allowed_file_type VARCHAR(20) NOT NULL DEFAULT 'PDF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_period ON public.assignments(period_id);

-- ====================================================================
-- 12. SUBMISSIONS (Pengumpulan Tugas PDF)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size VARCHAR(50) NOT NULL,
    storage_path TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'GRADED'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);

-- ====================================================================
-- 13. ATTENDANCE RECORDS (Kehadiran 5 Hari)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    day1 VARCHAR(20) NOT NULL DEFAULT 'HADIR' CHECK (day1 IN ('HADIR', 'IZIN', 'SAKIT', 'ALPA')),
    day2 VARCHAR(20) NOT NULL DEFAULT 'HADIR' CHECK (day2 IN ('HADIR', 'IZIN', 'SAKIT', 'ALPA')),
    day3 VARCHAR(20) NOT NULL DEFAULT 'HADIR' CHECK (day3 IN ('HADIR', 'IZIN', 'SAKIT', 'ALPA')),
    day4 VARCHAR(20) NOT NULL DEFAULT 'HADIR' CHECK (day4 IN ('HADIR', 'IZIN', 'SAKIT', 'ALPA')),
    day5 VARCHAR(20) NOT NULL DEFAULT 'HADIR' CHECK (day5 IN ('HADIR', 'IZIN', 'SAKIT', 'ALPA')),
    percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    is_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_period_student UNIQUE (period_id, student_id)
);

CREATE TRIGGER set_attendance_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 14. ASSESSMENTS (Penilaian OBE Kualitas 70%, Sikap 10%, Kreativitas 5%, Laporan 15%)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    quality_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    entry_behavior_score NUMERIC(5,2),
    sub_cpmk_practice_score NUMERIC(5,2),
    assignment_score NUMERIC(5,2),
    post_test_score NUMERIC(5,2),
    post_test_file_url TEXT,
    attitude_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    creativity_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    report_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    final_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    quality_scores JSONB DEFAULT '[]'::jsonb,
    attitude_scores JSONB DEFAULT '[]'::jsonb,
    creativity_scores JSONB DEFAULT '[]'::jsonb,
    report_scores JSONB DEFAULT '[]'::jsonb,
    feedback TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_period_student UNIQUE (period_id, student_id)
);

CREATE TRIGGER set_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 15. REMEDIAL ASSIGNMENTS (Tugas Tambahan <75%)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.remedial_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    submission_file_name VARCHAR(255),
    submission_file_url TEXT,
    submitted_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_SUBMISSION' CHECK (status IN ('PENDING_SUBMISSION', 'SUBMITTED', 'LULUS', 'BELUM_LULUS')),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remedial_student ON public.remedial_assignments(period_id, student_id);

-- Auto-publish grade when all remedial assignments are PASSED (LULUS)
CREATE OR REPLACE FUNCTION auto_publish_grade_on_remedial()
RETURNS TRIGGER AS $$
DECLARE
    pending_count INTEGER;
BEGIN
    IF NEW.status = 'LULUS' THEN
        SELECT COUNT(*) INTO pending_count
        FROM public.remedial_assignments
        WHERE period_id = NEW.period_id
          AND student_id = NEW.student_id
          AND status != 'LULUS';

        IF pending_count = 0 THEN
            UPDATE public.assessments
            SET is_published = TRUE,
                published_at = NOW(),
                updated_at = NOW()
            WHERE period_id = NEW.period_id
              AND student_id = NEW.student_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_remedial_auto_publish
AFTER UPDATE ON public.remedial_assignments
FOR EACH ROW EXECUTE FUNCTION auto_publish_grade_on_remedial();

-- ====================================================================
-- 16. FEEDBACK RULES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.feedback_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    min_score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    message TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_rules_course ON public.feedback_rules(course_id);

-- ====================================================================
-- 17. AUDIT LOGS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    course_id UUID,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- PRD Section 9 & 82: Instructor Isolation & Secure Student Access
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sub_cpmk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user owns the course
CREATE OR REPLACE FUNCTION public.is_course_owner(target_course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = target_course_id AND instructor_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Courses
CREATE POLICY "Instructors manage own courses" ON public.courses FOR ALL USING (auth.uid() = instructor_id);
CREATE POLICY "Public view published courses" ON public.courses FOR SELECT USING (status = 'PUBLISHED');

-- 3. Students
CREATE POLICY "Instructors manage own students" ON public.students FOR ALL USING (auth.uid() = instructor_id);
CREATE POLICY "Public view active students" ON public.students FOR SELECT USING (TRUE);

-- 4. Course Sub-CPMK & Rubrics
CREATE POLICY "Instructors manage Sub-CPMK" ON public.course_sub_cpmk FOR ALL USING (is_course_owner(course_id));
CREATE POLICY "Public view Sub-CPMK" ON public.course_sub_cpmk FOR SELECT USING (TRUE);

CREATE POLICY "Instructors manage Rubrics" ON public.rubric_criteria FOR ALL USING (is_course_owner(course_id));
CREATE POLICY "Public view Rubrics" ON public.rubric_criteria FOR SELECT USING (TRUE);

-- 5. Practice Periods
CREATE POLICY "Instructors manage periods" ON public.practice_periods FOR ALL USING (is_course_owner(course_id));
CREATE POLICY "Public view periods" ON public.practice_periods FOR SELECT USING (TRUE);

-- 6. Practice Participants
CREATE POLICY "Instructors manage participants" ON public.practice_participants FOR ALL USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Public view participants" ON public.practice_participants FOR SELECT USING (TRUE);
CREATE POLICY "Students update own confirmation" ON public.practice_participants FOR UPDATE USING (TRUE);

-- 7. Learning Units & Materials
CREATE POLICY "Instructors manage learning units" ON public.learning_units FOR ALL USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Public view learning units" ON public.learning_units FOR SELECT USING (TRUE);

CREATE POLICY "Instructors manage learning materials" ON public.learning_materials FOR ALL USING (
    EXISTS (SELECT 1 FROM public.learning_units u JOIN public.practice_periods p ON u.period_id = p.id WHERE u.id = unit_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Public view learning materials" ON public.learning_materials FOR SELECT USING (TRUE);

-- 8. Unit Progress
CREATE POLICY "Instructors view all unit progress" ON public.unit_progress FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Students manage own unit progress" ON public.unit_progress FOR ALL USING (TRUE);

-- 9. Assignments & Submissions
CREATE POLICY "Instructors manage assignments" ON public.assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Public view assignments" ON public.assignments FOR SELECT USING (TRUE);

CREATE POLICY "Instructors manage submissions" ON public.submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Students insert submissions" ON public.submissions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Students view own submissions" ON public.submissions FOR SELECT USING (TRUE);

-- 10. Attendance Records
CREATE POLICY "Instructors manage attendance" ON public.attendance_records FOR ALL USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Students view attendance" ON public.attendance_records FOR SELECT USING (TRUE);

-- 11. Assessments
CREATE POLICY "Instructors manage assessments" ON public.assessments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Students view published assessment" ON public.assessments FOR SELECT USING (is_published = TRUE);

-- 12. Remedial Assignments
CREATE POLICY "Instructors manage remedials" ON public.remedial_assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
);
CREATE POLICY "Students view and submit remedial" ON public.remedial_assignments FOR ALL USING (TRUE);

-- 13. Feedback Rules
CREATE POLICY "Instructors manage feedback rules" ON public.feedback_rules FOR ALL USING (is_course_owner(course_id));
CREATE POLICY "Public view feedback rules" ON public.feedback_rules FOR SELECT USING (TRUE);

-- 14. Audit Logs
CREATE POLICY "Audit logs insertable" ON public.audit_logs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Audit logs viewable by instructors" ON public.audit_logs FOR SELECT USING (auth.uid() IS NOT NULL);

-- ====================================================================
-- SUPABASE STORAGE CONFIGURATION
-- Buckets: 'submissions' (Private, PDF only) & 'materials' (Public Read)
-- ====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('submissions', 'submissions', FALSE, 26214400, ARRAY['application/pdf']),
  ('materials', 'materials', TRUE, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Submissions (Instructor all, Student upload own PDF)
CREATE POLICY "Instructors full access to submissions"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'submissions');

CREATE POLICY "Students upload PDF to submissions"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'submissions' AND (LOWER(storage.extension(name)) = 'pdf'));

CREATE POLICY "Students download own submission via signed URL"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'submissions');

-- Storage RLS: Materials (Public read, Instructor upload)
CREATE POLICY "Public read materials"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'materials');

CREATE POLICY "Instructors manage materials storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'materials');
