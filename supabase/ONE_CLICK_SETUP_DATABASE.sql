-- ====================================================================
-- PORTAL PRAKTIK POLIWAKO - MASTER DATABASE SETUP & FULL MIGRATIONS
-- Jalankan seluruh script ini di Supabase SQL Editor pada Project Baru:
--   Dashboard -> SQL Editor -> New Query -> Paste -> Run
--
-- Menyiapkan:
-- 1. Seluruh 43 Migrasi Skema Database, Tabel, RPC & RLS Security Policies
-- 2. Storage Buckets ('submissions' & 'materials') & Kebijakan Upload
-- 3. Akun Real Instruktur: rezaf@politekniksorowako.ac.id (Pass: 732401#Jhe)
-- 4. Mata Kuliah CAD 1.1 + 36 Mahasiswa Kelas 1C (RPM) + Periode
-- 5. Mata Kuliah CAD 2 TRPF + Mahasiswa Kelas 2D (TRPF) + Periode & Modul
-- 6. Mata Kuliah DPP 2 RPM + Mahasiswa Kelas 2C (RPM) + Periode & Modul
-- ====================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0000_initial_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

    INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NULLIF(NEW.raw_user_meta_data->>'nip', ''),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Teknik Mesin'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        nip = COALESCE(EXCLUDED.nip, public.profiles.nip),
        department = COALESCE(EXCLUDED.department, public.profiles.department),
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
DROP POLICY IF EXISTS "Profiles insertable by owner" ON public.profiles;
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
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

CREATE POLICY "Instructors manage submissions" ON public.submissions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.practice_periods p WHERE p.id = period_id AND is_course_owner(p.course_id))
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.practice_periods p
        JOIN public.assignments a ON a.period_id = p.id
        WHERE p.id = public.submissions.period_id
          AND a.id = public.submissions.assignment_id
          AND is_course_owner(p.course_id)
          AND a.deadline > NOW()
    )
);
CREATE POLICY "Students insert submissions" ON public.submissions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id = public.submissions.assignment_id
          AND a.period_id = public.submissions.period_id
          AND a.deadline > NOW()
    )
);
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
-- Buckets: 'submissions' (Private, all formats, max 50 MB) & 'materials' (Public Read)
-- ====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- NULL allowed_mime_types means the bucket accepts every file MIME type.
  ('submissions', 'submissions', FALSE, 52428800, NULL),
  ('materials', 'materials', TRUE, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Submissions (Instructor all, Student upload own PDF)
CREATE POLICY "Instructors full access to submissions"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'submissions')
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);

CREATE POLICY "Students upload submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0001_instructor_isolation_shared_students.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0002_public_instructor_directory.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0003_remove_legacy_dummy_pdfs.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Remove legacy demo PDF references. Run once in Supabase SQL Editor.
DELETE FROM public.learning_materials
WHERE lower(coalesce(content_url, '')) LIKE '%w3.org/wai/er/tests/xhtml/testfiles/resources/pdf/dummy.pdf%';

UPDATE public.assessments
SET post_test_file_url = NULL
WHERE lower(coalesce(post_test_file_url, '')) LIKE '%posttest_komprehensif.pdf%'
  AND post_test_file_url NOT LIKE 'http%';

UPDATE public.remedial_assignments
SET submission_file_name = NULL,
    submission_file_url = NULL,
    submitted_at = NULL,
    status = 'PENDING_SUBMISSION'
WHERE lower(coalesce(submission_file_url, '')) LIKE '%w3.org/wai/er/tests/xhtml/testfiles/resources/pdf/dummy.pdf%';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0004_submission_types.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Distinguish module tasks, reports, post-tests, and remedial submissions.
-- Run this migration once in Supabase SQL Editor before deploying the UI.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'ASSIGNMENT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assignments_submission_type_check'
      AND conrelid = 'public.assignments'::regclass
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_submission_type_check
      CHECK (submission_type IN ('ASSIGNMENT', 'REPORT', 'POST_TEST'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignments_submission_type
  ON public.assignments (submission_type);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'ASSIGNMENT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'submissions_submission_type_check'
      AND conrelid = 'public.submissions'::regclass
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT submissions_submission_type_check
      CHECK (submission_type IN ('ASSIGNMENT', 'REPORT', 'POST_TEST', 'REMEDIAL'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_submissions_submission_type
  ON public.submissions (submission_type);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0005_content_countdown.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Countdown gate for LMS materials and assignments.
-- Existing rows remain available immediately by default.
ALTER TABLE public.learning_materials
  ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS countdown_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countdown_started_at TIMESTAMPTZ;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS countdown_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countdown_started_at TIMESTAMPTZ;

ALTER TABLE public.learning_materials
  ADD CONSTRAINT learning_materials_countdown_minutes_check
  CHECK (countdown_minutes >= 0);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_countdown_minutes_check
  CHECK (countdown_minutes >= 0);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0006_unit_countdown.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Unit-wide countdown gate. A single timer controls all materials and tasks in a unit.
ALTER TABLE public.learning_units
  ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS countdown_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countdown_started_at TIMESTAMPTZ;

ALTER TABLE public.learning_units
  DROP CONSTRAINT IF EXISTS learning_units_countdown_minutes_check;

ALTER TABLE public.learning_units
  ADD CONSTRAINT learning_units_countdown_minutes_check
  CHECK (countdown_minutes >= 0);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0007_student_learning_content_read.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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
  TO anon
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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0008_student_course_config_read.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0009_final_project_description.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Allow instructors to describe the final project alongside its Drive folder.
ALTER TABLE public.practice_periods
  ADD COLUMN IF NOT EXISTS final_project_description TEXT;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0010_student_auth_persistence.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Persist NIM-based student passwords in Supabase so activation and login
-- work across browsers and devices without exposing password hashes.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

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
  v_has_enrollment BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exists', FALSE,
      'isEnrolled', FALSE,
      'hasCreatedPassword', FALSE,
      'periodId', NULL
    );
  END IF;

  SELECT pp.period_id, c.slug INTO v_period_id, v_course_slug
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND (p_course_slug IS NULL OR c.slug = p_course_slug)
  ORDER BY (p_period_id IS NOT NULL AND p.id = p_period_id) DESC,
           (p.status = 'ACTIVE') DESC,
           p.period_number ASC
  LIMIT 1;

  v_has_enrollment := v_period_id IS NOT NULL;

  RETURN jsonb_build_object(
    'exists', TRUE,
    'isEnrolled', v_has_enrollment,
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'hasCreatedPassword', coalesce(v_student.password_hash, '') <> '',
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_student.email,
      'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_student_id UUID,
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
BEGIN
  IF length(trim(coalesce(p_password, ''))) < 4 OR length(p_password) > 200 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password harus 4 sampai 200 karakter.');
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND lower(trim(nim)) = lower(trim(p_nim));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Data mahasiswa tidak ditemukan.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND c.slug = p_course_slug
    AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF coalesce(v_student.password_hash, '') <> '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password akun ini sudah pernah dibuat. Silakan gunakan login password.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')),
      updated_at = now()
  WHERE id = v_student.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Password berhasil disimpan.',
    'periodId', v_period_id,
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_student.email,
      'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.student_auth_login(
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1;

  IF NOT FOUND OR coalesce(v_student.password_hash, '') = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Akun belum memiliki password. Silakan buat password terlebih dahulu.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND c.slug = p_course_slug
    AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF v_student.password_hash <> trim(p_password)
     AND crypt(trim(p_password), v_student.password_hash) <> v_student.password_hash THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password salah. Periksa kembali password Anda.');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Login berhasil.',
    'periodId', v_period_id,
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_student.email,
      'createdAt', v_student.created_at
    )
  );
END;
$$;

-- Public wrappers are invoker functions; privileged work stays in the
-- unexposed private schema and only returns the minimum response fields.
CREATE OR REPLACE FUNCTION public.student_auth_lookup(
  p_nim TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.student_auth_lookup(p_nim, p_course_slug, p_period_id); $$;

CREATE OR REPLACE FUNCTION public.student_auth_set_password(
  p_student_id UUID,
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.student_auth_set_password(p_student_id, p_nim, p_password, p_course_slug, p_period_id); $$;

CREATE OR REPLACE FUNCTION public.student_auth_login(
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.student_auth_login(p_nim, p_password, p_course_slug, p_period_id); $$;

REVOKE ALL ON FUNCTION private.student_auth_lookup(TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_auth_login(TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_lookup(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_login(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_lookup(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_login(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0011_submission_storage_file_types.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Keep the submissions bucket aligned with the formats configured on an assignment.
-- Uploads are still restricted by the assignment-specific client validation;
-- this policy only prevents Storage from rejecting valid configured formats.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/zip',
  'application/vnd.rar'
]::text[]
WHERE id = 'submissions';

DROP POLICY IF EXISTS "Students upload PDF to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;

CREATE POLICY "Students upload submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND lower(storage.extension(name)) IN ('pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'zip', 'rar')
);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0012_allow_all_submission_file_types.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Assignments can explicitly accept any file format. The 50 MB bucket limit
-- remains in force while MIME and extension filtering are delegated to the
-- assignment configuration in the application.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'submissions';

DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;

CREATE POLICY "Students upload submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'submissions');



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0013_submission_max_file_size_50mb.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Raise the student submissions bucket limit to 50 MB and allow every file type.
-- The assignment's allowedFileType setting still controls the format shown and
-- accepted by the student form when an instructor selects a specific format.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = NULL
WHERE id = 'submissions';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0014_enforce_assignment_deadline_uploads.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Reject late submissions at the database and Storage policy layers.
-- A changed deadline is honored automatically because the policies read the
-- current assignment row at the moment of the upload.

DROP POLICY IF EXISTS "Students insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Instructors manage submissions" ON public.submissions;

CREATE POLICY "Instructors manage submissions"
ON public.submissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    WHERE p.id = public.submissions.period_id
      AND is_course_owner(p.course_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    JOIN public.assignments a ON a.period_id = p.id
    WHERE p.id = public.submissions.period_id
      AND a.id = public.submissions.assignment_id
      AND is_course_owner(p.course_id)
      AND a.deadline > NOW()
  )
);

CREATE POLICY "Students insert submissions"
ON public.submissions FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
);

DROP POLICY IF EXISTS "Students upload PDF to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload files to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;
DROP POLICY IF EXISTS "Instructors full access to submissions" ON storage.objects;

CREATE POLICY "Instructors full access to submissions"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'submissions')
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);

CREATE POLICY "Students upload submission files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0015_student_dashboard_project_review.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Additive migration; no existing records or permissions are removed.
ALTER TABLE public.practice_participants
  ADD COLUMN IF NOT EXISTS final_project_url text,
  ADD COLUMN IF NOT EXISTS final_project_review_status text CHECK (final_project_review_status IN ('SUBMITTED', 'REVISION_REQUIRED', 'ACCEPTED')),
  ADD COLUMN IF NOT EXISTS final_project_feedback text;

ALTER TABLE public.remedial_assignments ADD COLUMN IF NOT EXISTS submission_storage_path text;
NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0016_final_project_activation.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Let instructors control when the final-file submission opens for a period.
ALTER TABLE public.practice_periods
  ADD COLUMN IF NOT EXISTS final_project_enabled boolean NOT NULL DEFAULT false;

-- Preserve currently published Drive folders when the flag is introduced.
UPDATE public.practice_periods
SET final_project_enabled = true
WHERE final_project_drive_url IS NOT NULL
  AND btrim(final_project_drive_url) <> '';

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0017_student_submission_replacements.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Allow students to replace an existing assignment file while its deadline is open.
-- The current assignment deadline is checked for both the database row and the
-- Storage object so a late replacement is rejected at either layer.

DROP POLICY IF EXISTS "Students update submissions before deadline" ON public.submissions;

CREATE POLICY "Students update submissions before deadline"
ON public.submissions FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
);

DROP POLICY IF EXISTS "Students replace submission files before deadline" ON storage.objects;

CREATE POLICY "Students replace submission files before deadline"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
)
WITH CHECK (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = (split_part(name, '/', 5))::uuid
      AND a.deadline > NOW()
  )
);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0018_course_announcements.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Course and period announcements shown on the student dashboard.
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.practice_periods(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL CHECK (char_length(trim(title)) > 0),
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  priority VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (priority IN ('INFO', 'IMPORTANT', 'URGENT')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT announcements_expiry_after_publish CHECK (expires_at IS NULL OR expires_at > published_at)
);

CREATE INDEX IF NOT EXISTS idx_announcements_course_published
  ON public.announcements (course_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_period
  ON public.announcements (period_id)
  WHERE period_id IS NOT NULL;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active announcements" ON public.announcements;
CREATE POLICY "Public read active announcements"
ON public.announcements
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Instructors manage own announcements" ON public.announcements;
CREATE POLICY "Instructors manage own announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.courses course
    WHERE course.id = announcements.course_id
      AND course.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.courses course
    WHERE course.id = announcements.course_id
      AND course.instructor_id = auth.uid()
  )
  AND (
    announcements.period_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.practice_periods period
      WHERE period.id = announcements.period_id
        AND period.course_id = announcements.course_id
    )
  )
);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0019_submission_review_workflow.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- End-to-end assignment review workflow.
-- Instructors can accept a file or request a revision. Students may replace a
-- file after the normal deadline only when that exact submission needs revision.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS review_feedback TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 1;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.submissions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.submissions DROP CONSTRAINT %I', constraint_name);
  END IF;
END
$$;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('SUBMITTED', 'REVISION_REQUIRED', 'ACCEPTED', 'GRADED'));

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_revision_number_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_revision_number_check
  CHECK (revision_number >= 1);

-- Prevent browser clients from changing instructor-only review fields. A
-- student replacement must return the row to SUBMITTED and increment its
-- revision number exactly once.
CREATE OR REPLACE FUNCTION public.protect_submission_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_course_id UUID;
  deadline_is_open BOOLEAN;
BEGIN
  SELECT p.course_id, a.deadline > NOW()
  INTO submission_course_id, deadline_is_open
  FROM public.practice_periods p
  JOIN public.assignments a
    ON a.period_id = p.id
   AND a.id = NEW.assignment_id
  WHERE p.id = NEW.period_id;

  IF submission_course_id IS NULL THEN
    RAISE EXCEPTION 'Assignment dan periode submission tidak cocok.';
  END IF;

  IF auth.uid() IS NOT NULL AND public.is_course_owner(submission_course_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'SUBMITTED'
      OR NEW.review_feedback IS NOT NULL
      OR NEW.reviewed_at IS NOT NULL
      OR NEW.revision_number <> 1 THEN
      RAISE EXCEPTION 'Status pemeriksaan hanya dapat diubah oleh instruktur.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.assignment_id <> OLD.assignment_id
    OR NEW.student_id <> OLD.student_id
    OR NEW.period_id <> OLD.period_id THEN
    RAISE EXCEPTION 'Identitas submission tidak dapat diubah.';
  END IF;

  IF NOT deadline_is_open AND OLD.status <> 'REVISION_REQUIRED' THEN
    RAISE EXCEPTION 'Tenggat pengumpulan sudah berakhir.';
  END IF;

  IF NEW.status <> 'SUBMITTED'
    OR NEW.review_feedback IS NOT NULL
    OR NEW.reviewed_at IS NOT NULL
    OR NEW.revision_number <> OLD.revision_number + 1 THEN
    RAISE EXCEPTION 'Unggah ulang harus mereset pemeriksaan dan menaikkan nomor revisi.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_submission_review_fields_trigger ON public.submissions;
CREATE TRIGGER protect_submission_review_fields_trigger
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_submission_review_fields();

DROP POLICY IF EXISTS "Instructors manage submissions" ON public.submissions;
CREATE POLICY "Instructors manage submissions"
ON public.submissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    WHERE p.id = public.submissions.period_id
      AND public.is_course_owner(p.course_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.practice_periods p
    JOIN public.assignments a
      ON a.period_id = p.id
     AND a.id = public.submissions.assignment_id
    WHERE p.id = public.submissions.period_id
      AND public.is_course_owner(p.course_id)
  )
);

