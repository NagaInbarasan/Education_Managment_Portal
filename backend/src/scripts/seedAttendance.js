/**
 * Phase 6 - Seed Attendance
 * Generates realistic attendance data for the existing classes and subjects.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting Attendance Seeding...");

  // 1. Get assignments
  const { data: assignments, error: aErr } = await supabase.from('teacher_assignments').select('*');
  if (aErr || !assignments.length) {
    console.error("No teacher assignments found. Seed data first.");
    return;
  }

  // 2. Get enrollments
  const { data: enrollments, error: eErr } = await supabase.from('student_enrollments').select('*');
  if (eErr || !enrollments.length) {
    console.error("No student enrollments found.");
    return;
  }

  let sessionCount = 0;
  let recordCount = 0;

  // Generate 10 days of attendance for each assigned class/subject
  const today = new Date();
  
  for (const a of assignments) {
    const classEnrollments = enrollments.filter(e => e.class_id === a.class_id);
    if (!classEnrollments.length) continue;

    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Upsert Session
      const { data: session, error: sErr } = await supabase.from('attendance_sessions')
        .upsert([{
          class_id: a.class_id,
          subject_id: a.subject_id,
          teacher_id: a.teacher_id,
          date: dateStr,
          notes: `Session ${10 - i}`
        }], { onConflict: 'class_id,subject_id,date' })
        .select().single();

      if (sErr) {
        console.error("Session Error:", sErr);
        continue;
      }
      sessionCount++;

      // Create Records
      const records = classEnrollments.map(e => {
        // Randomly assign status
        const rand = Math.random();
        let status = 'present';
        if (rand > 0.8) status = 'absent';
        else if (rand > 0.7) status = 'late';
        else if (rand > 0.65) status = 'excused';

        return {
          session_id: session.id,
          student_id: e.student_id,
          status,
          remarks: status !== 'present' ? `Status: ${status}` : null
        };
      });

      const { error: rErr } = await supabase.from('attendance_records')
        .upsert(records, { onConflict: 'session_id,student_id' });

      if (rErr) console.error("Records Error:", rErr);
      else recordCount += records.length;
    }
  }

  console.log(`Seeding complete. Added/Updated ${sessionCount} sessions and ${recordCount} records.`);
}

run().catch(console.error);
