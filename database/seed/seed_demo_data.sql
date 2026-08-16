-- =============================================================================
-- Phazon Academic Platform — Database Seed DDL
-- =============================================================================

INSERT INTO public.academic_years (id, year_name, start_date, end_date, is_current)
VALUES ('a0000000-0000-0000-0000-000000000001', '2025-2026', '2025-06-01', '2026-05-31', true)
ON CONFLICT (year_name) DO UPDATE SET is_current = true;

INSERT INTO public.semesters (id, academic_year_id, number, title, start_date, end_date, is_current)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 3, 'Semester 3 (Fall 2025)', '2025-07-01', '2025-12-15', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.departments (id, code, name)
VALUES 
  ('c1000000-0000-0000-0000-000000000001', 'AIDS', 'Artificial Intelligence & Data Science'),
  ('c2000000-0000-0000-0000-000000000002', 'CSE', 'Computer Science & Engineering'),
  ('c3000000-0000-0000-0000-000000000003', 'ECE', 'Electronics & Communication Engineering')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('attendance_minimum_pct', '75'::jsonb, 'Minimum attendance percentage required to sit for examinations'),
  ('assignment_rules', '{"late_penalty_pct": 10, "max_resubmissions": 1}'::jsonb, 'Institution assignment submission rules')
ON CONFLICT (config_key) DO NOTHING;
