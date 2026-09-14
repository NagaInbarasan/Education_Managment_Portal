-- ============================================
-- COMPLETE PHAZON SCHEMA + ACADEMIC ORGANIZATION
-- For project: pivqxudlyfnbhxxxuokk
-- Run in Supabase Dashboard → SQL Editor
-- URL: https://supabase.com/dashboard/project/pivqxudlyfnbhxxxuokk/sql/new
-- ============================================

-- ============================================
-- A. DROP CONFLICTING OLD TABLES (different schema)
-- ============================================
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS subject_offerings CASCADE;
DROP TABLE IF EXISTS sections CASCADE;

-- ============================================
-- B. CORE TABLES (required by existing frontend)
-- ============================================

-- 1. PORTAL USERS
CREATE TABLE IF NOT EXISTS portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'hod', 'admin')),
  department TEXT,
  department_id UUID,
  section_id UUID,
  batch_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_users_all" ON portal_users;
CREATE POLICY "portal_users_all" ON portal_users FOR ALL USING (true);

-- 2. SUBJECTS (drop and recreate with correct schema)
DROP TABLE IF EXISTS subjects CASCADE;
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  icon TEXT DEFAULT '📚',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_all" ON subjects;
CREATE POLICY "subjects_all" ON subjects FOR ALL USING (true);

-- 3. SUBJECT TEACHERS (legacy, kept for compat)
CREATE TABLE IF NOT EXISTS subject_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_portal_id TEXT NOT NULL,
  teacher_name TEXT,
  role TEXT DEFAULT 'lead',
  assigned_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subject_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_teachers_all" ON subject_teachers;
CREATE POLICY "subject_teachers_all" ON subject_teachers FOR ALL USING (true);

-- 4. SUBJECT ENROLLMENTS (legacy, kept for compat)
CREATE TABLE IF NOT EXISTS subject_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  student_portal_id TEXT NOT NULL,
  student_name TEXT,
  enrolled_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_enrollments_all" ON subject_enrollments;
CREATE POLICY "subject_enrollments_all" ON subject_enrollments FOR ALL USING (true);

-- 5. SUBJECT DOCUMENTS
CREATE TABLE IF NOT EXISTS subject_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT,
  unit_or_module TEXT,
  offering_id UUID,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subject_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_documents_all" ON subject_documents;
CREATE POLICY "subject_documents_all" ON subject_documents FOR ALL USING (true);

-- 6. SUBJECT ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS subject_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  posted_by TEXT,
  posted_by_name TEXT,
  offering_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subject_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_announcements_all" ON subject_announcements;
CREATE POLICY "subject_announcements_all" ON subject_announcements FOR ALL USING (true);

-- 7. ASSIGNMENTS
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  unit_or_module TEXT,
  due_date TIMESTAMPTZ,
  max_marks INTEGER DEFAULT 100,
  status TEXT DEFAULT 'draft',
  offering_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_all" ON assignments;
CREATE POLICY "assignments_all" ON assignments FOR ALL USING (true);

-- 8. ASSIGNMENT SUBMISSIONS
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_portal_id TEXT NOT NULL,
  student_name TEXT,
  submission_text TEXT,
  file_path TEXT,
  status TEXT DEFAULT 'submitted',
  marks_obtained INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ
);

ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignment_submissions_all" ON assignment_submissions;
CREATE POLICY "assignment_submissions_all" ON assignment_submissions FOR ALL USING (true);

-- 9. TESTS
DROP TABLE IF EXISTS test_answers CASCADE;
DROP TABLE IF EXISTS test_submissions CASCADE;
DROP TABLE IF EXISTS test_questions CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  max_marks INTEGER DEFAULT 100,
  status TEXT DEFAULT 'draft',
  results_released BOOLEAN DEFAULT false,
  offering_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tests_all" ON tests;
CREATE POLICY "tests_all" ON tests FOR ALL USING (true);

