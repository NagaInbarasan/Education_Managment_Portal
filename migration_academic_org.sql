-- ============================================
-- ACADEMIC ORGANIZATION MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- Project: ossbjkbfghcafvjjfhfg
-- ============================================

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
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

-- 2. SECTIONS
CREATE TABLE IF NOT EXISTS sections (
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

-- 3. SUBJECT OFFERINGS
CREATE TABLE IF NOT EXISTS subject_offerings (
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

-- 4. TIMETABLE ENTRIES
CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  offering_id UUID NOT NULL REFERENCES subject_offerings(id) ON DELETE RESTRICT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
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

-- 5. ADD COLUMNS TO portal_users
DO $$ BEGIN
  ALTER TABLE portal_users ADD COLUMN department_id UUID REFERENCES departments(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE portal_users ADD COLUMN section_id UUID REFERENCES sections(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE portal_users ADD COLUMN batch_year INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 6. ADD offering_id TO CONTENT TABLES
DO $$ BEGIN
  ALTER TABLE assignments ADD COLUMN offering_id UUID REFERENCES subject_offerings(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tests ADD COLUMN offering_id UUID REFERENCES subject_offerings(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE subject_documents ADD COLUMN offering_id UUID REFERENCES subject_offerings(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE subject_announcements ADD COLUMN offering_id UUID REFERENCES subject_offerings(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

SELECT 'Migration complete!' AS result;
