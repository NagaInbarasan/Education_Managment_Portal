import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function inspect() {
  console.log('=== DATA INSPECTION ===\n');

  // Check all tables for data and columns
  const tables = [
    'portal_users', 'subjects', 'subject_teachers', 'subject_enrollments',
    'departments', 'sections', 'subject_offerings', 'timetable_entries',
    'assignments', 'tests', 'subject_documents', 'subject_announcements'
  ];

  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(3);
    if (error) {
      console.log(`--- ${table} --- ERROR: ${error.message}`);
      continue;
    }
    console.log(`--- ${table} --- (${count || (data || []).length} rows)`);
    if (data && data.length > 0) {
      console.log('  Columns:', Object.keys(data[0]).join(', '));
      data.forEach((row, i) => console.log(`  Row ${i+1}:`, JSON.stringify(row)));
    } else {
      console.log('  (empty)');
    }
    console.log('');
  }
}

inspect().catch(console.error);