DROP POLICY IF EXISTS "Students update submissions before deadline" ON public.submissions;
DROP POLICY IF EXISTS "Students update submissions before deadline or for revision" ON public.submissions;
CREATE POLICY "Students update submissions before deadline or for revision"
ON public.submissions FOR UPDATE
TO anon, authenticated
USING (
  status = 'REVISION_REQUIRED'
  OR EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
      AND a.deadline > NOW()
  )
)
WITH CHECK (
  status = 'SUBMITTED'
  AND review_feedback IS NULL
  AND reviewed_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = public.submissions.assignment_id
      AND a.period_id = public.submissions.period_id
  )
);

DROP POLICY IF EXISTS "Students replace submission files before deadline" ON storage.objects;
DROP POLICY IF EXISTS "Students replace submission files before deadline or for revision" ON storage.objects;
CREATE POLICY "Students replace submission files before deadline or for revision"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'submissions'
  AND (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = (split_part(name, '/', 5))::uuid
        AND a.deadline > NOW()
    )
    OR EXISTS (
      SELECT 1
      FROM public.submissions s
      WHERE s.storage_path = name
        AND s.status = 'REVISION_REQUIRED'
    )
  )
)
WITH CHECK (
  bucket_id = 'submissions'
  AND (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = (split_part(name, '/', 5))::uuid
        AND a.deadline > NOW()
    )
    OR EXISTS (
      SELECT 1
      FROM public.submissions s
      WHERE s.storage_path = name
        AND s.status = 'REVISION_REQUIRED'
    )
  )
);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0020_instructor_signup_profile_sync.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Make instructor signup durable for both confirmed and email-pending accounts.
-- The auth trigger owns profile creation; the browser only refreshes fields
-- after a session exists, so RLS cannot leave a half-created account.

CREATE OR REPLACE FUNCTION public.handle_new_instructor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_department TEXT;
  v_nip TEXT;
  v_avatar_url TEXT;
BEGIN
  IF lower(COALESCE(NEW.email, '')) NOT LIKE '%@politekniksorowako.ac.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya akun email @politekniksorowako.ac.id yang diizinkan.';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );
  v_department := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Teknik Mesin');
  v_nip := NULLIF(NEW.raw_user_meta_data->>'nip', '');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
  VALUES (NEW.id, lower(NEW.email), v_name, v_nip, v_department, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    nip = COALESCE(EXCLUDED.nip, public.profiles.nip),
    department = COALESCE(NULLIF(EXCLUDED.department, ''), public.profiles.department),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_instructor();

-- Repair accounts created before this migration (including accounts whose
-- browser-side profile upsert was rejected by RLS).
INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
SELECT
  u.id,
  lower(u.email),
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1)),
  NULLIF(u.raw_user_meta_data->>'nip', ''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'department', ''), 'Teknik Mesin'),
  NULLIF(u.raw_user_meta_data->>'avatar_url', '')
FROM auth.users u
WHERE lower(COALESCE(u.email, '')) LIKE '%@politekniksorowako.ac.id'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
  nip = COALESCE(EXCLUDED.nip, public.profiles.nip),
  department = CASE
    WHEN EXCLUDED.department <> 'Teknik Mesin' THEN EXCLUDED.department
    ELSE public.profiles.department
  END,
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
  updated_at = NOW();

DROP POLICY IF EXISTS "Profiles insertable by owner" ON public.profiles;
CREATE POLICY "Profiles insertable by owner"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Profiles updatable by owner" ON public.profiles;
CREATE POLICY "Profiles updatable by owner"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0021_harden_course_visibility.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0022_quiz_architecture.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Quiz architecture: keep quiz attached to a learning material, but store
-- questions, options, and attempts as queryable records.
-- Legacy JSON in learning_materials.content_text remains readable during the
-- transition and can be migrated by the application on the next save.

ALTER TABLE public.learning_materials
  DROP CONSTRAINT IF EXISTS learning_materials_type_check;

ALTER TABLE public.learning_materials
  ADD CONSTRAINT learning_materials_type_check
  CHECK (type IN ('RICHTEXT', 'PDF', 'YOUTUBE', 'EXTERNAL_LINK', 'QUIZ'));

CREATE TABLE IF NOT EXISTS public.quiz_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL UNIQUE REFERENCES public.learning_materials(id) ON DELETE CASCADE,
  description TEXT,
  shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  pass_score NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (pass_score >= 0 AND pass_score <= 100),
  max_attempts INTEGER NOT NULL DEFAULT 0 CHECK (max_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quiz_definitions(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT,
  explanation TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  correct_option_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quiz_id, position)
);

CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, position)
);

ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_correct_option_fk;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_correct_option_fk
  FOREIGN KEY (correct_option_id) REFERENCES public.quiz_options(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quiz_definitions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quiz_id, student_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.quiz_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON public.quiz_options(question_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id, period_id, submitted_at DESC);

-- One-time migration for quizzes created before the normalized tables
-- existed. Keeping the old content_text value makes rollback and older
-- clients safe while the new API starts reading quiz_definitions first.
DO $$
DECLARE
  v_material RECORD;
  v_payload JSONB;
  v_quiz_id UUID;
  v_question JSONB;
  v_option JSONB;
  v_question_id UUID;
  v_option_id UUID;
  v_correct_old_id TEXT;
  v_question_position INTEGER;
  v_option_position INTEGER;
BEGIN
  FOR v_material IN
    SELECT id, content_text
    FROM public.learning_materials
    WHERE type = 'QUIZ' AND content_text LIKE '\_\_POLIWAKO\_QUIZ\_V1\_\_%' ESCAPE '\'
  LOOP
    v_payload := substring(v_material.content_text FROM length('__POLIWAKO_QUIZ_V1__') + 1)::JSONB;
    SELECT id INTO v_quiz_id FROM public.quiz_definitions WHERE material_id = v_material.id;
    IF v_quiz_id IS NOT NULL THEN CONTINUE; END IF;

    INSERT INTO public.quiz_definitions(material_id, description, shuffle_questions, pass_score, max_attempts)
    VALUES (
      v_material.id,
      NULLIF(v_payload->>'description', ''),
      COALESCE((v_payload->>'shuffleQuestions')::BOOLEAN, FALSE),
      COALESCE(NULLIF(v_payload->>'passScore', '')::NUMERIC, 70),
      COALESCE(NULLIF(v_payload->>'maxAttempts', '')::INTEGER, 0)
    ) RETURNING id INTO v_quiz_id;

    v_question_position := 0;
    FOR v_question IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload->'questions', '[]'::JSONB)) LOOP
      v_question_id := gen_random_uuid();
      v_correct_old_id := v_question->>'correctOptionId';
      INSERT INTO public.quiz_questions(id, quiz_id, prompt, image_url, explanation, position)
      VALUES (v_question_id, v_quiz_id, COALESCE(v_question->>'prompt', ''), v_question->>'imageUrl', v_question->>'explanation', v_question_position);

      v_option_position := 0;
      FOR v_option IN SELECT value FROM jsonb_array_elements(COALESCE(v_question->'options', '[]'::JSONB)) LOOP
        v_option_id := gen_random_uuid();
        INSERT INTO public.quiz_options(id, question_id, option_text, position)
        VALUES (v_option_id, v_question_id, COALESCE(v_option->>'text', ''), v_option_position);
        IF v_option->>'id' = v_correct_old_id THEN
          UPDATE public.quiz_questions SET correct_option_id = v_option_id WHERE id = v_question_id;
        END IF;
        v_option_position := v_option_position + 1;
      END LOOP;
      v_question_position := v_question_position + 1;
    END LOOP;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- A malformed legacy quiz must not prevent the rest of the migration from
  -- applying; the application will continue to read it through its fallback.
  RAISE WARNING 'Legacy quiz migration skipped: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS set_quiz_definitions_updated_at ON public.quiz_definitions;
CREATE TRIGGER set_quiz_definitions_updated_at
BEFORE UPDATE ON public.quiz_definitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.quiz_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Public students may read quiz content only from published courses. The
-- correct answer column is intentionally not granted to anon below.
DROP POLICY IF EXISTS "Student view published quiz definitions" ON public.quiz_definitions;
CREATE POLICY "Student view published quiz definitions"
  ON public.quiz_definitions FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.learning_materials lm
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE lm.id = quiz_definitions.material_id AND c.status = 'PUBLISHED'
  ));

DROP POLICY IF EXISTS "Instructors manage own quiz definitions" ON public.quiz_definitions;
CREATE POLICY "Instructors manage own quiz definitions"
  ON public.quiz_definitions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.learning_materials lm
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE lm.id = quiz_definitions.material_id AND c.instructor_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.learning_materials lm
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE lm.id = quiz_definitions.material_id AND c.instructor_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Student view published quiz questions" ON public.quiz_questions;
CREATE POLICY "Student view published quiz questions"
  ON public.quiz_questions FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_questions.quiz_id AND c.status = 'PUBLISHED'
  ));

DROP POLICY IF EXISTS "Instructors manage own quiz questions" ON public.quiz_questions;
CREATE POLICY "Instructors manage own quiz questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_questions.quiz_id AND c.instructor_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_questions.quiz_id AND c.instructor_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Student view published quiz options" ON public.quiz_options;
CREATE POLICY "Student view published quiz options"
  ON public.quiz_options FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    JOIN public.quiz_definitions qd ON qd.id = qq.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qq.id = quiz_options.question_id AND c.status = 'PUBLISHED'
  ));

DROP POLICY IF EXISTS "Instructors manage own quiz options" ON public.quiz_options;
CREATE POLICY "Instructors manage own quiz options"
  ON public.quiz_options FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    JOIN public.quiz_definitions qd ON qd.id = qq.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qq.id = quiz_options.question_id AND c.instructor_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    JOIN public.quiz_definitions qd ON qd.id = qq.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qq.id = quiz_options.question_id AND c.instructor_id = (select auth.uid())
  ));

-- Attempt rows are instructor-readable. Students submit through the RPC below
-- so the answer key never needs to be exposed to the browser.
DROP POLICY IF EXISTS "Instructors view quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Instructors view quiz attempts"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_definitions qd
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qd.id = quiz_attempts.quiz_id AND c.instructor_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Instructors view quiz answers" ON public.quiz_answers;
CREATE POLICY "Instructors view quiz answers"
  ON public.quiz_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.quiz_attempts qa
    JOIN public.quiz_definitions qd ON qd.id = qa.quiz_id
    JOIN public.learning_materials lm ON lm.id = qd.material_id
    JOIN public.learning_units lu ON lu.id = lm.unit_id
    JOIN public.practice_periods pp ON pp.id = lu.period_id
    JOIN public.courses c ON c.id = pp.course_id
    WHERE qa.id = quiz_answers.attempt_id AND c.instructor_id = (select auth.uid())
  ));

-- Limit anonymous question reads to the safe columns. Authenticated
-- instructors retain full access through RLS and the table grants.
REVOKE SELECT ON public.quiz_questions FROM anon;
GRANT SELECT (id, quiz_id, prompt, image_url, explanation, position) ON public.quiz_questions TO anon;
GRANT SELECT ON public.quiz_definitions, public.quiz_options TO anon;

CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = true)
AS
SELECT id, quiz_id, prompt, image_url, explanation, position
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_public TO anon, authenticated;

-- Per-student session tokens allow the existing NIM/password flow to submit a
-- quiz without trusting a student_id sent by the browser.
CREATE TABLE IF NOT EXISTS private.student_sessions (
  token_hash TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.practice_periods(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

REVOKE ALL ON TABLE private.student_sessions FROM PUBLIC;
REVOKE ALL ON TABLE private.student_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.issue_student_session(p_student_id UUID, p_period_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_token TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
  INSERT INTO private.student_sessions(token_hash, student_id, period_id)
  VALUES (encode(digest(v_token, 'sha256'), 'hex'), p_student_id, p_period_id);
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION private.issue_student_session(UUID, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.student_submit_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_session private.student_sessions%ROWTYPE;
  v_quiz public.quiz_definitions%ROWTYPE;
  v_attempt_id UUID;
  v_attempt_number INTEGER;
  v_total INTEGER;
  v_correct INTEGER := 0;
  v_answer JSONB;
  v_question public.quiz_questions%ROWTYPE;
  v_selected UUID;
  v_is_correct BOOLEAN;
BEGIN
  SELECT * INTO v_session
  FROM private.student_sessions
  WHERE token_hash = encode(digest(trim(coalesce(p_session_token, '')), 'sha256'), 'hex')
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND period_id = p_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi mahasiswa tidak valid atau telah berakhir.';
  END IF;

  SELECT qd.* INTO v_quiz
  FROM public.quiz_definitions qd
  JOIN public.learning_materials lm ON lm.id = qd.material_id
  JOIN public.learning_units lu ON lu.id = lm.unit_id
  WHERE qd.material_id = p_material_id AND lu.period_id = p_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz tidak ditemukan pada periode mahasiswa.';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id;
  IF v_total = 0 THEN RAISE EXCEPTION 'Quiz belum memiliki pertanyaan.'; END IF;

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
  FROM public.quiz_attempts
  WHERE quiz_id = v_quiz.id AND student_id = v_session.student_id;
  IF v_quiz.max_attempts > 0 AND v_attempt_number > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Batas percobaan quiz telah tercapai.';
  END IF;

  INSERT INTO public.quiz_attempts(quiz_id, student_id, period_id, attempt_number, score, correct_count, total_questions)
  VALUES (v_quiz.id, v_session.student_id, p_period_id, v_attempt_number, 0, 0, v_total)
  RETURNING id INTO v_attempt_id;

  FOR v_answer IN SELECT value FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) LOOP
    SELECT * INTO v_question FROM public.quiz_questions
    WHERE id = NULLIF(v_answer->>'questionId', '')::UUID AND quiz_id = v_quiz.id;
    IF FOUND THEN
      v_selected := NULLIF(v_answer->>'optionId', '')::UUID;
      v_is_correct := v_selected IS NOT NULL AND v_selected = v_question.correct_option_id;
      IF v_is_correct THEN v_correct := v_correct + 1; END IF;
      INSERT INTO public.quiz_answers(attempt_id, question_id, selected_option_id, is_correct)
      VALUES (v_attempt_id, v_question.id, v_selected, v_is_correct);
    END IF;
  END LOOP;

  UPDATE public.quiz_attempts
  SET correct_count = v_correct, score = ROUND((v_correct::NUMERIC / v_total::NUMERIC) * 100, 2)
  WHERE id = v_attempt_id;

  RETURN jsonb_build_object(
    'attemptId', v_attempt_id,
    'score', ROUND((v_correct::NUMERIC / v_total::NUMERIC) * 100, 2),
    'correct', v_correct,
    'total', v_total,
    'passed', ROUND((v_correct::NUMERIC / v_total::NUMERIC) * 100, 2) >= v_quiz.pass_score,
    'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'questionId', qq.id,
      'correctOptionId', qq.correct_option_id,
      'isCorrect', qa.is_correct
    )) FROM public.quiz_answers qa JOIN public.quiz_questions qq ON qq.id = qa.question_id WHERE qa.attempt_id = v_attempt_id), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION private.student_submit_quiz_attempt(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.student_submit_quiz_attempt(TEXT, UUID, UUID, JSONB) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_submit_quiz_attempt(p_session_token, p_material_id, p_period_id, p_answers);
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(TEXT, UUID, UUID, JSONB) TO anon, authenticated;

-- Extend the existing custom student login functions with an opaque session
-- token. The public wrappers created in migration 0010 continue to work.
CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_student_id UUID,
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
  v_session_token TEXT;
BEGIN
  IF length(trim(coalesce(p_password, ''))) < 4 OR length(p_password) > 200 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password harus 4 sampai 200 karakter.');
  END IF;

  SELECT * INTO v_student FROM public.students
  WHERE id = p_student_id AND lower(trim(nim)) = lower(trim(p_nim));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Data mahasiswa tidak ditemukan.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id AND c.slug = p_course_slug AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF coalesce(v_student.password_hash, '') <> '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password akun ini sudah pernah dibuat. Silakan gunakan login password.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = now()
  WHERE id = v_student.id;
  v_session_token := private.issue_student_session(v_student.id, v_period_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Password berhasil disimpan.',
    'periodId', v_period_id,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id, 'nim', v_student.nim, 'name', v_student.name,
      'className', v_student.class_name, 'email', v_student.email, 'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.student_auth_login(
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_period_id UUID;
  v_session_token TEXT;
BEGIN
  SELECT * INTO v_student FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim)) LIMIT 1;
  IF NOT FOUND OR coalesce(v_student.password_hash, '') = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Akun belum memiliki password. Silakan buat password terlebih dahulu.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id AND c.slug = p_course_slug AND p.id = p_period_id
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada mata kuliah atau periode ini.');
  END IF;

  IF v_student.password_hash <> trim(p_password)
     AND crypt(trim(p_password), v_student.password_hash) <> v_student.password_hash THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password salah. Periksa kembali password Anda.');
  END IF;

  v_session_token := private.issue_student_session(v_student.id, v_period_id);
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Login berhasil.',
    'periodId', v_period_id,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id, 'nim', v_student.nim, 'name', v_student.name,
      'className', v_student.class_name, 'email', v_student.email, 'createdAt', v_student.created_at
    )
  );
