/**
 * Phazon Academic — Phase 4 Demo Account Provisioner
 *
 * Creates the 4 development/test accounts for all academic roles.
 * Accounts are created through the proper Supabase Auth mechanism.
 * Passwords are stored ONLY in Supabase Auth — never in public.users.
 *
 * Run: node backend/src/scripts/createDemoAccounts.js
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DEMO_ACCOUNTS = [
  {
    email:    'admin.demo@phazon.test',
    password: 'Admin@2026!',
    name:     'Demo Administrator',
    role:     'admin',
    departmentCode: null,
  },
  {
    email:    'hod.demo@phazon.test',
    password: 'HOD@2026!',
    name:     'Demo HOD',
    role:     'hod',
    departmentCode: 'AIDS',
  },
  {
    email:    'teacher.demo@phazon.test',
    password: 'Teacher@2026!',
    name:     'Demo Teacher',
    role:     'teacher',
    departmentCode: 'AIDS',
  },
  {
    email:    'student.demo@phazon.test',
    password: 'Student@2026!',
    name:     'Demo Student',
    role:     'student',
    departmentCode: 'AIDS',
  },
];

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Phazon Academic — Demo Account Provisioner ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Fetch the AI & Data Science department ID
  const { data: depts, error: deptsErr } = await supabase
    .from('departments')
    .select('id, code');

  if (deptsErr) {
    console.error('❌ Failed to fetch departments:', deptsErr.message);
    process.exit(1);
  }

  const deptMap = {};
  for (const d of (depts || [])) {
    deptMap[d.code] = d.id;
  }

  console.log(`📦 Departments found: ${Object.keys(deptMap).join(', ') || 'none'}\n`);

  const results = [];

  for (const account of DEMO_ACCOUNTS) {
    process.stdout.write(`  Creating [${account.role.toUpperCase()}] ${account.email} ...`);

    const departmentId = account.departmentCode ? deptMap[account.departmentCode] || null : null;

    // Step 1: Create Supabase Auth user (via signUp with auto-confirm attempt)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email:    account.email,
      password: account.password,
      options: {
        data: {
          name: account.name,
          role: account.role,
        },
      },
    });

    if (signUpError) {
      // Check if account already exists — that's OK
      if (
        signUpError.message?.includes('already registered') ||
        signUpError.message?.includes('already been registered') ||
        signUpError.message?.includes('User already registered')
      ) {
        // Try to fetch existing user ID from public.users
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', account.email)
          .maybeSingle();

        if (existing) {
          console.log(' ⚠️  Already exists — updating profile');
          // Update profile to ensure correct role/dept
          await supabase
            .from('users')
            .update({
              role:          account.role,
              department_id: departmentId,
              is_active:     true,
              name:          account.name,
            })
            .eq('id', existing.id);

          results.push({ ...account, status: 'updated', id: existing.id });
          continue;
        }
      }

      console.log(` ❌ Auth Error: ${signUpError.message}`);
      results.push({ ...account, status: 'failed', error: signUpError.message });
      continue;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      console.log(' ❌ No user ID returned from signUp');
      results.push({ ...account, status: 'failed', error: 'No user ID' });
      continue;
    }

    // Step 2: Auto-confirm email (via RPC if available)
    await supabase.rpc('confirm_user_email', { p_user_id: userId }).catch(() => {});

    // Step 3: Upsert application profile in public.users
    const { error: profileError } = await supabase
      .from('users')
      .upsert([{
        id:            userId,
        name:          account.name,
        email:         account.email,
        role:          account.role,
        department_id: departmentId,
        is_active:     true,
        updated_at:    new Date().toISOString(),
      }], { onConflict: 'id' });

    if (profileError) {
      console.log(` ⚠️  Auth OK but profile error: ${profileError.message}`);
      results.push({ ...account, status: 'partial', id: userId });
    } else {
      console.log(' ✅ Created');
      results.push({ ...account, status: 'created', id: userId });
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  // Step 4: Enroll student.demo in Class A if it exists
  const studentResult = results.find(r => r.role === 'student' && r.id);
  const teacherResult = results.find(r => r.role === 'teacher' && r.id);

  if (studentResult || teacherResult) {
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .limit(1);

    if (classes && classes.length > 0) {
      const classId = classes[0].id;

      if (studentResult?.id) {
        await supabase
          .from('student_enrollments')
          .upsert([{ student_id: studentResult.id, class_id: classId }],
            { onConflict: 'student_id,class_id' });
        console.log(`\n  📚 Enrolled student.demo in: ${classes[0].name}`);
      }

      if (teacherResult?.id) {
        // Get first subject for assignment
        const { data: subjects } = await supabase
          .from('subjects')
          .select('id')
          .limit(1);

        if (subjects && subjects.length > 0) {
          await supabase
            .from('teacher_assignments')
            .upsert([{
              teacher_id: teacherResult.id,
              class_id:   classId,
              subject_id: subjects[0].id,
            }], { onConflict: 'teacher_id,class_id,subject_id' });
          console.log(`  👨‍🏫 Assigned teacher.demo to: ${classes[0].name}`);
        }
      }
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           Provisioning Summary       ║');
  console.log('╚══════════════════════════════════════╝');
  for (const r of results) {
    const icon = r.status === 'created' ? '✅' : r.status === 'updated' ? '⚠️ ' : '❌';
    console.log(`  ${icon} [${r.role.toUpperCase().padEnd(7)}] ${r.email}  (${r.status})`);
  }

  const failed = results.filter(r => r.status === 'failed');
  if (failed.length > 0) {
    console.log('\n⚠️  Some accounts failed. Check errors above.');
    console.log('   If email confirmation is required, enable "Disable email confirmations"');
    console.log('   in Supabase Dashboard → Authentication → Email → Settings.');
  } else {
    console.log('\n✅ All demo accounts provisioned successfully!\n');
    console.log('Demo Login Credentials:');
    console.log('  admin.demo@phazon.test   /  Admin@2026!   → /admin/dashboard.html');
    console.log('  hod.demo@phazon.test     /  HOD@2026!     → /hod/dashboard.html');
    console.log('  teacher.demo@phazon.test / Teacher@2026!  → /teacher/dashboard.html');
    console.log('  student.demo@phazon.test / Student@2026!  → /student/dashboard.html');
  }

  console.log('');
}

main().catch(err => {
  console.error('\n[Fatal Error]:', err.message);
  process.exit(1);
});