-- 10. TEST QUESTIONS
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'mcq',
  options JSONB,
  correct_answer TEXT,
  marks INTEGER DEFAULT 1,
  question_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "test_questions_all" ON test_questions;
CREATE POLICY "test_questions_all" ON test_questions FOR ALL USING (true);

-- 11. TEST SUBMISSIONS
CREATE TABLE test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_portal_id TEXT NOT NULL,
  student_name TEXT,
  total_marks_obtained INTEGER DEFAULT 0,
  status TEXT DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE test_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "test_submissions_all" ON test_submissions;
CREATE POLICY "test_submissions_all" ON test_submissions FOR ALL USING (true);

-- 12. TEST ANSWERS
CREATE TABLE test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_submission_id UUID NOT NULL REFERENCES test_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  marks_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "test_answers_all" ON test_answers;
CREATE POLICY "test_answers_all" ON test_answers FOR ALL USING (true);

-- 13. DOCUMENT TEXT CHUNKS (for future RAG)
CREATE TABLE IF NOT EXISTS document_text_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  subject_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE document_text_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chunks_all" ON document_text_chunks;
CREATE POLICY "chunks_all" ON document_text_chunks FOR ALL USING (true);

-- ============================================
-- C. NEW ACADEMIC ORGANIZATION TABLES
-- ============================================

-- 14. DEPARTMENTS (correct schema)
DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code TEXT UNIQUE NOT NULL,
  department_name TEXT NOT NULL,
  hod_portal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_all" ON departments;
CREATE POLICY "departments_all" ON departments FOR ALL USING (true);

-- 15. SECTIONS
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  batch_year INTEGER NOT NULL,
  section_name TEXT NOT NULL,
  mentor_portal_id TEXT,
  class_advisor_portal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, batch_year, section_name)
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sections_all" ON sections;
CREATE POLICY "sections_all" ON sections FOR ALL USING (true);

-- 16. SUBJECT OFFERINGS
CREATE TABLE subject_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  teacher_portal_id TEXT NOT NULL,
  academic_year TEXT DEFAULT '2026-2027',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_id, section_id)
);

ALTER TABLE subject_offerings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offerings_all" ON subject_offerings;
CREATE POLICY "offerings_all" ON subject_offerings FOR ALL USING (true);

-- 17. TIMETABLE ENTRIES
CREATE TABLE timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  offering_id UUID NOT NULL REFERENCES subject_offerings(id) ON DELETE RESTRICT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  period_number INTEGER NOT NULL CHECK (period_number >= 1),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  academic_year TEXT DEFAULT '2026-2027',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section_id, day_of_week, period_number)
);

ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timetable_all" ON timetable_entries;
CREATE POLICY "timetable_all" ON timetable_entries FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_timetable_offering ON timetable_entries(offering_id);
CREATE INDEX IF NOT EXISTS idx_timetable_section_day ON timetable_entries(section_id, day_of_week);

-- ============================================
-- D. ADD FOREIGN KEYS FROM portal_users
-- ============================================
-- (portal_users.department_id and section_id columns already created above)

-- ============================================
-- E. ADD offering_id FK references
-- ============================================
ALTER TABLE subject_documents ADD CONSTRAINT fk_docs_offering
  FOREIGN KEY (offering_id) REFERENCES subject_offerings(id) ON DELETE SET NULL;

ALTER TABLE subject_announcements ADD CONSTRAINT fk_ann_offering
  FOREIGN KEY (offering_id) REFERENCES subject_offerings(id) ON DELETE SET NULL;

ALTER TABLE assignments ADD CONSTRAINT fk_asg_offering
  FOREIGN KEY (offering_id) REFERENCES subject_offerings(id) ON DELETE SET NULL;

ALTER TABLE tests ADD CONSTRAINT fk_test_offering
  FOREIGN KEY (offering_id) REFERENCES subject_offerings(id) ON DELETE SET NULL;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_public" ON storage.objects;
CREATE POLICY "documents_public" ON storage.objects FOR ALL USING (bucket_id = 'documents');

SELECT 'Full schema migration complete!' AS result;