END;
$$;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0023_quiz_result_read.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Add server-backed quiz result hydration for databases that already applied
-- migration 0022_quiz_architecture.sql.

CREATE OR REPLACE FUNCTION private.get_student_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_session private.student_sessions%ROWTYPE;
  v_quiz_id UUID;
  v_attempt public.quiz_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM private.student_sessions
  WHERE token_hash = encode(digest(trim(coalesce(p_session_token, '')), 'sha256'), 'hex')
    AND revoked_at IS NULL AND expires_at > NOW() AND period_id = p_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesi mahasiswa tidak valid atau telah berakhir.'; END IF;

  SELECT qd.id INTO v_quiz_id
  FROM public.quiz_definitions qd
  JOIN public.learning_materials lm ON lm.id = qd.material_id
  JOIN public.learning_units lu ON lu.id = lm.unit_id
  WHERE qd.material_id = p_material_id AND lu.period_id = p_period_id;
  IF v_quiz_id IS NULL THEN RAISE EXCEPTION 'Quiz tidak ditemukan pada periode mahasiswa.'; END IF;

  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE quiz_id = v_quiz_id AND student_id = v_session.student_id AND period_id = p_period_id
  ORDER BY submitted_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'attemptId', v_attempt.id,
    'score', v_attempt.score,
    'correct', v_attempt.correct_count,
    'total', v_attempt.total_questions,
    'submittedAt', v_attempt.submitted_at,
    'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'questionId', qq.id, 'correctOptionId', qq.correct_option_id, 'isCorrect', qa.is_correct
    )) FROM public.quiz_answers qa JOIN public.quiz_questions qq ON qq.id = qa.question_id WHERE qa.attempt_id = v_attempt.id), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION private.get_student_quiz_attempt(TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_student_quiz_attempt(TEXT, UUID, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_student_quiz_attempt(
  p_session_token TEXT,
  p_material_id UUID,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.get_student_quiz_attempt(p_session_token, p_material_id, p_period_id);
$$;

REVOKE ALL ON FUNCTION public.get_student_quiz_attempt(TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_quiz_attempt(TEXT, UUID, UUID) TO anon, authenticated;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 0024_harden_quiz_session_access.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Keep the private student-session table inaccessible through direct table
-- access. Quiz authentication continues through the server functions.

ALTER TABLE private.student_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct student session access" ON private.student_sessions;
CREATE POLICY "No direct student session access"
  ON private.student_sessions FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925002500_student_session_row_security.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Scope student-private data and Storage objects to the opaque session issued
-- by private.student_auth_login / private.student_auth_set_password.
-- Instructor RLS remains tied to auth.uid() and course ownership.

CREATE OR REPLACE FUNCTION private.current_student_id(p_period_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_token TEXT;
  v_student_id UUID;
BEGIN
  v_token := NULLIF(
    BTRIM(COALESCE(
      current_setting('request.headers', TRUE)::JSONB ->> 'x-poliwako-student-session',
      ''
    )),
    ''
  );
  IF v_token IS NULL THEN RETURN NULL; END IF;

  SELECT student_id INTO v_student_id
  FROM private.student_sessions
  WHERE token_hash = encode(digest(v_token, 'sha256'), 'hex')
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND (p_period_id IS NULL OR period_id = p_period_id)
  LIMIT 1;

  RETURN v_student_id;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.current_student_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_student_id(UUID) TO anon, authenticated;

-- Remove broad enrollment access, then make the minimal enrollment view obey
-- practice_participants RLS instead of running with its owner's privileges.
DROP POLICY IF EXISTS "Public view participants" ON public.practice_participants;
DROP POLICY IF EXISTS "Student view participants" ON public.practice_participants;
DROP POLICY IF EXISTS "Students update own confirmation" ON public.practice_participants;
CREATE POLICY "Student view own participant row"
  ON public.practice_participants FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));
CREATE POLICY "Student update own final project confirmation"
  ON public.practice_participants FOR UPDATE TO anon
  USING (student_id = private.current_student_id(period_id))
  WITH CHECK (student_id = private.current_student_id(period_id));

ALTER VIEW public.student_course_enrollments SET (security_invoker = TRUE);

-- Students may see only their own unit progress. No student-side write is
-- needed by the live API; completion remains authoritative to the server.
DROP POLICY IF EXISTS "Students manage own unit progress" ON public.unit_progress;
DROP POLICY IF EXISTS "Student view own unit progress" ON public.unit_progress;
CREATE POLICY "Student view own unit progress"
  ON public.unit_progress FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));

-- Submissions: scope reads, initial uploads, and revisions by authenticated
-- session. Keep instructor operations under the existing course-owner policy.
DROP POLICY IF EXISTS "Students insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students update submissions before deadline" ON public.submissions;
DROP POLICY IF EXISTS "Students update submissions before deadline or for revision" ON public.submissions;
CREATE POLICY "Student view own submissions"
  ON public.submissions FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));
CREATE POLICY "Student insert own submissions"
  ON public.submissions FOR INSERT TO anon
  WITH CHECK (
    student_id = private.current_student_id(period_id)
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND a.period_id = submissions.period_id
        AND a.deadline > NOW()
    )
  );
CREATE POLICY "Student update own submissions"
  ON public.submissions FOR UPDATE TO anon
  USING (
    student_id = private.current_student_id(period_id)
    AND (
      status = 'REVISION_REQUIRED'
      OR EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id = submissions.assignment_id
          AND a.period_id = submissions.period_id
          AND a.deadline > NOW()
      )
    )
  )
  WITH CHECK (
    student_id = private.current_student_id(period_id)
    AND status = 'SUBMITTED'
    AND review_feedback IS NULL
    AND reviewed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND a.period_id = submissions.period_id
    )
  );

-- Keep server-side review fields and submission identity protected even when
-- an anonymous caller knows another student's row ID.
CREATE OR REPLACE FUNCTION public.protect_submission_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_course_id UUID;
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT p.course_id, a.deadline
  INTO v_course_id, v_deadline
  FROM public.practice_periods p
  JOIN public.assignments a
    ON a.period_id = p.id AND a.id = NEW.assignment_id
  WHERE p.id = NEW.period_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Assignment dan periode submission tidak cocok.';
  END IF;

  IF auth.uid() IS NOT NULL AND public.is_course_owner(v_course_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.student_id IS DISTINCT FROM private.current_student_id(NEW.period_id) THEN
    RAISE EXCEPTION 'Sesi tidak berhak mengirim submission mahasiswa ini.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'SUBMITTED'
      OR NEW.review_feedback IS NOT NULL
      OR NEW.reviewed_at IS NOT NULL
      OR NEW.revision_number <> 1
      OR v_deadline <= NOW() THEN
      RAISE EXCEPTION 'Submission tidak valid atau tenggat telah berakhir.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
    OR NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.period_id IS DISTINCT FROM OLD.period_id THEN
    RAISE EXCEPTION 'Identitas submission tidak dapat diubah.';
  END IF;
  IF v_deadline <= NOW() AND OLD.status <> 'REVISION_REQUIRED' THEN
    RAISE EXCEPTION 'Tenggat pengumpulan sudah berakhir.';
  END IF;
  IF NEW.status <> 'SUBMITTED'
    OR NEW.review_feedback IS NOT NULL
    OR NEW.reviewed_at IS NOT NULL
    OR NEW.revision_number <> OLD.revision_number + 1 THEN
    RAISE EXCEPTION 'Unggah ulang harus mereset pemeriksaan dan menaikkan nomor revisi.';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_submission_review_fields() FROM PUBLIC, anon, authenticated;

-- Assessment and attendance are private student records; publish state alone
-- is not sufficient authorization to read somebody else's grade.
DROP POLICY IF EXISTS "Students view attendance" ON public.attendance_records;
CREATE POLICY "Student view own attendance"
  ON public.attendance_records FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));

DROP POLICY IF EXISTS "Students view published assessment" ON public.assessments;
CREATE POLICY "Student view own published assessment"
  ON public.assessments FOR SELECT TO anon
  USING (
    is_published = TRUE
    AND student_id = private.current_student_id(period_id)
  );

-- Students can read and submit only their own remedial work. They cannot
-- create remedials, delete them, or set the instructor's pass/review status.
DROP POLICY IF EXISTS "Students view and submit remedial" ON public.remedial_assignments;
CREATE POLICY "Student view own remedials"
  ON public.remedial_assignments FOR SELECT TO anon
  USING (student_id = private.current_student_id(period_id));
CREATE POLICY "Student update own remedial submission"
  ON public.remedial_assignments FOR UPDATE TO anon
  USING (
    student_id = private.current_student_id(period_id)
    AND status IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
    AND deadline > NOW()
  )
  WITH CHECK (
    student_id = private.current_student_id(period_id)
    AND status = 'SUBMITTED'
  );

CREATE OR REPLACE FUNCTION public.protect_student_owned_row_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'practice_participants' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.period_id IS DISTINCT FROM OLD.period_id
      OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at
      OR NEW.progress_status IS DISTINCT FROM (CASE
        WHEN OLD.progress_status IN ('ASSESSED', 'PUBLISHED') THEN OLD.progress_status
        ELSE 'PROJECT_SUBMITTED'
      END)
      OR NEW.final_project_feedback IS DISTINCT FROM OLD.final_project_feedback
      OR OLD.final_project_review_status = 'ACCEPTED'
      OR NEW.final_project_confirmed IS DISTINCT FROM TRUE
      OR NEW.final_project_review_status IS DISTINCT FROM 'SUBMITTED'
      OR NEW.final_project_url IS NULL
      OR NEW.final_project_url !~ '^https://drive[.]google[.]com/'
      OR NEW.final_project_submitted_at IS NULL THEN
      RAISE EXCEPTION 'Mahasiswa hanya dapat mengirim tautan proyek miliknya sendiri.';
    END IF;
  ELSIF TG_TABLE_NAME = 'remedial_assignments' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.period_id IS DISTINCT FROM OLD.period_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.deadline IS DISTINCT FROM OLD.deadline
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.status <> 'SUBMITTED'
      OR OLD.status NOT IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
      OR NEW.submission_file_name IS NULL
      OR NEW.submission_file_url IS NULL
      OR NEW.submitted_at IS NULL THEN
      RAISE EXCEPTION 'Mahasiswa hanya dapat mengirim berkas untuk remedial miliknya.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Tabel ini tidak mendukung perubahan oleh mahasiswa.';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_student_owned_row_updates() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_student_participant_fields ON public.practice_participants;
CREATE TRIGGER protect_student_participant_fields
  BEFORE UPDATE ON public.practice_participants
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_owned_row_updates();

DROP TRIGGER IF EXISTS protect_student_remedial_fields ON public.remedial_assignments;
CREATE TRIGGER protect_student_remedial_fields
  BEFORE UPDATE ON public.remedial_assignments
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_owned_row_updates();

-- Storage paths are <course>/<period>/<student>/<type>/<item>/<filename>.
-- Check the row owner and live deadline before allowing the browser to touch
-- private submission objects.
DROP POLICY IF EXISTS "Instructors full access to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students download own submission via signed URL" ON storage.objects;
DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students replace submission files before deadline" ON storage.objects;
DROP POLICY IF EXISTS "Students replace submission files before deadline or for revision" ON storage.objects;

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
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.remedial_assignments r
        JOIN public.practice_periods p ON p.id = r.period_id
        WHERE r.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
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
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.remedial_assignments r
        JOIN public.practice_periods p ON p.id = r.period_id
        WHERE r.id::TEXT = split_part(name, '/', 5)
          AND p.id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND public.is_course_owner(p.course_id)
      )
    )
  );

CREATE POLICY "Students read own submission files"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.storage_path = objects.name
        AND s.student_id = private.current_student_id(s.period_id)
    )
    OR bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.remedial_assignments r
      WHERE r.submission_storage_path = objects.name
        AND r.student_id = private.current_student_id(r.period_id)
    )
  );

CREATE POLICY "Students upload own assignment files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.learning_units u ON u.id = a.unit_id
      JOIN public.practice_periods p ON p.id = u.period_id
      WHERE a.id::TEXT = split_part(name, '/', 5)
        AND u.period_id::TEXT = split_part(name, '/', 2)
        AND p.course_id::TEXT = split_part(name, '/', 1)
        AND a.deadline > NOW()
    )
  );

CREATE POLICY "Students upload own remedial files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 4) = 'remedial'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.remedial_assignments r
      JOIN public.practice_periods p ON p.id = r.period_id
      WHERE r.id::TEXT = split_part(name, '/', 5)
        AND r.period_id::TEXT = split_part(name, '/', 2)
        AND p.course_id::TEXT = split_part(name, '/', 1)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.status IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
        AND r.deadline > NOW()
    )
  );

CREATE POLICY "Students replace own submission files"
  ON storage.objects FOR UPDATE TO anon
  USING (
    bucket_id = 'submissions'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND u.period_id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND a.deadline > NOW()
      )
      OR EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.storage_path = objects.name
          AND s.student_id = private.current_student_id(s.period_id)
          AND s.status = 'REVISION_REQUIRED'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.learning_units u ON u.id = a.unit_id
        JOIN public.practice_periods p ON p.id = u.period_id
        WHERE a.id::TEXT = split_part(name, '/', 5)
          AND u.period_id::TEXT = split_part(name, '/', 2)
          AND p.course_id::TEXT = split_part(name, '/', 1)
          AND a.deadline > NOW()
      )
      OR EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.storage_path = objects.name
          AND s.student_id = private.current_student_id(s.period_id)
          AND s.status = 'REVISION_REQUIRED'
      )
    )
  );

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925045000_harden_student_activation_and_quiz_storage.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Replace NIM-only first-password setup with instructor-issued, single-use
-- activation codes. Resets revoke prior browser sessions immediately.
CREATE TABLE IF NOT EXISTS private.student_activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('ACTIVATION', 'PASSWORD_RESET')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  failed_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_activation_codes_student
  ON private.student_activation_codes(student_id, expires_at DESC);
