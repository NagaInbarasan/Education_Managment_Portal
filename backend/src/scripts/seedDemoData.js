/**
 * Phazon Academic System — Demo Data Provisioning Script
 * Populates test users for Admin, HOD, Teacher, and Student roles with sample data.
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabase = require('../config/supabase');

async function seed() {
  console.log('[Seed] Starting Academic Demo Data Seeding...');

  // 1. Fetch Department & Semester IDs
  const { data: depts, error: deptsErr } = await supabase.from('departments').select('id, code');
  if (deptsErr) console.warn('[Seed] Departments query warning:', deptsErr.message);

  const aidsDept = depts?.find(d => d.code === 'AIDS') || depts?.[0];

  const { data: sems, error: semsErr } = await supabase.from('semesters').select('id, number').eq('is_current', true);
  if (semsErr) console.warn('[Seed] Semesters query warning:', semsErr.message);

  const sem3 = sems?.[0];

  console.log('[Seed] Dept found:', aidsDept?.code || 'None', '| Semester found:', sem3?.number || 'None');

  // 2. Create Users
  const demoUsers = [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      name: 'System Admin',
      email: 'admin@phazon.edu',
      role: 'admin',
      is_active: true,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      name: 'Dr. Ramesh Kumar (HOD)',
      email: 'hod.aids@phazon.edu',
      role: 'hod',
      department_id: aidsDept?.id || null,
      is_active: true,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      name: 'Dr. Priya Mehta (Faculty)',
      email: 'teacher.priya@phazon.edu',
      role: 'teacher',
      department_id: aidsDept?.id || null,
      is_active: true,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000004',
      name: 'Alex Kumar',
      email: 'student.alex@phazon.edu',
      role: 'student',
      department_id: aidsDept?.id || null,
      is_active: true,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000005',
      name: 'Rahul Sharma',
      email: 'student.rahul@phazon.edu',
      role: 'student',
      department_id: aidsDept?.id || null,
      is_active: true,
    },
  ];

  for (const u of demoUsers) {
    const { error } = await supabase.from('users').upsert([u], { onConflict: 'id' });
    if (error) console.warn(`[Seed] User ${u.email} upsert info:`, error.message);
    else console.log(`[Seed] User ready: ${u.name} (${u.role})`);
  }

  if (aidsDept && sem3) {
    // 3. Create Class
    const classId = 'f0000000-0000-0000-0000-000000000001';
    const { data: cls } = await supabase.from('classes').upsert([{
      id: classId,
      name: 'Class 3A - AI & Data Science',
      department_id: aidsDept.id,
      semester_id: sem3.id,
    }], { onConflict: 'id' }).select().single();

    console.log('[Seed] Class ready:', cls?.name);

    // 4. Enroll Students
    await supabase.from('student_enrollments').upsert([
      { student_id: demoUsers[3].id, class_id: classId },
      { student_id: demoUsers[4].id, class_id: classId },
    ], { onConflict: 'student_id,class_id' });

    console.log('[Seed] Enrolled students in class.');

    // 5. Fetch Subject ID
    const { data: subjs } = await supabase.from('subjects').select('id, code').eq('department_id', aidsDept.id);
    const dsaSubj = subjs?.find(s => s.code === 'AD301') || subjs?.[0];

    if (dsaSubj) {
      // 6. Assign Teacher
      await supabase.from('teacher_assignments').upsert([{
        teacher_id: demoUsers[2].id,
        class_id: classId,
        subject_id: dsaSubj.id,
      }], { onConflict: 'teacher_id,class_id,subject_id' });

      // 7. Attendance Session & Records
      const today = new Date().toISOString().split('T')[0];
      const { data: attSession } = await supabase.from('attendance_sessions').upsert([{
        class_id: classId,
        subject_id: dsaSubj.id,
        teacher_id: demoUsers[2].id,
        date: today,
        notes: 'Arrays and Linked Lists lecture',
      }], { onConflict: 'class_id,subject_id,date' }).select().single();

      if (attSession) {
        await supabase.from('attendance_records').upsert([
          { session_id: attSession.id, student_id: demoUsers[3].id, status: 'present' },
          { session_id: attSession.id, student_id: demoUsers[4].id, status: 'present' },
        ], { onConflict: 'session_id,student_id' });
        console.log('[Seed] Attendance session & records created.');
      }

      // 8. Sample Assignment & Submission
      const assgId = 'a0000000-0000-0000-0000-000000000001';
      const { data: assg } = await supabase.from('assignments').upsert([{
        id: assgId,
        title: 'Data Structures Lab 1: Doubly Linked List',
        description: 'Implement a thread-safe doubly linked list in JavaScript or Python.',
        class_id: classId,
        subject_id: dsaSubj.id,
        teacher_id: demoUsers[2].id,
        max_marks: 100,
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      }], { onConflict: 'id' }).select().single();

      if (assg) {
        await supabase.from('assignment_submissions').upsert([{
          assignment_id: assg.id,
          student_id: demoUsers[3].id,
          submission_text: 'Completed doubly linked list implementation with push, pop, and search methods.',
          marks: 95,
          grade: 'A+',
          feedback: 'Excellent code quality and edge case coverage.',
          graded_at: new Date().toISOString(),
        }], { onConflict: 'assignment_id,student_id' });
        console.log('[Seed] Assignment & submission created.');
      }

      // 9. Sample Grades
      await supabase.from('grades').upsert([{
        student_id: demoUsers[3].id,
        subject_id: dsaSubj.id,
        semester_id: sem3.id,
        internal_marks: 48,
        external_marks: 47,
        total_marks: 95,
        max_marks: 100,
        grade: 'A+',
        grade_point: 4.0,
        remarks: 'Outstanding performance',
      }], { onConflict: 'student_id,subject_id,semester_id' });

      console.log('[Seed] Grades recorded.');
    }
  }

  console.log('[Seed] Demo data seeding completed successfully!');
}

seed().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