ALTER TABLE private.student_activation_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct student activation code access" ON private.student_activation_codes;
CREATE POLICY "No direct student activation code access"
  ON private.student_activation_codes FOR ALL TO anon, authenticated
  USING (FALSE) WITH CHECK (FALSE);
REVOKE ALL ON TABLE private.student_activation_codes FROM PUBLIC, anon, authenticated;

-- A NIM lookup may report enrollment and password state, but never returns a
-- student's name, email, or database ID before the student proves possession
-- of a password or one-time activation code.
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

  RETURN jsonb_build_object(
    'exists', TRUE,
    'isEnrolled', v_period_id IS NOT NULL,
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'hasCreatedPassword', coalesce(v_student.password_hash, '') <> ''
  );
END;
$$;

-- Drop the old RPC shape, which let any caller knowing student ID + NIM set a
-- first password without proving ownership of the account.
DROP FUNCTION IF EXISTS public.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS private.student_auth_set_password(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION private.student_auth_issue_activation_code(
  p_student_id UUID,
  p_reset_existing_password BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_code TEXT := upper(encode(gen_random_bytes(12), 'hex'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesi instruktur diperlukan untuk menerbitkan kode aktivasi.';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.practice_participants pp
    JOIN public.practice_periods p ON p.id = pp.period_id
    WHERE pp.student_id = v_student.id
      AND public.is_course_owner(p.course_id)
  ) THEN
    RAISE EXCEPTION 'Instruktur tidak berwenang mengelola akun mahasiswa ini.';
  END IF;

  IF NOT p_reset_existing_password AND coalesce(v_student.password_hash, '') <> '' THEN
    RAISE EXCEPTION 'Akun sudah aktif. Gunakan alur reset password untuk membuat kode baru.';
  END IF;

  IF p_reset_existing_password THEN
    UPDATE public.students SET password_hash = NULL, updated_at = NOW() WHERE id = v_student.id;
    UPDATE private.student_sessions
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE student_id = v_student.id AND revoked_at IS NULL;
  END IF;

  UPDATE private.student_activation_codes
    SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;

  INSERT INTO private.student_activation_codes(
    student_id, token_hash, purpose, created_by, expires_at
  ) VALUES (
    v_student.id,
    encode(digest(v_code, 'sha256'), 'hex'),
    CASE WHEN p_reset_existing_password THEN 'PASSWORD_RESET' ELSE 'ACTIVATION' END,
    auth.uid(),
    NOW() + INTERVAL '24 hours'
  );

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_issue_activation_code(
  p_student_id UUID,
  p_reset_existing_password BOOLEAN
)
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_issue_activation_code(p_student_id, p_reset_existing_password);
$$;

CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_nim TEXT,
  p_password TEXT,
  p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_activation private.student_activation_codes%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_period_id UUID;
  v_course_slug TEXT;
  v_session_token TEXT;
BEGIN
  IF octet_length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password harus 8 sampai 72 byte.');
  END IF;
  IF length(trim(coalesce(p_activation_code, ''))) <> 24 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Kode aktivasi tidak valid atau kedaluwarsa.');
  END IF;

  SELECT * INTO v_activation
  FROM private.student_activation_codes
  WHERE token_hash = encode(digest(upper(trim(p_activation_code)), 'sha256'), 'hex')
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND failed_attempts < 5
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Kode aktivasi tidak valid atau kedaluwarsa.');
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = v_activation.student_id
  FOR UPDATE;
  IF NOT FOUND OR lower(trim(v_student.nim)) <> lower(trim(p_nim)) THEN
    UPDATE private.student_activation_codes
      SET failed_attempts = failed_attempts + 1,
          revoked_at = CASE WHEN failed_attempts >= 4 THEN NOW() ELSE revoked_at END
      WHERE id = v_activation.id;
    RETURN jsonb_build_object('success', FALSE, 'message', 'NIM atau kode aktivasi tidak cocok.');
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
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada periode praktik ini.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = NOW()
  WHERE id = v_student.id;
  UPDATE private.student_activation_codes SET consumed_at = NOW() WHERE id = v_activation.id;
  UPDATE private.student_sessions
    SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE student_id = v_student.id AND revoked_at IS NULL;
  v_session_token := private.issue_student_session(v_student.id, v_period_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Password berhasil dibuat.',
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id, 'nim', v_student.nim, 'name', v_student.name,
      'className', v_student.class_name, 'email', v_student.email, 'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_set_password(
  p_nim TEXT,
  p_password TEXT,
  p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_activation_code, p_course_slug, p_period_id);
$$;

REVOKE ALL ON FUNCTION private.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.student_auth_issue_activation_code(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_issue_activation_code(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

-- The remedial re-upload path is stable while a rejected file is replaced.
-- Restrict Storage UPDATE to that student's own remedial row and live deadline.
DROP POLICY IF EXISTS "Students replace own remedial files" ON storage.objects;
CREATE POLICY "Students replace own remedial files"
  ON storage.objects FOR UPDATE TO anon
  USING (
    bucket_id = 'submissions'
    AND split_part(name, '/', 4) = 'remedial'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1 FROM public.remedial_assignments r
      WHERE r.id::TEXT = split_part(name, '/', 5)
        AND r.period_id::TEXT = split_part(name, '/', 2)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.submission_storage_path = objects.name
        AND r.status = 'BELUM_LULUS'
        AND r.deadline > NOW()
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND split_part(name, '/', 4) = 'remedial'
    AND split_part(name, '/', 3) = private.current_student_id(split_part(name, '/', 2)::UUID)::TEXT
    AND EXISTS (
      SELECT 1 FROM public.remedial_assignments r
      WHERE r.id::TEXT = split_part(name, '/', 5)
        AND r.period_id::TEXT = split_part(name, '/', 2)
        AND r.student_id = private.current_student_id(r.period_id)
        AND r.submission_storage_path = objects.name
        AND r.status = 'BELUM_LULUS'
        AND r.deadline > NOW()
    )
  );

-- Persist only a private Storage path as the remedial locator. Signed URLs are
-- generated after the row is saved, when the owner-scoped read policy applies.
CREATE OR REPLACE FUNCTION public.protect_student_owned_row_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_course_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'practice_participants' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.period_id IS DISTINCT FROM OLD.period_id
      OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at
      OR NEW.progress_status IS DISTINCT FROM (CASE
        WHEN OLD.progress_status IN ('ASSESSED', 'PUBLISHED') THEN OLD.progress_status
        ELSE 'PROJECT_SUBMITTED'
      END)
      OR NEW.final_project_feedback IS DISTINCT FROM OLD.final_project_feedback
      OR OLD.final_project_review_status = 'ACCEPTED'
      OR NEW.final_project_confirmed IS DISTINCT FROM TRUE
      OR NEW.final_project_review_status IS DISTINCT FROM 'SUBMITTED'
      OR NEW.final_project_url IS NULL
      OR NEW.final_project_url !~ '^https://drive[.]google[.]com/'
      OR NEW.final_project_submitted_at IS NULL THEN
      RAISE EXCEPTION 'Mahasiswa hanya dapat mengirim tautan proyek miliknya sendiri.';
    END IF;
  ELSIF TG_TABLE_NAME = 'remedial_assignments' THEN
    SELECT course_id INTO v_course_id FROM public.practice_periods WHERE id = NEW.period_id;
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.period_id IS DISTINCT FROM OLD.period_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.deadline IS DISTINCT FROM OLD.deadline
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.status <> 'SUBMITTED'
      OR OLD.status NOT IN ('PENDING_SUBMISSION', 'BELUM_LULUS')
      OR NEW.submission_file_name IS NULL
      OR NEW.submitted_at IS NULL
      OR NEW.submission_storage_path IS NULL
      OR v_course_id IS NULL
      OR NEW.submission_storage_path NOT LIKE v_course_id::TEXT || '/' || NEW.period_id::TEXT || '/' || NEW.student_id::TEXT || '/remedial/' || NEW.id::TEXT || '/%'
      OR NEW.submission_file_url IS NULL THEN
      RAISE EXCEPTION 'Mahasiswa hanya dapat mengirim berkas remedial miliknya sendiri.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Tabel ini tidak mendukung perubahan oleh mahasiswa.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_student_owned_row_updates() FROM PUBLIC, anon, authenticated;

-- Scrub legacy public JSON copies of quizzes. The normalized tables retain the
-- answer keys; learning_materials.content_text remains safe for anon reads.
UPDATE public.learning_materials
SET content_text = NULL
WHERE type = 'QUIZ'
  AND left(coalesce(content_text, ''), length('__POLIWAKO_QUIZ_V1__')) = '__POLIWAKO_QUIZ_V1__';

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925061530_add_student_program_name_to_auth_lookup.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925063500_add_session_scoped_student_enrollment_rpc.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Read the student's enrollment from the primary database using the
-- server-issued, period-scoped bearer session. No client-supplied student ID
-- participates in the authorization decision.
CREATE OR REPLACE FUNCTION public.student_list_course_enrollments(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  period_id UUID,
  student_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
  SELECT participant.id, participant.period_id, participant.student_id
  FROM private.student_sessions AS session
  JOIN public.practice_participants AS participant
    ON participant.student_id = session.student_id
    AND participant.period_id = session.period_id
  WHERE session.token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND session.revoked_at IS NULL
    AND session.expires_at > NOW();
$$;

REVOKE ALL ON FUNCTION public.student_list_course_enrollments(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_course_enrollments(TEXT)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925064000_expand_session_scoped_student_enrollment.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Let a verified student session discover all of that student's published
-- course enrollments. The session token remains the only identity proof.
DROP FUNCTION IF EXISTS public.student_list_course_enrollments(TEXT);

CREATE OR REPLACE FUNCTION public.student_list_course_enrollments(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  period_id UUID,
  student_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
  SELECT participant.id, participant.period_id, participant.student_id
  FROM private.student_sessions AS session
  JOIN public.practice_participants AS participant
    ON participant.student_id = session.student_id
  JOIN public.practice_periods AS period
    ON period.id = participant.period_id
  JOIN public.courses AS course
    ON course.id = period.course_id
  WHERE session.token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND session.revoked_at IS NULL
    AND session.expires_at > NOW()
    AND course.status = 'PUBLISHED';
$$;

REVOKE ALL ON FUNCTION public.student_list_course_enrollments(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_course_enrollments(TEXT)
  TO anon, authenticated;

-- A student may switch only to a period in which the token owner is enrolled.
-- The returned capability is newly scoped to that requested period.
CREATE OR REPLACE FUNCTION public.student_create_period_session(
  p_session_token TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student_id UUID;
  v_session_token TEXT;
BEGIN
  SELECT student_id INTO v_student_id
  FROM private.student_sessions
  WHERE token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND revoked_at IS NULL
    AND expires_at > NOW()
  LIMIT 1;

  IF v_student_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.practice_participants AS participant
    JOIN public.practice_periods AS period ON period.id = participant.period_id
    JOIN public.courses AS course ON course.id = period.course_id
    WHERE participant.student_id = v_student_id
      AND participant.period_id = p_period_id
      AND course.slug = p_course_slug
      AND course.status = 'PUBLISHED'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mata kuliah atau periode tidak terdaftar.');
  END IF;

  v_session_token := private.issue_student_session(v_student_id, p_period_id);
  RETURN jsonb_build_object('success', TRUE, 'sessionToken', v_session_token);
END;
$$;

REVOKE ALL ON FUNCTION public.student_create_period_session(TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_create_period_session(TEXT, TEXT, UUID)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925065000_hide_student_session_definers.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Keep privileged session logic inside the non-API private schema. Public RPC
-- entry points remain invoker functions and expose only token-scoped results.
CREATE OR REPLACE FUNCTION private.student_list_course_enrollments(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  period_id UUID,
  student_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
  SELECT participant.id, participant.period_id, participant.student_id
  FROM private.student_sessions AS session
  JOIN public.practice_participants AS participant
    ON participant.student_id = session.student_id
  JOIN public.practice_periods AS period
    ON period.id = participant.period_id
  JOIN public.courses AS course
    ON course.id = period.course_id
  WHERE session.token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND session.revoked_at IS NULL
    AND session.expires_at > NOW()
    AND course.status = 'PUBLISHED';
$$;

CREATE OR REPLACE FUNCTION private.student_create_period_session(
  p_session_token TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student_id UUID;
  v_session_token TEXT;
BEGIN
  SELECT student_id INTO v_student_id
  FROM private.student_sessions
  WHERE token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND revoked_at IS NULL
    AND expires_at > NOW()
  LIMIT 1;

  IF v_student_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.practice_participants AS participant
    JOIN public.practice_periods AS period ON period.id = participant.period_id
    JOIN public.courses AS course ON course.id = period.course_id
    WHERE participant.student_id = v_student_id
      AND participant.period_id = p_period_id
      AND course.slug = p_course_slug
      AND course.status = 'PUBLISHED'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mata kuliah atau periode tidak terdaftar.');
  END IF;

  v_session_token := private.issue_student_session(v_student_id, p_period_id);
  RETURN jsonb_build_object('success', TRUE, 'sessionToken', v_session_token);
END;
$$;

REVOKE ALL ON FUNCTION private.student_list_course_enrollments(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.student_create_period_session(TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_list_course_enrollments(TEXT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_create_period_session(TEXT, TEXT, UUID)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_list_course_enrollments(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  period_id UUID,
  student_id UUID
)
LANGUAGE SQL
STABLE
SET search_path = public, private, pg_temp
AS $$
  SELECT * FROM private.student_list_course_enrollments(p_session_token);
$$;

CREATE OR REPLACE FUNCTION public.student_create_period_session(
  p_session_token TEXT,
  p_course_slug TEXT,
  p_period_id UUID
)
RETURNS JSONB
LANGUAGE SQL
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_create_period_session(p_session_token, p_course_slug, p_period_id);
$$;

REVOKE ALL ON FUNCTION public.student_list_course_enrollments(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_create_period_session(TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_course_enrollments(TEXT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_create_period_session(TEXT, TEXT, UUID)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925070000_restore_student_session_profile.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Restore the signed-in student's profile after a refresh using only the
-- valid server session token; the client cannot choose another student ID.
CREATE OR REPLACE FUNCTION private.student_restore_session_profile(
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
  SELECT jsonb_build_object(
    'success', TRUE,
    'student', jsonb_build_object(
      'id', student.id,
      'nim', student.nim,
      'name', student.name,
      'className', student.class_name,
      'email', student.email,
      'createdAt', student.created_at
    )
  )
  FROM private.student_sessions AS session
  JOIN public.students AS student ON student.id = session.student_id
  WHERE session.token_hash = encode(
      digest(NULLIF(BTRIM(p_session_token), ''), 'sha256'),
      'hex'
    )
    AND session.revoked_at IS NULL
    AND session.expires_at > NOW()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.student_restore_session_profile(
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE SQL
SET search_path = public, private, pg_temp
AS $$
  SELECT COALESCE(
    private.student_restore_session_profile(p_session_token),
    jsonb_build_object('success', FALSE)
  );
$$;

REVOKE ALL ON FUNCTION private.student_restore_session_profile(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_restore_session_profile(TEXT)
  TO anon, authenticated;
REVOKE ALL ON FUNCTION public.student_restore_session_profile(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_restore_session_profile(TEXT)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260925102627_customizable_quality_components.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260929060450_fix_student_submission_storage_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261008021501_student_password_without_activation_code.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Enrolled students create their first password directly after NIM lookup.
-- Existing passwords can only be cleared by an authorized course instructor.
CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_nim TEXT,
  p_password TEXT,
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
  v_session_token TEXT;
BEGIN
  IF length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password minimal 8 karakter dan maksimal 72 byte.');
  END IF;

  -- Serialize attempts so two callers cannot overwrite a newly created password.
  SELECT * INTO v_student
  FROM public.students
  WHERE lower(trim(nim)) = lower(trim(p_nim))
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'NIM tidak ditemukan.');
  END IF;
  IF coalesce(v_student.password_hash, '') <> '' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password akun ini sudah pernah dibuat. Silakan gunakan login password.');
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
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada periode praktik ini.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = NOW()
  WHERE id = v_student.id;
  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;
  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;
  v_session_token := private.issue_student_session(v_student.id, v_period_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Password berhasil dibuat.',
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id, 'nim', v_student.nim, 'name', v_student.name,
      'className', v_student.class_name, 'email', v_student.email, 'createdAt', v_student.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_set_password(
  p_nim TEXT,
  p_password TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_course_slug, p_period_id);
$$;

-- Older clients may still send the former code argument. Both signatures use
-- the same first-password-only guard; a code can no longer replace a password.
CREATE OR REPLACE FUNCTION private.student_auth_set_password(
  p_nim TEXT, p_password TEXT, p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL, p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_course_slug, p_period_id);
$$;

CREATE OR REPLACE FUNCTION public.student_auth_set_password(
  p_nim TEXT, p_password TEXT, p_activation_code TEXT,
  p_course_slug TEXT DEFAULT NULL, p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_set_password(p_nim, p_password, p_course_slug, p_period_id);
$$;

CREATE OR REPLACE FUNCTION private.student_auth_reset_password(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesi instruktur diperlukan untuk mereset password.';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.practice_participants pp
    JOIN public.practice_periods p ON p.id = pp.period_id
    WHERE pp.student_id = v_student.id AND public.is_course_owner(p.course_id)
  ) THEN
    RAISE EXCEPTION 'Instruktur tidak berwenang mengelola akun mahasiswa ini.';
  END IF;

  UPDATE public.students SET password_hash = NULL, updated_at = NOW() WHERE id = v_student.id;
  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;
  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Password direset. Mahasiswa dapat langsung membuat password baru.');
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_reset_password(p_student_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_reset_password(p_student_id);
$$;

REVOKE ALL ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_set_password(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION private.student_auth_reset_password(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_reset_password(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_reset_password(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_reset_password(UUID) TO authenticated;

-- Retain historical records while retiring code issuance from the API.
REVOKE ALL ON FUNCTION private.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_issue_activation_code(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012073840_preserve_instructor_profile_on_google_link.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Preserve the existing instructor profile when Supabase links a verified
-- Google identity to the same auth.users row by matching email.
CREATE OR REPLACE FUNCTION public.handle_new_instructor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_department TEXT;
  v_nip TEXT;
  v_avatar_url TEXT;
BEGIN
  IF lower(COALESCE(NEW.email, '')) NOT LIKE '%@politekniksorowako.ac.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya akun email @politekniksorowako.ac.id yang diizinkan.';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );
  v_department := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Teknik Mesin');
  v_nip := NULLIF(NEW.raw_user_meta_data->>'nip', '');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
  VALUES (NEW.id, lower(NEW.email), v_name, v_nip, v_department, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012074024_restrict_instructor_trigger_rpc.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

REVOKE EXECUTE ON FUNCTION public.handle_new_instructor() FROM PUBLIC;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012074108_revoke_instructor_trigger_role_grants.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

REVOKE EXECUTE ON FUNCTION public.handle_new_instructor() FROM anon, authenticated;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012091111_student_google_workspace_login.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

CREATE OR REPLACE FUNCTION private.student_google_login(
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_provider TEXT;
  v_providers JSONB;
  v_student public.students%ROWTYPE;
  v_student_id UUID;
  v_period_id UUID;
  v_course_slug TEXT;
  v_session_token TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Sesi Google tidak valid. Silakan masuk kembali.');
  END IF;

  SELECT lower(trim(u.email)), lower(COALESCE(u.raw_app_meta_data->>'provider', '')),
         u.raw_app_meta_data->'providers'
  INTO v_email, v_provider, v_providers
  FROM auth.users AS u
  WHERE u.id = v_user_id
    AND u.email_confirmed_at IS NOT NULL;

  IF v_email IS NULL
     OR split_part(v_email, '@', 2) <> 'politekniksorowako.ac.id'
     OR NOT (v_provider = 'google' OR COALESCE(v_providers ? 'google', FALSE)) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Gunakan akun Google Politeknik Sorowako dengan email NIM@politekniksorowako.ac.id.');
  END IF;

  SELECT student.id,
         period.id,
         course.slug
  INTO v_student_id, v_period_id, v_course_slug
  FROM public.students AS student
  JOIN public.practice_participants AS participant
    ON participant.student_id = student.id
  JOIN public.practice_periods AS period
    ON period.id = participant.period_id
  JOIN public.courses AS course
    ON course.id = period.course_id
  WHERE lower(trim(student.nim)) = split_part(v_email, '@', 1)
    AND course.status = 'PUBLISHED'
    AND (NULLIF(trim(p_course_slug), '') IS NULL OR course.slug = trim(p_course_slug))
    AND (p_period_id IS NULL OR period.id = p_period_id)
  ORDER BY
    CASE period.status WHEN 'ACTIVE' THEN 0 WHEN 'UPCOMING' THEN 1 ELSE 2 END,
    CASE WHEN period.status = 'UPCOMING' THEN period.start_date END ASC,
    period.start_date DESC,
    period.created_at DESC
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Email belum cocok dengan NIM mahasiswa yang terdaftar pada periode praktik aktif.');
  END IF;

  SELECT * INTO v_student
  FROM public.students AS student
  WHERE student.id = v_student_id;

  v_session_token := private.issue_student_session(v_student.id, v_period_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Login berhasil.',
    'periodId', v_period_id,
    'courseSlug', v_course_slug,
    'sessionToken', v_session_token,
    'student', jsonb_build_object(
      'id', v_student.id,
      'nim', v_student.nim,
      'name', v_student.name,
      'className', v_student.class_name,
      'email', v_email,
      'hasCreatedPassword', COALESCE(v_student.password_hash, '') <> '',
      'createdAt', v_student.created_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.student_google_login(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.student_google_login(TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.student_google_login(
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_google_login(p_course_slug, p_period_id);
$$;

REVOKE ALL ON FUNCTION public.student_google_login(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_google_login(TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_instructor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_department TEXT;
  v_nip TEXT;
  v_avatar_url TEXT;
BEGIN
  IF lower(COALESCE(NEW.email, '')) NOT LIKE '%@politekniksorowako.ac.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya akun email @politekniksorowako.ac.id yang diizinkan.';
  END IF;

  IF split_part(lower(trim(NEW.email)), '@', 2) = 'politekniksorowako.ac.id'
     AND EXISTS (
       SELECT 1
       FROM public.students AS student
       WHERE lower(trim(student.nim)) = split_part(lower(trim(NEW.email)), '@', 1)
     ) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );
  v_department := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Teknik Mesin');
  v_nip := NULLIF(NEW.raw_user_meta_data->>'nip', '');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
  VALUES (NEW.id, lower(NEW.email), v_name, v_nip, v_department, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012093043_student_email_password_reset.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

DROP FUNCTION IF EXISTS public.student_google_login(TEXT, UUID);
DROP FUNCTION IF EXISTS private.student_google_login(TEXT, UUID);

CREATE OR REPLACE FUNCTION private.student_auth_reset_own_password(p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_student public.students%ROWTYPE;
  v_student_count BIGINT;
  v_amr JSONB := auth.jwt()->'amr';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Sesi reset email tidak ditemukan.');
  END IF;

  IF length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password minimal 8 karakter dan maksimal 72 byte.');
  END IF;

  SELECT lower(trim(u.email)) INTO v_email
  FROM auth.users AS u
  WHERE u.id = v_user_id
    AND u.email_confirmed_at IS NOT NULL
    AND lower(trim(u.email)) = lower(trim(auth.jwt()->>'email'));

  IF v_email IS NULL OR split_part(v_email, '@', 2) <> 'politekniksorowako.ac.id' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Email reset resmi mahasiswa tidak terverifikasi.');
  END IF;

  IF jsonb_typeof(v_amr) IS DISTINCT FROM 'array' OR NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_amr) = 'array' THEN v_amr ELSE '[]'::jsonb END) AS auth_method
    WHERE auth_method->>'method' IN ('otp', 'magiclink')
      AND (auth_method->>'timestamp') ~ '^[0-9]+$'
      AND (auth_method->>'timestamp')::numeric >= extract(epoch FROM now() - interval '15 minutes')
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Silakan gunakan tautan reset email yang baru dikirim.');
  END IF;

  SELECT count(*) INTO v_student_count
  FROM public.students AS student
  WHERE lower(trim(student.nim)) = split_part(v_email, '@', 1)
    AND coalesce(student.password_hash, '') <> ''
    AND EXISTS (
      SELECT 1 FROM public.practice_participants AS participant
      WHERE participant.student_id = student.id
    );

  IF v_student_count <> 1 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Akun mahasiswa dengan email tersebut tidak ditemukan atau tidak unik.');
  END IF;

  SELECT * INTO v_student
  FROM public.students AS student
  WHERE lower(trim(student.nim)) = split_part(v_email, '@', 1)
    AND coalesce(student.password_hash, '') <> ''
    AND EXISTS (
      SELECT 1 FROM public.practice_participants AS participant
      WHERE participant.student_id = student.id
    )
  FOR UPDATE;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = NOW()
  WHERE id = v_student.id;

  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;

  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND consumed_at IS NULL AND revoked_at IS NULL;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Password berhasil direset.');
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_reset_own_password(p_password TEXT)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_reset_own_password(p_password);
$$;

REVOKE ALL ON FUNCTION private.student_auth_reset_own_password(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_reset_own_password(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_reset_own_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_reset_own_password(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012095729_student_admin_password_reset_tokens.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

DROP FUNCTION IF EXISTS public.student_auth_reset_own_password(TEXT);
DROP FUNCTION IF EXISTS private.student_auth_reset_own_password(TEXT);
DROP FUNCTION IF EXISTS public.student_auth_reset_password(UUID);
DROP FUNCTION IF EXISTS private.student_auth_reset_password(UUID);

CREATE OR REPLACE FUNCTION private.student_auth_issue_password_reset_token(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_token TEXT := upper(encode(gen_random_bytes(12), 'hex'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesi instruktur diperlukan untuk menerbitkan token reset.';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.practice_participants pp
    JOIN public.practice_periods p ON p.id = pp.period_id
    WHERE pp.student_id = v_student.id
      AND public.is_course_owner(p.course_id)
  ) THEN
    RAISE EXCEPTION 'Instruktur tidak berwenang mengelola akun mahasiswa ini.';
  END IF;

  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id
    AND purpose = 'PASSWORD_RESET'
    AND consumed_at IS NULL
    AND revoked_at IS NULL;

  INSERT INTO private.student_activation_codes(
    student_id, token_hash, purpose, created_by, expires_at
  ) VALUES (
    v_student.id,
    encode(digest(v_token, 'sha256'), 'hex'),
    'PASSWORD_RESET',
    auth.uid(),
    NOW() + INTERVAL '24 hours'
  );

  RETURN jsonb_build_object('success', TRUE, 'token', v_token, 'expiresInHours', 24);
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_issue_password_reset_token(p_student_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_issue_password_reset_token(p_student_id);
$$;

CREATE OR REPLACE FUNCTION private.student_auth_reset_password_with_token(
  p_nim TEXT,
  p_token TEXT,
  p_password TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_reset private.student_activation_codes%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_period_id UUID;
BEGIN
  IF octet_length(trim(coalesce(p_password, ''))) < 8
    OR octet_length(trim(coalesce(p_password, ''))) > 72 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Password minimal 8 karakter dan maksimal 72 byte.');
  END IF;
  IF length(trim(coalesce(p_token, ''))) <> 24 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Token reset tidak valid atau kedaluwarsa.');
  END IF;

  SELECT * INTO v_reset
  FROM private.student_activation_codes
  WHERE token_hash = encode(digest(upper(trim(p_token)), 'sha256'), 'hex')
    AND purpose = 'PASSWORD_RESET'
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND failed_attempts < 5
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Token reset tidak valid atau kedaluwarsa. Minta token baru kepada instruktur.');
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = v_reset.student_id
  FOR UPDATE;
  IF NOT FOUND OR lower(trim(v_student.nim)) <> lower(trim(coalesce(p_nim, ''))) THEN
    UPDATE private.student_activation_codes
    SET failed_attempts = failed_attempts + 1,
        revoked_at = CASE WHEN failed_attempts >= 4 THEN NOW() ELSE revoked_at END
    WHERE id = v_reset.id;
    RETURN jsonb_build_object('success', FALSE, 'message', 'NIM atau token reset tidak cocok.');
  END IF;

  SELECT pp.period_id INTO v_period_id
  FROM public.practice_participants pp
  JOIN public.practice_periods p ON p.id = pp.period_id
  JOIN public.courses c ON c.id = p.course_id
  WHERE pp.student_id = v_student.id
    AND (p_course_slug IS NULL OR c.slug = p_course_slug)
    AND (p_period_id IS NULL OR p.id = p_period_id)
  ORDER BY (p.status = 'ACTIVE') DESC, p.period_number ASC
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Mahasiswa belum terdaftar pada periode praktik ini.');
  END IF;

  UPDATE public.students
  SET password_hash = crypt(trim(p_password), gen_salt('bf')), updated_at = NOW()
  WHERE id = v_student.id;
  UPDATE private.student_activation_codes
  SET consumed_at = NOW()
  WHERE id = v_reset.id;
  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id
    AND id <> v_reset.id
    AND consumed_at IS NULL
    AND revoked_at IS NULL;
  UPDATE private.student_sessions
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id AND revoked_at IS NULL;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Password berhasil diperbarui.');
END;
$$;

CREATE OR REPLACE FUNCTION public.student_auth_reset_password_with_token(
  p_nim TEXT,
  p_token TEXT,
  p_password TEXT,
  p_course_slug TEXT DEFAULT NULL,
  p_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.student_auth_reset_password_with_token(p_nim, p_token, p_password, p_course_slug, p_period_id);
$$;

REVOKE ALL ON FUNCTION private.student_auth_issue_password_reset_token(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_issue_password_reset_token(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_issue_password_reset_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_issue_password_reset_token(UUID) TO authenticated;

REVOKE ALL ON FUNCTION private.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_auth_reset_password_with_token(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012100324_admin_student_database_controls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS user_account
    WHERE user_account.id = (SELECT auth.uid())
      AND lower(user_account.email) = 'rezaf@politekniksorowako.ac.id'
      AND user_account.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_system_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;

DROP POLICY IF EXISTS "Authenticated instructors add students" ON public.students;
DROP POLICY IF EXISTS "System admins add students" ON public.students;
CREATE POLICY "System admins add students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS "Authenticated instructors delete students" ON public.students;
DROP POLICY IF EXISTS "System admins delete students" ON public.students;
CREATE POLICY "System admins delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (public.is_system_admin());

CREATE OR REPLACE FUNCTION private.student_auth_issue_password_reset_token(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_token TEXT := upper(encode(gen_random_bytes(12), 'hex'));
BEGIN
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menerbitkan token reset password.';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;

  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id
    AND purpose = 'PASSWORD_RESET'
    AND consumed_at IS NULL
    AND revoked_at IS NULL;

  INSERT INTO private.student_activation_codes(
    student_id, token_hash, purpose, created_by, expires_at
  ) VALUES (
    v_student.id,
    encode(digest(v_token, 'sha256'), 'hex'),
    'PASSWORD_RESET',
    auth.uid(),
    NOW() + INTERVAL '24 hours'
  );

  RETURN jsonb_build_object('success', TRUE, 'token', v_token, 'expiresInHours', 24);
END;
$$;

NOTIFY pgrst, 'reload schema';



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012100507_private_student_admin_authorization.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

DROP POLICY IF EXISTS "System admins add students" ON public.students;
DROP POLICY IF EXISTS "System admins delete students" ON public.students;
DROP FUNCTION IF EXISTS public.is_system_admin();

CREATE OR REPLACE FUNCTION private.is_system_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS user_account
    WHERE user_account.id = (SELECT auth.uid())
      AND lower(user_account.email) = 'rezaf@politekniksorowako.ac.id'
      AND user_account.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION private.is_system_admin() FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_system_admin() TO authenticated;

CREATE POLICY "System admins add students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (private.is_system_admin());

CREATE POLICY "System admins delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (private.is_system_admin());

CREATE OR REPLACE FUNCTION private.student_auth_issue_password_reset_token(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_token TEXT := upper(encode(gen_random_bytes(12), 'hex'));
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menerbitkan token reset password.';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mahasiswa tidak ditemukan.'; END IF;

  UPDATE private.student_activation_codes
  SET revoked_at = COALESCE(revoked_at, NOW())
  WHERE student_id = v_student.id
    AND purpose = 'PASSWORD_RESET'
    AND consumed_at IS NULL
    AND revoked_at IS NULL;

  INSERT INTO private.student_activation_codes(
    student_id, token_hash, purpose, created_by, expires_at
  ) VALUES (
    v_student.id,
    encode(digest(v_token, 'sha256'), 'hex'),
    'PASSWORD_RESET',
    auth.uid(),
    NOW() + INTERVAL '24 hours'
  );

  RETURN jsonb_build_object('success', TRUE, 'token', v_token, 'expiresInHours', 24);
END;
$$;

NOTIFY pgrst, 'reload schema';



-- ====================================================================
-- SEED DATA: supabase/seed_real_account.sql
-- ====================================================================

-- ====================================================================
-- SEED SCRIPT: Akun Instruktur Real & Storage Configuration
-- Akun: rezaf@politekniksorowako.ac.id
-- Password: 732401#Jhe
-- ====================================================================

-- 1. Pastikan ekstensi pgcrypto aktif untuk enkripsi password bcrypt
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    existing_user_id UUID;
BEGIN
    -- Cek apakah user sudah ada di auth.users
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF existing_user_id IS NULL THEN
        -- Insert user baru ke auth.users Supabase dengan password terenkripsi bcrypt
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            role,
            aud,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'rezaf@politekniksorowako.ac.id',
            crypt('732401#Jhe', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"M. Reza Firmansyah","department":"Teknik Mesin"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );

        -- Insert ke public.profiles
        INSERT INTO public.profiles (
            id,
            email,
            name,
            nip,
            department,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            'rezaf@politekniksorowako.ac.id',
            'M. Reza Firmansyah',
            '198709122015041002',
            'Teknik Mesin',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            updated_at = NOW();

        RAISE NOTICE 'Akun instruktur rezaf@politekniksorowako.ac.id berhasil dibuat dengan ID %', new_user_id;
    ELSE
        -- Update password dan profil jika user sudah pernah terdaftar
        UPDATE auth.users
        SET encrypted_password = crypt('732401#Jhe', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = existing_user_id;

        INSERT INTO public.profiles (
            id,
            email,
            name,
            nip,
            department,
            created_at,
            updated_at
        ) VALUES (
            existing_user_id,
            'rezaf@politekniksorowako.ac.id',
            'M. Reza Firmansyah',
            '198709122015041002',
            'Teknik Mesin',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            updated_at = NOW();

        RAISE NOTICE 'Akun instruktur rezaf@politekniksorowako.ac.id berhasil diperbarui (ID: %)', existing_user_id;
    END IF;
END $$;

-- ====================================================================
-- 2. KONFIGURASI STORAGE BUCKET UNTUK TUGAS PDF
-- PRD Reference: Section 42, 43, 83 (Internal PDF Submission Only)
-- ====================================================================

-- Bucket 'submissions' untuk pengumpulan tugas mahasiswa (Private, semua format, max 50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'submissions',
    'submissions',
    FALSE,
    52428800, -- 50MB
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 52428800,
    allowed_mime_types = NULL;

-- Bucket 'materials' untuk materi kuliah dan instruksi (Public-read, max 50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'materials',
    'materials',
    TRUE,
    52428800, -- 50MB
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 52428800;

-- ====================================================================
-- 3. POLICIES STORAGE BUCKET SUBMISSIONS
-- ====================================================================

-- Instruktur memiliki akses penuh (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Instructors full access to submissions'
    ) THEN
        CREATE POLICY "Instructors full access to submissions"
        ON storage.objects FOR ALL
        TO authenticated
        USING (bucket_id = 'submissions')
        WITH CHECK (
            bucket_id = 'submissions' AND
            EXISTS (
                SELECT 1 FROM public.assignments a
                WHERE a.id = (split_part(name, '/', 5))::uuid
                  AND a.deadline > NOW()
            )
        );
    END IF;
END $$;

-- Mahasiswa dapat mengunggah semua jenis file tugas sebelum deadline
DROP POLICY IF EXISTS "Students upload PDF to submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students upload files to submissions" ON storage.objects;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Students upload submission files'
    ) THEN
        CREATE POLICY "Students upload submission files"
        ON storage.objects FOR INSERT
        TO anon, authenticated
        WITH CHECK (
            bucket_id = 'submissions' AND
            EXISTS (
                SELECT 1 FROM public.assignments a
                WHERE a.id = (split_part(name, '/', 5))::uuid
                  AND a.deadline > NOW()
            )
        );
    END IF;
END $$;

-- Mahasiswa dapat membaca submission melalui Signed URL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Students view submission via signed URL'
    ) THEN
        CREATE POLICY "Students view submission via signed URL"
        ON storage.objects FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'submissions');
    END IF;
END $$;



-- ====================================================================
-- SEED DATA: supabase/seed_cad_1_1.sql
-- ====================================================================

-- ====================================================================
-- SEED SCRIPT: Mata Kuliah CAD 1.1 & 36 Mahasiswa Real Kelas 1C
-- Instruktur: rezaf@politekniksorowako.ac.id (Reza Febriadi Rauf)
-- Program Studi: Rekayasa Perancangan Mekanik
-- Politeknik Sorowako - Semester Gasal 2026/2027
-- ====================================================================

DO $$
DECLARE
    v_instructor_id UUID;
    v_course_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000001'::UUID;
    v_cpmk1_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000101'::UUID;
    v_cpmk2_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000102'::UUID;
    v_cpmk3_id UUID := 'a1b2c3d4-cad1-4000-8000-000000000103'::UUID;
    
    v_per1_id UUID := 'b1b2c3d4-cad1-4000-8000-000000000201'::UUID;
    v_per2_id UUID := 'b1b2c3d4-cad1-4000-8000-000000000202'::UUID;
    v_per3_id UUID := 'b1b2c3d4-cad1-4000-8000-000000000203'::UUID;
BEGIN
    -- 1. Cari atau buat profile instruktur
    SELECT id INTO v_instructor_id
    FROM public.profiles
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF v_instructor_id IS NULL THEN
        -- Cek auth.users jika profile belum dibuat
        SELECT id INTO v_instructor_id
        FROM auth.users
        WHERE email = 'rezaf@politekniksorowako.ac.id';

        IF v_instructor_id IS NULL THEN
            v_instructor_id := gen_random_uuid();
            -- Insert auth.users
            INSERT INTO auth.users (
                id, instance_id, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
            ) VALUES (
                v_instructor_id, '00000000-0000-0000-0000-000000000000', 'rezaf@politekniksorowako.ac.id',
                crypt('732401#Jhe', gen_salt('bf')), NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                '{"name":"Reza Febriadi Rauf","department":"Rekayasa Perancangan Mekanik"}'::jsonb,
                'authenticated', 'authenticated', NOW(), NOW()
            );
        END IF;

        -- Pastikan profile ada
        INSERT INTO public.profiles (id, email, name, nip, department, created_at, updated_at)
        VALUES (
            v_instructor_id,
            'rezaf@politekniksorowako.ac.id',
            'Reza Febriadi Rauf',
            '198709122015041002',
            'Rekayasa Perancangan Mekanik',
            NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            department = EXCLUDED.department;
    ELSE
        UPDATE public.profiles
        SET name = 'Reza Febriadi Rauf',
            department = 'Rekayasa Perancangan Mekanik'
        WHERE id = v_instructor_id;
    END IF;


    -- ====================================================================
    -- 2. INSERT 36 MAHASISWA REAL KELAS 1C
    -- ====================================================================
    INSERT INTO public.students (instructor_id, nim, name, class_name)
    VALUES
        (v_instructor_id, '22603001', 'Achmad Fawzan', '1C'),
        (v_instructor_id, '22603002', 'Ade Meilan Alifia Sulaeman', '1C'),
        (v_instructor_id, '22603003', 'Affan Farsyah', '1C'),
        (v_instructor_id, '22603004', 'Afiqah Azwa Safrina', '1C'),
        (v_instructor_id, '22603005', 'Andika Azis', '1C'),
        (v_instructor_id, '22603006', 'Anesya Nurhawizah', '1C'),
        (v_instructor_id, '22603007', 'Ayu Anugrah', '1C'),
        (v_instructor_id, '22603008', 'Ayu Irmayanti', '1C'),
        (v_instructor_id, '22603009', 'Bunga Cahya Putri Jenal', '1C'),
        (v_instructor_id, '22603010', 'Daniel Adlan Sura Parinding', '1C'),
        (v_instructor_id, '22603011', 'Dede Irawan', '1C'),
        (v_instructor_id, '22603012', 'Falya Aisyah Naswah', '1C'),
        (v_instructor_id, '22603013', 'Haura Hafizhah', '1C'),
        (v_instructor_id, '22603014', 'Juan Farand', '1C'),
        (v_instructor_id, '22603015', 'Khumaira Khaerunnisa', '1C'),
        (v_instructor_id, '22603016', 'M. Fauzan Adhitya Pratama H', '1C'),
        (v_instructor_id, '22603017', 'Muh. Anugrah Sesar', '1C'),
        (v_instructor_id, '22603018', 'Muh. Diaz Raditya B.', '1C'),
        (v_instructor_id, '22603019', 'Muh. Fakhrul Al Farezqy Rozadin', '1C'),
        (v_instructor_id, '22603020', 'Muh. Raihan Aryan', '1C'),
        (v_instructor_id, '22603021', 'Muhammad Abyan Zaky', '1C'),
        (v_instructor_id, '22603022', 'Muhammad Agam Haq', '1C'),
        (v_instructor_id, '22603023', 'Muhammad Aidil Ahmadi', '1C'),
        (v_instructor_id, '22603024', 'Nadya Zalzabila', '1C'),
        (v_instructor_id, '22603025', 'Ranita Rosa Putri', '1C'),
        (v_instructor_id, '22603026', 'Rausyan Fikran', '1C'),
        (v_instructor_id, '22603027', 'Rizky Ramadhani A.', '1C'),
        (v_instructor_id, '22603028', 'Rudhi Adhana Zet', '1C'),
        (v_instructor_id, '22603029', 'Salsabila Aprilia Sukardi', '1C'),
        (v_instructor_id, '22603030', 'Saskia Uhti Ramadhani', '1C'),
        (v_instructor_id, '22603031', 'Sayyef Al Islam', '1C'),
        (v_instructor_id, '22603032', 'Tazkia Kausara', '1C'),
        (v_instructor_id, '22603033', 'Wahidatul Hasanah', '1C'),
        (v_instructor_id, '22603034', 'William Gredi Sidwel Alinsky', '1C'),
        (v_instructor_id, '22603035', 'Winda Tri Lestari', '1C'),
        (v_instructor_id, '22603036', 'Yulfikatrin Yuyun', '1C')
    ON CONFLICT (instructor_id, nim) DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name;

    -- ====================================================================
    -- 3. INSERT MATA KULIAH CAD 1.1
    -- ====================================================================
    INSERT INTO public.courses (
        id, instructor_id, name, code, academic_year, semester, slug,
        description, department, status, created_at, updated_at
    ) VALUES (
        v_course_id,
        v_instructor_id,
        'CAD 1.1',
        'CAD1.1',
        '2026/2027',
        'Ganjil',
        'cad-1-1',
        'Praktik perancangan mekanik berbantuan komputer (CAD 1.1) Program Studi Rekayasa Perancangan Mekanik. Meliputi 2D sketching parametrik, pemodelan 3D solid part, assembly komponen mesin, dan drafting gambar kerja standar ISO.',
        'Rekayasa Perancangan Mekanik',
        'PUBLISHED',
        NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        department = EXCLUDED.department,
        description = EXCLUDED.description,
        status = 'PUBLISHED';

    -- ====================================================================
    -- 4. INSERT SUB-CPMK
    -- ====================================================================
    INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
    VALUES
        (v_cpmk1_id, v_course_id, 'Sub-CPMK 1', 'Mampu memahami antarmuka software CAD, navigasi viewport, dan parameter sketching 2D sesuai standar ISO.', 30.00),
        (v_cpmk2_id, v_course_id, 'Sub-CPMK 2', 'Mampu membuat pemodelan part 3D parametrik (Extrude, Revolve, Sweep, Fillet/Chamfer) dengan akurasi dimensi.', 40.00),
        (v_cpmk3_id, v_course_id, 'Sub-CPMK 3', 'Mampu menyusun gambar kerja drafting 2D lengkap dengan proyeksi orthogonal, potongan (section), dan toleransi geometri.', 30.00)
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        weight_percent = EXCLUDED.weight_percent;

    -- ====================================================================
    -- 5. INSERT 3 GELOMBANG PERIODE PRAKTIK CAD 1.1 (Minggu 34, 36, 38)
    -- ====================================================================
    INSERT INTO public.practice_periods (id, course_id, name, period_number, start_date, end_date, status)
    VALUES
        (v_per1_id, v_course_id, 'Gelombang 1 (Minggu 34)', 1, '2026-08-17', '2026-08-21', 'COMPLETED'),
        (v_per2_id, v_course_id, 'Gelombang 2 (Minggu 36)', 2, '2026-08-31', '2026-09-04', 'COMPLETED'),
        (v_per3_id, v_course_id, 'Gelombang 3 (Minggu 38)', 3, '2026-09-14', '2026-09-18', 'UPCOMING')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status;

    -- ====================================================================
    -- 6. ENROLL PESERTA PRAKTIK SESUAI PEMBAGIAN JADWAL RESMI
    -- ====================================================================
    -- Gelombang 1 (Minggu 34): 12 mahasiswa, sesuai PDF
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per1_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22603003', '22603004', '22603006', '22603010', '22603012', '22603015', '22603020', '22603021', '22603025', '22603027', '22603030', '22603035')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 2 (Minggu 36): 12 mahasiswa, sesuai PDF
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per2_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22603001', '22603005', '22603007', '22603011', '22603013', '22603016', '22603018', '22603024', '22603028', '22603031', '22603032', '22603036')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 3 (Minggu 38): 12 mahasiswa, sesuai PDF
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per3_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22603002', '22603008', '22603009', '22603014', '22603017', '22603019', '22603022', '22603023', '22603026', '22603029', '22603033', '22603034')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- ====================================================================
    -- 7. INSERT 5 UNIT PEMBELAJARAN & PENUGASAN CAD 1.1 (Gelombang 2 Active)
    -- ====================================================================
    INSERT INTO public.learning_units (id, period_id, unit_number, title, description)
    VALUES
        ('c1b2c3d4-cad1-4000-8000-000000000301'::UUID, v_per2_id, 1, 'Modul 1: Antarmuka CAD & 2D Sketching Parametrik', 'Pengenalan UI/UX software CAD, origin, planes, constraint dimensi dan geometri dasar.'),
        ('c1b2c3d4-cad1-4000-8000-000000000302'::UUID, v_per2_id, 2, 'Modul 2: Fitur 3D Solid Dasar (Extrude & Revolve)', 'Pembuatan part solid 3D dasar, cut extrude, fillet, chamfer, dan shell feature.'),
        ('c1b2c3d4-cad1-4000-8000-000000000303'::UUID, v_per2_id, 3, 'Modul 3: Pemodelan Kompleks (Sweep, Loft & Pattern)', 'Pemodelan kontur berulang, helical sweep, draft angle, dan circular/linear pattern.'),
        ('c1b2c3d4-cad1-4000-8000-000000000304'::UUID, v_per2_id, 4, 'Modul 4: Assembly Modeling & Standard Fasteners', 'Perakitan komponen multi-part, mate constraints (coincident, concentric, distance), bill of materials.'),
        ('c1b2c3d4-cad1-4000-8000-000000000305'::UUID, v_per2_id, 5, 'Modul 5: 2D Technical Drafting & GD&T ISO', 'Penyusunan etiket gambar, proyeksi orthogonal Amerika/Eropa, section view, dan toleransi geometri ISO.')
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description;

    -- Penugasan Modul
    INSERT INTO public.assignments (period_id, unit_id, title, description, deadline, max_score, allowed_file_type)
    VALUES
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000301'::UUID, 'Tugas Modul 1: Lembar Latihan 2D Sketching', 'Kumpulkan lembar gambar kerja 2D sketching berdimensi presisi dalam format PDF.', NOW() + INTERVAL '7 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000302'::UUID, 'Tugas Modul 2: Pemodelan Part Flange & Shaft', 'Upload laporan hasil pemodelan 3D solid part beserta drawing views PDF.', NOW() + INTERVAL '10 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000303'::UUID, 'Tugas Modul 3: Pemodelan Rotor Impeller', 'Laporan langkah kerja fitur sweep dan pattern pada komponen rotor.', NOW() + INTERVAL '14 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000304'::UUID, 'Tugas Modul 4: Evaluasi Perakitan Gearbox', 'Laporan assembly, cek interferensi part, dan bill of materials (BOM).', NOW() + INTERVAL '18 days', 100, 'PDF'),
        (v_per2_id, 'c1b2c3d4-cad1-4000-8000-000000000305'::UUID, 'Tugas Modul 5: Gambar Kerja Lengkap Etiket & Toleransi ISO', 'Karya akhir gambar kerja 2D standar industri manufaktur dalam format PDF.', NOW() + INTERVAL '21 days', 100, 'PDF')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed CAD 1.1 Berhasil: Course, 36 Mahasiswa Kelas 1C, 3 Gelombang Periode, dan 5 Unit Modul Telah Didaftarkan!';
END $$;




-- ====================================================================
-- SEED DATA: supabase/seed_cad_2_trpf.sql
-- ====================================================================

-- ====================================================================
-- SEED SCRIPT: Mata Kuliah CAD 2 & 36 Mahasiswa Real Kelas 2D - TRPF
-- Instruktur: rezaf@politekniksorowako.ac.id (Reza Febriadi Rauf)
-- Program Studi: Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF)
-- Politeknik Sorowako - Semester Genap 2026/2027
-- ====================================================================

DO $$
DECLARE
    v_instructor_id UUID;
    v_course_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000001'::UUID;
    v_cpmk1_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000101'::UUID;
    v_cpmk2_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000102'::UUID;
    v_cpmk3_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000103'::UUID;
    v_cpmk4_id UUID := 'b2c3d4e5-cad2-4000-8000-000000000104'::UUID;
    
    v_per1_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000201'::UUID;
    v_per2_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000202'::UUID;
    v_per3_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000203'::UUID;
    v_per4_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000204'::UUID;
    v_per5_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000205'::UUID;
    v_per6_id UUID := 'c2b2c3d4-cad2-4000-8000-000000000206'::UUID;

    v_unit1_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000301'::UUID;
    v_unit2_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000302'::UUID;
    v_unit3_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000303'::UUID;
    v_unit4_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000304'::UUID;
    v_unit5_id UUID := 'd2b2c3d4-cad2-4000-8000-000000000305'::UUID;
BEGIN
    -- 1. Cari atau verifikasi profile instruktur
    SELECT id INTO v_instructor_id
    FROM public.profiles
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF v_instructor_id IS NULL THEN
        SELECT id INTO v_instructor_id
        FROM auth.users
        WHERE email = 'rezaf@politekniksorowako.ac.id';

        IF v_instructor_id IS NULL THEN
            v_instructor_id := gen_random_uuid();
            INSERT INTO auth.users (
                id, instance_id, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
            ) VALUES (
                v_instructor_id, '00000000-0000-0000-0000-000000000000', 'rezaf@politekniksorowako.ac.id',
                crypt('732401#Jhe', gen_salt('bf')), NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                '{"name":"Reza Febriadi Rauf","department":"Teknologi Rekayasa Pengelasan dan Fabrikasi"}'::jsonb,
                'authenticated', 'authenticated', NOW(), NOW()
            );
        END IF;

        INSERT INTO public.profiles (id, email, name, nip, department, created_at, updated_at)
        VALUES (
            v_instructor_id,
            'rezaf@politekniksorowako.ac.id',
            'Reza Febriadi Rauf',
            '198709122015041002',
            'Teknologi Rekayasa Pengelasan dan Fabrikasi',
            NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- ====================================================================
    -- 2. INSERT 35 MAHASISWA REAL KELAS 2D - TRPF
    -- ====================================================================
    INSERT INTO public.students (instructor_id, nim, name, class_name)
    VALUES
        (v_instructor_id, '22502001', 'A. Kireyna Riyadhul Jinan', '2D - TRPF'),
        (v_instructor_id, '22502002', 'A. Muh. Akbar Al Rasyid', '2D - TRPF'),
        (v_instructor_id, '22502003', 'Ahmad Ghufron Muhtadin', '2D - TRPF'),
        (v_instructor_id, '22502004', 'Ahmad Roqib Abdillah', '2D - TRPF'),
        (v_instructor_id, '22502005', 'Akmal Lasampa', '2D - TRPF'),
        (v_instructor_id, '22502006', 'Almulqi Naftaly Mahbub', '2D - TRPF'),
        (v_instructor_id, '22502007', 'Amarillah Achyar', '2D - TRPF'),
        (v_instructor_id, '22502008', 'Anriansa', '2D - TRPF'),
        (v_instructor_id, '22502009', 'Ardiansyah A. Roge', '2D - TRPF'),
        (v_instructor_id, '22502010', 'Bucek', '2D - TRPF'),
        (v_instructor_id, '22502011', 'Cristianto Ambatoding', '2D - TRPF'),
        (v_instructor_id, '22502012', 'Dafa Algazali Effendy', '2D - TRPF'),
        (v_instructor_id, '22502013', 'Dina Ayu Rizqi', '2D - TRPF'),
        (v_instructor_id, '22502014', 'Dixzar Tri Winarta', '2D - TRPF'),
        (v_instructor_id, '22502015', 'Fitryadeningsi Tompi', '2D - TRPF'),
        (v_instructor_id, '22502016', 'Gadiza Ferdinasari Asril', '2D - TRPF'),
        (v_instructor_id, '22502017', 'Geraldy Zefanya Peruge', '2D - TRPF'),
        (v_instructor_id, '22502018', 'Grey Faldi Tandililing', '2D - TRPF'),
        (v_instructor_id, '22502019', 'Irfansyah', '2D - TRPF'),
        (v_instructor_id, '22502020', 'Irsyad Rasya', '2D - TRPF'),
        (v_instructor_id, '22502022', 'Jeason Dwi Alexander P. A.', '2D - TRPF'),
        (v_instructor_id, '22502023', 'Jhesen Parinding', '2D - TRPF'),
        (v_instructor_id, '22502024', 'Keysya Arwiana Fitri', '2D - TRPF'),
        (v_instructor_id, '22502025', 'Khalaf Dhafin Alghifari', '2D - TRPF'),
        (v_instructor_id, '22502026', 'M. Habil', '2D - TRPF'),
        (v_instructor_id, '22502027', 'Maryo Putra Luneri Billahi', '2D - TRPF'),
        (v_instructor_id, '22502028', 'Muh. Firdzan', '2D - TRPF'),
        (v_instructor_id, '22502029', 'Muhammad Fauzan Al Dzakwan', '2D - TRPF'),
        (v_instructor_id, '22502030', 'Muhammad Reza', '2D - TRPF'),
        (v_instructor_id, '22502031', 'Muhammad Rifky Anugrah Surahman', '2D - TRPF'),
        (v_instructor_id, '22502032', 'Muhammad Wilby Noufal', '2D - TRPF'),
        (v_instructor_id, '22502033', 'Najwa Aqila Hafsah Elman', '2D - TRPF'),
        (v_instructor_id, '22502034', 'Phika Surtiani', '2D - TRPF'),
        (v_instructor_id, '22502035', 'Salwa Amelia', '2D - TRPF'),
        (v_instructor_id, '22502036', 'Zahran Adnan', '2D - TRPF')
    ON CONFLICT (instructor_id, nim) DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name;

    -- ====================================================================
    -- 3. INSERT MATA KULIAH CAD 2 (PRODI TRPF)
    -- ====================================================================
    INSERT INTO public.courses (
        id, instructor_id, name, code, academic_year, semester, slug,
        description, department, status, created_at, updated_at
    ) VALUES (
        v_course_id,
        v_instructor_id,
        'CAD 2',
        'CAD2',
        '2026/2027',
        'Ganjil',
        'cad-2-trpf',
        'Praktik perancangan konstruksi berbantuan komputer tingkat lanjut (CAD 2) Program Studi Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF) Politeknik Sorowako. Meliputi pemodelan rangka konstruksi baja las (weldments/structural steel), desain lembaran logam (sheet metal design & unfolding), pemodelan bejana tekan dan piping spool, perakitan struktur fabrikasi & BOM, serta penyusunan gambar kerja fabrikasi 2D standar ISO dengan simbol pengelasan AWS A2.4 / ISO 2553.',
        'Teknologi Rekayasa Pengelasan dan Fabrikasi',
        'PUBLISHED',
        NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        department = EXCLUDED.department,
        description = EXCLUDED.description,
        status = 'PUBLISHED';

    -- ====================================================================
    -- 4. INSERT SUB-CPMK (OBE)
    -- ====================================================================
    INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
    VALUES
        (v_cpmk1_id, v_course_id, 'Sub-CPMK 1', 'Mampu merancang pemodelan rangka konstruksi baja dan struktur las (Weldments & Structural Members) lengkap dengan gusset, end cap, weld bead, dan penyusunan Cut List fabrikasi presisi.', 25.00),
        (v_cpmk2_id, v_course_id, 'Sub-CPMK 2', 'Mampu merancang komponen lembaran logam (Sheet Metal Design), menentukan K-Factor / Bend Allowance, serta menghasilkan pola bentangan (flat pattern) untuk proses fabrikasi shearing dan bending.', 25.00),
        (v_cpmk3_id, v_course_id, 'Sub-CPMK 3', 'Mampu memodelkan perakitan (Assembly Modeling) struktur fabrikasi, bejana tekan, atau sistem perpipaan (piping spool) serta melakukan analisis interferensi part dan Bill of Materials (BOM).', 25.00),
        (v_cpmk4_id, v_course_id, 'Sub-CPMK 4', 'Mampu menyusun gambar kerja fabrikasi (Shop Drawing / Isometric Spool) 2D standar ISO dengan penunjukan simbol pengelasan (ISO 2553 / AWS A2.4), toleransi dimensi, dan instruksi perakitan.', 25.00)
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        weight_percent = EXCLUDED.weight_percent;

    -- ====================================================================
    -- 5. INSERT 6 GELOMBANG PERIODE PRAKTIK CAD 2
    -- ====================================================================
    INSERT INTO public.practice_periods (id, course_id, name, period_number, start_date, end_date, status)
    VALUES
        (v_per1_id, v_course_id, 'Gelombang 1 (Minggu 34)', 1, '2026-08-17', '2026-08-21', 'COMPLETED'),
        (v_per2_id, v_course_id, 'Gelombang 2 (Minggu 36)', 2, '2026-08-31', '2026-09-04', 'COMPLETED'),
        (v_per3_id, v_course_id, 'Gelombang 3 (Minggu 38)', 3, '2026-09-14', '2026-09-18', 'ACTIVE'),
        (v_per4_id, v_course_id, 'Gelombang 4 (Minggu 40)', 4, '2026-09-28', '2026-10-02', 'UPCOMING'),
        (v_per5_id, v_course_id, 'Gelombang 5 (Minggu 43)', 5, '2026-10-19', '2026-10-23', 'UPCOMING'),
        (v_per6_id, v_course_id, 'Gelombang 6 (Minggu 45)', 6, '2026-11-02', '2026-11-06', 'UPCOMING')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status;

    -- ====================================================================
    -- 6. ENROLL PESERTA PRAKTIK SESUAI MATRIKS ROTASI RESMI (6 Gelombang x 6 Siswa)
    -- ====================================================================
    -- Gelombang 1
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per1_id, s.id, 'IN_PROGRESS', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502003', '22502007', '22502014', '22502020', '22502027', '22502034')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 2
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per2_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502004', '22502009', '22502015', '22502022', '22502028', '22502033')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 3
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per3_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502005', '22502010', '22502016', '22502023', '22502030', '22502036')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 4
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per4_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502002', '22502007', '22502018', '22502026', '22502031', '22502035')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 5
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per5_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502001', '22502012', '22502019', '22502025', '22502029', '22502032')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 6
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per6_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22502006', '22502008', '22502011', '22502013', '22502017', '22502024')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- ====================================================================
    -- 7. INSERT 5 UNIT MODUL PEMBELAJARAN
    -- ====================================================================
    INSERT INTO public.learning_units (id, period_id, unit_number, title, description)
    VALUES
        (v_unit1_id, v_per1_id, 1, 'Modul 1: Pemodelan Rangka Struktur Baja Las (Weldment & Structural Member)', 'Pemodelan struktur rangka batang baja, pemilihan standar profil, corner treatment (miter/butt), gusset, end cap, dan Cut List fabrikasi.'),
        (v_unit2_id, v_per1_id, 2, 'Modul 2: Perancangan Lembaran Logam & Pola Bentangan (Sheet Metal Design & Unfold)', 'Fitur Base Flange, Edge Flange, Miter Flange, Hem, penentuan parameter K-Factor/Bend Allowance, dan pola bentangan datar (flat pattern).'),
        (v_unit3_id, v_per1_id, 3, 'Modul 3: Desain Tangki, Bejana Tekan & Sistem Perpipaan (Pressure Vessel & Piping Spool)', 'Pemodelan silinder shell roll, head torispherical/ellipsoidal, orientasi nozzle, dan perancangan jalur piping spool.'),
        (v_unit4_id, v_per1_id, 4, 'Modul 4: Perakitan Struktur Fabrikasi & Bill of Materials (Assembly & Cut List BOM)', 'Strategi assembly konstruksi fabrikasi, constraint geometri, uji tabrakan interferensi, dan otomatisasi tabel BOM.'),
        (v_unit5_id, v_per1_id, 5, 'Modul 5: Technical Drafting Fabrikasi & Notasi Simbol Las Standar (ISO 2553 & AWS A2.4)', 'Penyusunan gambar kerja shop drawing A3 ISO, proyeksi ortogonal, irisan detail sambungan las, dan notasi simbol pengelasan AWS/ISO.')
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description;

    -- ====================================================================
    -- 8. PENUGASAN PRAKTIK CAD 2
    -- ====================================================================
    INSERT INTO public.assignments (id, period_id, unit_id, title, description, deadline, max_score, allowed_file_type)
    VALUES
        ('a2c3d4e5-cad2-4000-8000-000000000601'::UUID, v_per1_id, v_unit1_id, 'Tugas Modul 1: Desain & Cut List Rangka Meja Fabrikasi Heavy-Duty', 'Kumpulkan lembar gambar kerja 3D Weldment rangka meja kerja fabrikasi lengkap dengan Cut List Table terinci. Format file PDF.', NOW() + INTERVAL '7 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000602'::UUID, v_per1_id, v_unit2_id, 'Tugas Modul 2: Pemodelan Enclosure Fabrikasi Lembaran Logam & Flat Pattern', 'Upload laporan hasil pemodelan 3D bodi enclosure, diagram bentangan datar (Flat Pattern Unfold), dan tabel K-factor. Format PDF.', NOW() + INTERVAL '10 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000603'::UUID, v_per1_id, v_unit3_id, 'Tugas Modul 3: Desain Tangki Penampung Fluida & Isometrik Spool Pipa', 'Kumpulkan gambar model 3D tangki bertekanan dengan nozzle dan isometrik spool jalur perpipaan standar ASME. Format PDF.', NOW() + INTERVAL '14 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000604'::UUID, v_per1_id, v_unit4_id, 'Tugas Modul 4: Evaluasi Perakitan Gantry Frame & Tabel Bill of Materials (BOM)', 'Laporan analisis perakitan struktur fabrikasi gantry crane, hasil uji tabrakan part, dan tabel BOM lengkap estimasi berat. Format PDF.', NOW() + INTERVAL '18 days', 100, 'PDF'),
        ('a2c3d4e5-cad2-4000-8000-000000000605'::UUID, v_per1_id, v_unit5_id, 'Tugas Modul 5 (Tugas Akhir): Shop Drawing Fabrikasi Komprehensif Berstandar Simbol Las ISO/AWS', 'Karya akhir gambar kerja shop drawing fabrikasi ukuran A3 standar Politeknik Sorowako lengkap simbol pengelasan AWS/ISO dan etiket resmi. Format PDF.', NOW() + INTERVAL '21 days', 100, 'PDF')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Seed CAD 2 (Prodi TRPF) Berhasil: Course, 35 Mahasiswa Kelas 2D - TRPF, 6 Gelombang Periode, 5 Unit Modul, dan Tugas Telah Didaftarkan!';
END $$;



-- ====================================================================
-- SEED DATA: supabase/seed_dpp_2_rpm.sql
-- ====================================================================

-- ====================================================================
-- SEED SCRIPT: PRAKTIK DPP 2 & MAHASISWA KELAS 2C (PRODI RPM)
-- Politeknik Sorowako (POLIWAKO) - Semester Gasal 2026/2027
-- ====================================================================

DO $$
DECLARE
    v_instructor_id UUID;
    v_course_id UUID := 'c3d4e5f6-d002-4000-8000-000000000001'::UUID;
    v_cpmk1_id UUID := 'c3d4e5f6-d002-4000-8000-000000000101'::UUID;
    v_cpmk2_id UUID := 'c3d4e5f6-d002-4000-8000-000000000102'::UUID;
    v_cpmk3_id UUID := 'c3d4e5f6-d002-4000-8000-000000000103'::UUID;
    v_cpmk4_id UUID := 'c3d4e5f6-d002-4000-8000-000000000104'::UUID;
    
    v_per1_id UUID := 'e3d4e5f6-d002-4000-8000-000000000201'::UUID;
    v_per2_id UUID := 'e3d4e5f6-d002-4000-8000-000000000202'::UUID;
    v_per3_id UUID := 'e3d4e5f6-d002-4000-8000-000000000203'::UUID;
    v_per4_id UUID := 'e3d4e5f6-d002-4000-8000-000000000204'::UUID;
    v_per5_id UUID := 'e3d4e5f6-d002-4000-8000-000000000205'::UUID;

    v_unit1_id UUID := 'f3d4e5f6-d002-4000-8000-000000000301'::UUID;
    v_unit2_id UUID := 'f3d4e5f6-d002-4000-8000-000000000302'::UUID;
    v_unit3_id UUID := 'f3d4e5f6-d002-4000-8000-000000000303'::UUID;
    v_unit4_id UUID := 'f3d4e5f6-d002-4000-8000-000000000304'::UUID;
    v_unit5_id UUID := 'f3d4e5f6-d002-4000-8000-000000000305'::UUID;
BEGIN
    -- 1. Verifikasi profil instruktur
    SELECT id INTO v_instructor_id
    FROM public.profiles
    WHERE email = 'rezaf@politekniksorowako.ac.id';

    IF v_instructor_id IS NULL THEN
        SELECT id INTO v_instructor_id
        FROM auth.users
        WHERE email = 'rezaf@politekniksorowako.ac.id';
    END IF;

    -- 2. Insert 35 Mahasiswa Kelas 2C ke Master Students
    INSERT INTO public.students (instructor_id, nim, name, class_name)
    VALUES
        (v_instructor_id, '22503001', 'Afdhal Nur Fauzan', '2C'),
        (v_instructor_id, '22503002', 'Ahmad Nabil', '2C'),
        (v_instructor_id, '22503003', 'Ainun Musdalifah', '2C'),
        (v_instructor_id, '22503004', 'Al Aura Anandita', '2C'),
        (v_instructor_id, '22503005', 'Al-Mubara', '2C'),
        (v_instructor_id, '22503006', 'Ananda Hexa Maulana', '2C'),
        (v_instructor_id, '22503007', 'Andi Jumharyansah', '2C'),
        (v_instructor_id, '22503008', 'Anugrah Pratama', '2C'),
        (v_instructor_id, '22503009', 'Athika Fauziah Satyaputri', '2C'),
        (v_instructor_id, '22503010', 'Deswita Dwianggia', '2C'),
        (v_instructor_id, '22503011', 'Devi Purnama Sari', '2C'),
        (v_instructor_id, '22503012', 'Dwilma Sophie Sisiliano', '2C'),
        (v_instructor_id, '22503013', 'Effer Cliff Mandalele', '2C'),
        (v_instructor_id, '22503014', 'Elisa', '2C'),
        (v_instructor_id, '22503015', 'Fikri Hasan Bungasae', '2C'),
        (v_instructor_id, '22503016', 'Gizza Ramadhani', '2C'),
        (v_instructor_id, '22503017', 'Ikram Arif Ananda', '2C'),
        (v_instructor_id, '22503018', 'Jayanti Lestari Lambe', '2C'),
        (v_instructor_id, '22503019', 'M. Alief Kurniawan', '2C'),
        (v_instructor_id, '22503020', 'Meylani Ayu Nathasa', '2C'),
        (v_instructor_id, '22503021', 'Muh. Januar Farouq', '2C'),
        (v_instructor_id, '22503022', 'Muh. Muzammil Musta', '2C'),
        (v_instructor_id, '22503023', 'Muh. Naufal Al Khair', '2C'),
        (v_instructor_id, '22503024', 'Muh. Nendra Arif', '2C'),
        (v_instructor_id, '22503025', 'Muh. Rajab Hidayah An', '2C'),
        (v_instructor_id, '22503026', 'Nabil Ardiansyah', '2C'),
        (v_instructor_id, '22503028', 'Nita', '2C'),
        (v_instructor_id, '22503029', 'Nur Ainun Alifda', '2C'),
        (v_instructor_id, '22503030', 'Nur Hikma', '2C'),
        (v_instructor_id, '22503031', 'Rasya Ahmad Al Farezi.A', '2C'),
        (v_instructor_id, '22503032', 'Rezal Pabiaran', '2C'),
        (v_instructor_id, '22503033', 'Silvia Nur Azizah', '2C'),
        (v_instructor_id, '22503034', 'Valentin Merrandan', '2C'),
        (v_instructor_id, '22503035', 'Yhogi Oktavianus Iksel', '2C'),
        (v_instructor_id, '22503036', 'Zahra Atifah Zal-Sabila', '2C')
    ON CONFLICT (instructor_id, nim) DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name;

    -- 3. Insert Mata Kuliah Praktik DPP 2 (Prodi RPM)
    INSERT INTO public.courses (
        id, instructor_id, name, code, academic_year, semester, slug,
        description, department, status, created_at, updated_at
    ) VALUES (
        v_course_id,
        v_instructor_id,
        'Praktik DPP 2',
        'DPP2',
        '2026/2027',
        'Ganjil',
        'dpp-2-rpm',
        'Praktik Desain dan Perancangan Produk 2 (DPP 2) Program Studi Rekayasa Perancangan Mekanik (RPM) Politeknik Sorowako. Meliputi metodologi perancangan produk manufaktur presisi, rekayasa nilai (value engineering), pemilihan material dan standard parts teknik, pemodelan 3D mekanikal presisi, analisis kelayakan perakitan (Design for Assembly - DFA) dan manufaktur (Design for Manufacturing - DFM), pembuatan prototype fungsional, serta penyusunan dokumen gambar kerja teknik manufaktur standar ISO.',
        'Rekayasa Perancangan Mekanik',
        'PUBLISHED',
        NOW(),
        NOW()
    ) ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        academic_year = EXCLUDED.academic_year,
        semester = EXCLUDED.semester,
        description = EXCLUDED.description,
        department = EXCLUDED.department,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- 4. Insert 4 Sub-CPMK Kurikulum OBE
    INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
    VALUES
        (v_cpmk1_id, v_course_id, 'Sub-CPMK 1', 'Mampu mengidentifikasi kebutuhan spesifikasi teknis produk, menyusun Product Design Specification (PDS), serta mengembangkan alternatif konsep desain produk mekanik presisi.', 20.0),
        (v_cpmk2_id, v_course_id, 'Sub-CPMK 2', 'Mampu menerapkan kaidah Design for Manufacturing (DFM) dan Design for Assembly (DFA) dalam pemilihan komponen mekanik presisi, material teknik, dan metode proses manufaktur.', 25.0),
        (v_cpmk3_id, v_course_id, 'Sub-CPMK 3', 'Mampu membuat pemodelan 3D CAD parametrik perakitan produk mekanikal presisi lengkap dengan analisis toleransi geometri (GD&T ISO 1101) dan bebas tabrakan (zero collision).', 30.0),
        (v_cpmk4_id, v_course_id, 'Sub-CPMK 4', 'Mampu menghasilkan prototype fungsional mekanik, menyusun Bill of Materials (BOM) terstruktur, dan menyajikan laporan rekayasa perancangan standar industri manufaktur.', 25.0)
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        weight_percent = EXCLUDED.weight_percent;

    -- 5. Insert 5 Gelombang Periode Praktik DPP 2
    INSERT INTO public.practice_periods (id, course_id, name, period_number, start_date, end_date, status)
    VALUES
        (v_per1_id, v_course_id, 'Gelombang 1 (Minggu 33)', 1, '2026-08-10', '2026-08-14', 'COMPLETED'),
        (v_per2_id, v_course_id, 'Gelombang 2 (Minggu 35)', 2, '2026-08-24', '2026-08-28', 'COMPLETED'),
        (v_per3_id, v_course_id, 'Gelombang 3 (Minggu 37)', 3, '2026-09-07', '2026-09-11', 'ACTIVE'),
        (v_per4_id, v_course_id, 'Gelombang 4 (Minggu 39)', 4, '2026-09-21', '2026-09-25', 'UPCOMING'),
        (v_per5_id, v_course_id, 'Gelombang 5 (Minggu 43)', 5, '2026-10-19', '2026-10-23', 'UPCOMING')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status;

    -- 6. Enroll Peserta Praktik Sesuai Matriks Resmi
    -- Gelombang 1
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per1_id, s.id, 'PUBLISHED', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503003', '22503008', '22503010', '22503013', '22503018', '22503026', '22503029', '22503031', '22503035')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 2
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per2_id, s.id, 'PUBLISHED', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503004', '22503009', '22503014', '22503015', '22503016', '22503019', '22503032', '22503033', '22503034')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 3
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per3_id, s.id, 'IN_PROGRESS', TRUE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503001', '22503002', '22503005', '22503023', '22503024', '22503028', '22503030')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 4
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per4_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503006', '22503011', '22503020', '22503021', '22503025')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- Gelombang 5
    INSERT INTO public.practice_participants (period_id, student_id, progress_status, final_project_confirmed)
    SELECT v_per5_id, s.id, 'NOT_STARTED', FALSE
    FROM public.students s
    WHERE s.instructor_id = v_instructor_id
      AND s.nim IN ('22503007', '22503012', '22503017', '22503022', '22503036')
    ON CONFLICT (period_id, student_id) DO NOTHING;

    -- 7. Modul Pembelajaran Praktik DPP 2
    INSERT INTO public.learning_units (id, period_id, title, order_number, sub_cpmk_id, target_indicators)
    VALUES
        (v_unit1_id, v_per3_id, 'Unit 1: Metodologi Perancangan Produk & Penyusunan PDS', 1, v_cpmk1_id, '["Identifikasi problem statement dan spesifikasi fungsional", "Penyusunan dokumen PDS terstruktur", "Matriks morfologi & pemilihan konsep desain terbaik"]'::jsonb),
        (v_unit2_id, v_per3_id, 'Unit 2: Penerapan Kaidah DFM & DFA', 2, v_cpmk2_id, '["Minimalisasi part & eliminasi blind assembly", "Kemudahan proses permesinan dan perakitan", "Pemilihan material standar ISO & katalog komersial"]'::jsonb),
        (v_unit3_id, v_per3_id, 'Unit 3: Pemodelan Parametrik 3D Assembly & Analisis Interferensi', 3, v_cpmk3_id, '["Pemodelan 3D solid parametrik akurat", "Mechanical mates & sub-assembly", "Uji tabrakan collision detection bebas interferensi"]'::jsonb),
        (v_unit4_id, v_per3_id, 'Unit 4: Gambar Kerja Manufaktur 2D Terstandarisasi GD&T ISO & BOM', 4, v_cpmk3_id, '["Detail drafting proyeksi orthogonal & section ISO", "Penerapan toleransi geometri GD&T ISO 1101", "Bill of Materials (BOM) otomatis dengan nomor balon"]'::jsonb),
        (v_unit5_id, v_per3_id, 'Unit 5: Pembuatan & Uji Validasi Prototype Fungsional Mekanik', 5, v_cpmk4_id, '["Perakitan prototype fisik fungsional sesuai SOP", "Uji kinerja mekanisme terhadap parameter PDS", "Laporan akhir rekayasa dan sidang evaluasi produk"]'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        order_number = EXCLUDED.order_number,
        target_indicators = EXCLUDED.target_indicators;

END $$;


