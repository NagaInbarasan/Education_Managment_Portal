/**
 * AI Tool Registry — Safe, read-only database query tools.
 * 
 * Qwen selects from these tools; it NEVER generates SQL.
 * Each tool:
 *   1. Receives the authenticated portalUser (from middleware)
 *   2. Enforces role-based scope internally
 *   3. Returns structured JSON
 *   4. Never returns passwords, tokens, or secrets
 */
import supabase from '../supabase.js';

// ============================================================
// HELPER: Get authorized offerings for a teacher
// ============================================================
async function getTeacherOfferingIds(portalId) {
  const { data } = await supabase
    .from('subject_offerings')
    .select('id, section_id, subject_id, subjects(code, name)')
    .eq('teacher_portal_id', portalId)
    .eq('status', 'active');
  return data || [];
}

async function getTeacherSectionIds(portalId) {
  const offerings = await getTeacherOfferingIds(portalId);
  // Also include sections where teacher is class advisor or mentor
  const { data: advisedSections } = await supabase
    .from('sections')
    .select('id')
    .or(`class_advisor_portal_id.eq.${portalId},mentor_portal_id.eq.${portalId}`);
  const offeringSectionIds = offerings.map(o => o.section_id);
  const advisedIds = (advisedSections || []).map(s => s.id);
  return [...new Set([...offeringSectionIds, ...advisedIds])];
}

async function getHodDepartmentId(portalId) {
  const { data } = await supabase
    .from('departments')
    .select('id')
    .eq('hod_portal_id', portalId)
    .single();
  return data?.id || null;
}

async function getDepartmentSectionIds(deptId) {
  const { data } = await supabase
    .from('sections')
    .select('id')
    .eq('department_id', deptId);
  return (data || []).map(s => s.id);
}

async function getDepartmentOfferingIds(deptId) {
  const sectionIds = await getDepartmentSectionIds(deptId);
  if (sectionIds.length === 0) return [];
  const { data } = await supabase
    .from('subject_offerings')
    .select('id, section_id, subject_id, subjects(code, name)')
    .in('section_id', sectionIds)
    .eq('status', 'active');
  return data || [];
}

async function getSectionStudents(sectionId) {
  const { data } = await supabase
    .from('portal_users')
    .select('portal_id, name')
    .eq('section_id', sectionId)
    .eq('role', 'student')
    .order('name');
  return data || [];
}

// ============================================================
// TOOL: getTodayAttendance
// ============================================================
async function getTodayAttendance(portalUser, params) {
  const { role, portal_id, section_id } = portalUser;
  const today = new Date().toISOString().split('T')[0];

  if (role === 'student') {
    // Student can only see own attendance status for today
    const { data: records } = await supabase
      .from('offering_attendance')
      .select('status, subject_offerings(subjects(code, name))')
      .eq('student_portal_id', portal_id)
      .eq('date', today);

    if (!records || records.length === 0) {
      return { date: today, message: 'Attendance has not been recorded yet today for your classes.' };
    }
    return {
      date: today,
      your_attendance: records.map(r => ({
        subject: r.subject_offerings?.subjects?.name || 'Unknown',
        code: r.subject_offerings?.subjects?.code || '',
        status: r.status
      }))
    };
  }

  // Teacher/HOD/Admin: get section-level attendance
  let sectionIds = [];
  if (role === 'teacher') {
    sectionIds = await getTeacherSectionIds(portal_id);
  } else if (role === 'hod') {
    const deptId = await getHodDepartmentId(portal_id);
    if (!deptId) return { error: 'No department found for HOD' };
    sectionIds = await getDepartmentSectionIds(deptId);
  } else if (role === 'admin') {
    const { data } = await supabase.from('sections').select('id');
    sectionIds = (data || []).map(s => s.id);
  } else {
    return { error: 'Unauthorized' };
  }

  if (sectionIds.length === 0) return { date: today, message: 'No authorized sections found.' };

  // Filter by specific section name if requested
  if (params?.section_name) {
    const { data: matchSections } = await supabase
      .from('sections')
      .select('id, section_name')
      .in('id', sectionIds)
      .ilike('section_name', `%${params.section_name}%`);
    if (matchSections && matchSections.length > 0) {
      sectionIds = matchSections.map(s => s.id);
    }
  }

  // Get all students in authorized sections
  const { data: students } = await supabase
    .from('portal_users')
    .select('portal_id, name, section_id')
    .in('section_id', sectionIds)
    .eq('role', 'student');

  const studentIds = (students || []).map(s => s.portal_id);
  if (studentIds.length === 0) return { date: today, message: 'No students found in your sections.' };

  // Get today's attendance records — ONLY explicit records
  const { data: records } = await supabase
    .from('offering_attendance')
    .select('student_portal_id, status')
    .in('student_portal_id', studentIds)
    .eq('date', today);

  // CRITICAL: NO RECORD ≠ ABSENT
  if (!records || records.length === 0) {
    return {
      date: today,
      total_students: studentIds.length,
      message: 'Attendance has not been recorded yet today.'
    };
  }

  const absent = [];
  const present = [];
  const studentMap = {};
  (students || []).forEach(s => { studentMap[s.portal_id] = s.name; });

  records.forEach(r => {
    const name = studentMap[r.student_portal_id] || r.student_portal_id;
    if (r.status === 'absent') {
      absent.push({ name, portal_id: r.student_portal_id });
    } else if (r.status === 'present' || r.status === 'late' || r.status === 'excused') {
      present.push({ name, portal_id: r.student_portal_id });
    }
  });

  const recordedCount = records.length;
  const notRecorded = studentIds.length - recordedCount;

  return {
    date: today,
    total_students: studentIds.length,
    recorded: recordedCount,
    not_recorded: notRecorded,
    present_count: present.length,
    absent_count: absent.length,
    absent_students: absent,
    ...(notRecorded > 0 ? { note: `Attendance has not been recorded for ${notRecorded} students yet.` } : {})
  };
}

// ============================================================
// TOOL: getStudentAttendanceSummary
// ============================================================
async function getStudentAttendanceSummary(portalUser, params) {
  const { role, portal_id } = portalUser;

  let targetId = portal_id;
  if (role === 'student') {
    // Students can only see own attendance
    targetId = portal_id;
  } else if (params?.student_name || params?.student_portal_id) {
    // Teacher/HOD/Admin can look up a specific student
    if (params.student_portal_id) {
      targetId = params.student_portal_id;
    } else if (params.student_name) {
      const { data: found } = await supabase
        .from('portal_users')
        .select('portal_id')
        .eq('role', 'student')
        .ilike('name', `%${params.student_name}%`)
        .limit(1)
        .single();
      if (!found) return { message: `Student "${params.student_name}" not found.` };
      targetId = found.portal_id;
    }

    // SECURITY: Verify the target student is within the requester's authorized scope
    if (targetId !== portal_id) {
      const { data: targetStudent } = await supabase
        .from('portal_users')
        .select('section_id')
        .eq('portal_id', targetId)
        .single();

      if (!targetStudent?.section_id) {
        return { error: 'Student not found or has no section assigned.' };
      }

      if (role === 'teacher') {
        const teacherSections = await getTeacherSectionIds(portal_id);
        if (!teacherSections.includes(targetStudent.section_id)) {
          return { error: 'You are not authorized to view this student\'s attendance.' };
        }
      } else if (role === 'hod') {
        const deptId = await getHodDepartmentId(portal_id);
        if (deptId) {
          const deptSections = await getDepartmentSectionIds(deptId);
          if (!deptSections.includes(targetStudent.section_id)) {
            return { error: 'This student is not in your department.' };
          }
        } else {
          return { error: 'No department found for HOD.' };
        }
      }
      // Admin: no additional check needed (full scope)
    }
  }

  const { data: records } = await supabase
    .from('offering_attendance')
    .select('status, subject_offerings(subjects(code, name))')
    .eq('student_portal_id', targetId);

  if (!records || records.length === 0) {
    return { message: 'No attendance records found for this student.' };
  }

  // Aggregate by subject
  const bySubject = {};
  records.forEach(r => {
    const subj = r.subject_offerings?.subjects;
    const key = subj?.code || 'unknown';
    if (!bySubject[key]) {
      bySubject[key] = { subject: subj?.name || 'Unknown', code: key, total: 0, present: 0, absent: 0 };
    }
    bySubject[key].total++;
    if (r.status === 'present' || r.status === 'late' || r.status === 'excused') bySubject[key].present++;
    if (r.status === 'absent') bySubject[key].absent++;
  });

  const summary = Object.values(bySubject).map(s => ({
    ...s,
    percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
  }));

  const overall = summary.reduce((acc, s) => {
    acc.total += s.total;
    acc.present += s.present;
    return acc;
  }, { total: 0, present: 0 });

  return {
    student_id: targetId,
    overall_percentage: overall.total > 0 ? Math.round((overall.present / overall.total) * 100) : 0,
    subjects: summary
  };
}

// ============================================================
// TOOL: getLowAttendanceStudents
// ============================================================
async function getLowAttendanceStudents(portalUser, params) {
  const { role, portal_id } = portalUser;
  const threshold = params?.threshold || 75;

  if (role === 'student') return { error: 'Students cannot access class-wide attendance data.' };

  let sectionIds = [];
  if (role === 'teacher') {
    sectionIds = await getTeacherSectionIds(portal_id);
  } else if (role === 'hod') {
    const deptId = await getHodDepartmentId(portal_id);
    if (!deptId) return { error: 'No department found.' };
    sectionIds = await getDepartmentSectionIds(deptId);
  } else if (role === 'admin') {
    const { data } = await supabase.from('sections').select('id');
    sectionIds = (data || []).map(s => s.id);
  }

  if (sectionIds.length === 0) return { message: 'No sections found.' };

  const { data: students } = await supabase
    .from('portal_users')
    .select('portal_id, name')
    .in('section_id', sectionIds)
    .eq('role', 'student');

  if (!students || students.length === 0) return { message: 'No students found.' };

  const studentIds = students.map(s => s.portal_id);
  const { data: records } = await supabase
    .from('offering_attendance')
    .select('student_portal_id, status')
    .in('student_portal_id', studentIds);

  if (!records || records.length === 0) return { message: 'No attendance records found.' };

  // Aggregate per student
  const stats = {};
  students.forEach(s => { stats[s.portal_id] = { name: s.name, total: 0, present: 0 }; });
  records.forEach(r => {
    if (!stats[r.student_portal_id]) return;
    stats[r.student_portal_id].total++;
    if (r.status === 'present' || r.status === 'late' || r.status === 'excused') {
      stats[r.student_portal_id].present++;
    }
  });

  const lowAttendance = Object.entries(stats)
    .filter(([, s]) => s.total > 0 && Math.round((s.present / s.total) * 100) < threshold)
    .map(([id, s]) => ({
      name: s.name,
      portal_id: id,
      percentage: Math.round((s.present / s.total) * 100),
      total_classes: s.total,
      present: s.present
    }))
    .sort((a, b) => a.percentage - b.percentage);

  return {
    threshold,
    count: lowAttendance.length,
    students: lowAttendance
  };
}

// ============================================================
// TOOL: getAssignmentNonSubmitters
// ============================================================
async function getAssignmentNonSubmitters(portalUser, params) {
  const { role, portal_id } = portalUser;
  if (role === 'student') return { error: 'Students cannot view class submission data.' };

  // Find the assignment
  let assignmentQuery = supabase.from('assignments').select('id, title, offering_id, subject_id, due_date, max_marks, subject_offerings(section_id, teacher_portal_id, sections(department_id))');
  
  if (params?.assignment_title) {
    assignmentQuery = assignmentQuery.ilike('title', `%${params.assignment_title}%`);
  }
  if (params?.assignment_id) {
    assignmentQuery = assignmentQuery.eq('id', params.assignment_id);
  }

  const { data: assignments } = await assignmentQuery.in('status', ['published', 'closed']).limit(5);
  if (!assignments || assignments.length === 0) return { message: 'No matching assignments found.' };

  // Authorization filter
  // SECURITY: HOD must be restricted to their own department
  let hodDeptSectionIds = null;
  if (role === 'hod') {
    const deptId = await getHodDepartmentId(portal_id);
    hodDeptSectionIds = deptId ? await getDepartmentSectionIds(deptId) : [];
  }

  const authorized = assignments.filter(a => {
    if (role === 'admin') return true;
    if (role === 'teacher' && a.subject_offerings?.teacher_portal_id === portal_id) return true;
    if (role === 'hod' && hodDeptSectionIds) {
      return hodDeptSectionIds.includes(a.subject_offerings?.section_id);
    }
    return false;
  });

  if (authorized.length === 0) return { message: 'No authorized assignments found.' };

  const results = [];
  for (const assignment of authorized.slice(0, 3)) {
    const sectionId = assignment.subject_offerings?.section_id;
    if (!sectionId) continue;

    // Get students in the section
    const sectionStudents = await getSectionStudents(sectionId);
    const studentIds = sectionStudents.map(s => s.portal_id);

    // Get submissions
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('student_portal_id')
      .eq('assignment_id', assignment.id);

    const submittedIds = new Set((submissions || []).map(s => s.student_portal_id));
    const nonSubmitters = sectionStudents.filter(s => !submittedIds.has(s.portal_id));

    results.push({
      assignment_title: assignment.title,
      due_date: assignment.due_date,
      total_students: studentIds.length,
      submitted: submittedIds.size,
      not_submitted: nonSubmitters.length,
      non_submitters: nonSubmitters.map(s => ({ name: s.name }))
    });
  }

  return { assignments: results };
}

// ============================================================
// TOOL: getPendingAssignments
// ============================================================
async function getPendingAssignments(portalUser, params) {
  const { role, portal_id, section_id } = portalUser;

  if (role === 'student') {
    // Get offerings for student's section
    const { data: offerings } = await supabase
      .from('subject_offerings')
      .select('id, subjects(code, name)')
      .eq('section_id', section_id)
      .eq('status', 'active');
    
    if (!offerings || offerings.length === 0) return { message: 'No subjects found.' };
    const offeringIds = offerings.map(o => o.id);
    const offeringMap = {};
    offerings.forEach(o => { offeringMap[o.id] = o.subjects; });

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, due_date, max_marks, offering_id')
      .in('offering_id', offeringIds)
      .eq('status', 'published')
      .order('due_date');

    if (!assignments || assignments.length === 0) return { message: 'No pending assignments.' };

    // Get submissions for this student
    const { data: subs } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('student_portal_id', portal_id);
    const submittedSet = new Set((subs || []).map(s => s.assignment_id));

    const pending = assignments
      .filter(a => !submittedSet.has(a.id))
      .map(a => ({
        title: a.title,
        subject: offeringMap[a.offering_id]?.name || 'Unknown',
        due_date: a.due_date,
        max_marks: a.max_marks
      }));

    return { count: pending.length, pending_assignments: pending };
  }

  // Teacher/HOD/Admin — show assignments for their scope
  let offeringIds = [];
  if (role === 'teacher') {
    const offerings = await getTeacherOfferingIds(portal_id);
    offeringIds = offerings.map(o => o.id);
  } else if (role === 'hod') {
    const deptId = await getHodDepartmentId(portal_id);
    if (!deptId) return { message: 'No department found.' };
    const offerings = await getDepartmentOfferingIds(deptId);
    offeringIds = offerings.map(o => o.id);
  } else if (role === 'admin') {
    const { data } = await supabase.from('subject_offerings').select('id').eq('status', 'active');
    offeringIds = (data || []).map(o => o.id);
  }

  if (offeringIds.length === 0) return { message: 'No offerings found.' };

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, due_date, offering_id, subject_offerings(subjects(name))')
    .in('offering_id', offeringIds)
    .eq('status', 'published')
    .order('due_date');

  return {
    count: (assignments || []).length,
    pending_assignments: (assignments || []).map(a => ({
      title: a.title,
      subject: a.subject_offerings?.subjects?.name || 'Unknown',
      due_date: a.due_date
    }))
  };
}

// ============================================================
// TOOL: getTestResults / getTestNonTakers / getLowScorers
// ============================================================
async function getTestInfo(portalUser, params) {
  const { role, portal_id, section_id } = portalUser;

  if (role === 'student') {
    // Own results only
    const { data: offerings } = await supabase
      .from('subject_offerings')
      .select('id, subjects(code, name)')
      .eq('section_id', section_id)
      .eq('status', 'active');
    if (!offerings || offerings.length === 0) return { message: 'No subjects found.' };

    const offeringIds = offerings.map(o => o.id);
    const offeringMap = {};
    offerings.forEach(o => { offeringMap[o.id] = o.subjects; });

    const { data: tests } = await supabase
      .from('tests')
      .select('id, title, max_marks, offering_id, results_released, status')
      .in('offering_id', offeringIds)
      .in('status', ['published', 'closed']);

    if (!tests || tests.length === 0) return { message: 'No tests found.' };

    const testIds = tests.map(t => t.id);
    const { data: subs } = await supabase
      .from('test_submissions')
      .select('test_id, total_marks_obtained, status')
      .eq('student_portal_id', portal_id)
      .in('test_id', testIds);

    const subMap = {};
    (subs || []).forEach(s => { subMap[s.test_id] = s; });

    const results = tests.map(t => {
      const sub = subMap[t.id];
      return {
        title: t.title,
        subject: offeringMap[t.offering_id]?.name || 'Unknown',
        max_marks: t.max_marks,
        status: sub ? (t.results_released ? 'completed' : 'submitted') : 'not_taken',
        marks: sub && t.results_released ? sub.total_marks_obtained : null
      };
    });

    return { tests: results };
  }

  // Teacher/HOD/Admin
  let testQuery = supabase.from('tests').select('id, title, max_marks, offering_id, results_released, status, subject_offerings(section_id, teacher_portal_id, subjects(name), sections(department_id))');
  
  if (params?.test_title) {
    testQuery = testQuery.ilike('title', `%${params.test_title}%`);
  }
  
  const { data: tests } = await testQuery.in('status', ['published', 'closed']).limit(5);
  if (!tests || tests.length === 0) return { message: 'No tests found.' };

  // Auth filter
  // SECURITY: HOD must be restricted to their own department
  let hodTestDeptSectionIds = null;
  if (role === 'hod') {
    const deptId = await getHodDepartmentId(portal_id);
    hodTestDeptSectionIds = deptId ? await getDepartmentSectionIds(deptId) : [];
  }

  const authorized = tests.filter(t => {
    if (role === 'admin') return true;
    if (role === 'teacher' && t.subject_offerings?.teacher_portal_id === portal_id) return true;
    if (role === 'hod' && hodTestDeptSectionIds) {
      return hodTestDeptSectionIds.includes(t.subject_offerings?.section_id);
    }
    return false;
  });
  if (authorized.length === 0) return { message: 'No authorized tests found.' };

  const results = [];
  for (const test of authorized.slice(0, 3)) {
    const sectionId = test.subject_offerings?.section_id;
    if (!sectionId) continue;
    const sectionStudents = await getSectionStudents(sectionId);
    const studentIds = sectionStudents.map(s => s.portal_id);

    const { data: subs } = await supabase
      .from('test_submissions')
      .select('student_portal_id, total_marks_obtained, status, student_name')
      .eq('test_id', test.id);

    const submittedIds = new Set((subs || []).map(s => s.student_portal_id));
    const nonTakers = sectionStudents.filter(s => !submittedIds.has(s.portal_id));

    const passMark = params?.threshold || Math.floor(test.max_marks * 0.4);
    const lowScorers = (subs || [])
      .filter(s => s.total_marks_obtained !== null && s.total_marks_obtained < passMark)
      .map(s => ({ name: s.student_name || s.student_portal_id, marks: s.total_marks_obtained }));

    const scores = (subs || []).filter(s => s.total_marks_obtained !== null).map(s => s.total_marks_obtained);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const highest = scores.length > 0 ? Math.max(...scores) : null;
    const lowest = scores.length > 0 ? Math.min(...scores) : null;

    results.push({
      title: test.title,
      subject: test.subject_offerings?.subjects?.name || 'Unknown',
      max_marks: test.max_marks,
      total_students: studentIds.length,
      submitted: submittedIds.size,
      not_taken: nonTakers.length,
      non_takers: nonTakers.map(s => ({ name: s.name })),
      average: avg,
      highest,
      lowest,
      below_threshold: lowScorers.length,
      low_scorers: lowScorers
    });
  }

  return { tests: results };
}

// ============================================================
// TOOL: getTodayTimetable / getNextClass
// ============================================================
async function getTimetableInfo(portalUser, params) {
  const { role, portal_id, section_id } = portalUser;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  const wantNext = params?.next_class === true;

  if (role === 'student') {
    if (!section_id) return { message: 'No section assigned.' };

    const { data } = await supabase
      .from('timetable_entries')
      .select('day_of_week, period_number, start_time, end_time, room, subject_offerings(subjects(code, name))')
      .eq('section_id', section_id)
      .order('day_of_week')
      .order('period_number');

    if (!data || data.length === 0) return { message: 'No timetable entries found.' };

    if (wantNext) {
      // Find the next class from now
      let nextClass = data.find(e => e.day_of_week === dayOfWeek && e.start_time > currentTime);
      if (!nextClass) {
        // Look for next day
        for (let d = 1; d <= 7; d++) {
          const nextDay = (dayOfWeek + d) % 7;
          nextClass = data.find(e => e.day_of_week === nextDay);
          if (nextClass) break;
        }
      }
      if (!nextClass) return { message: 'No upcoming classes found.' };
      return {
        next_class: {
          subject: nextClass.subject_offerings?.subjects?.name || 'Unknown',
          code: nextClass.subject_offerings?.subjects?.code || '',
          day: dayName(nextClass.day_of_week),
          time: `${nextClass.start_time} - ${nextClass.end_time}`,
          room: nextClass.room,
          period: nextClass.period_number
        }
      };
    }

    // Today's timetable
    const todayEntries = data.filter(e => e.day_of_week === dayOfWeek);
    if (todayEntries.length === 0) return { message: 'No classes scheduled for today.' };

    return {
      day: dayName(dayOfWeek),
      classes: todayEntries.map(e => ({
        period: e.period_number,
        subject: e.subject_offerings?.subjects?.name || 'Unknown',
        code: e.subject_offerings?.subjects?.code || '',
        time: `${e.start_time} - ${e.end_time}`,
        room: e.room
      }))
    };
  }

  // Teacher
  if (role === 'teacher') {
    const { data: offerings } = await supabase
      .from('subject_offerings')
      .select('id')
      .eq('teacher_portal_id', portal_id)
      .eq('status', 'active');
    if (!offerings || offerings.length === 0) return { message: 'No offerings assigned.' };
    const offeringIds = offerings.map(o => o.id);

    const { data } = await supabase
      .from('timetable_entries')
      .select('day_of_week, period_number, start_time, end_time, room, subject_offerings(subjects(code, name), sections(section_name))')
      .in('offering_id', offeringIds)
      .order('day_of_week')
      .order('period_number');

    if (!data || data.length === 0) return { message: 'No timetable entries found.' };

    if (wantNext) {
      let nextClass = data.find(e => e.day_of_week === dayOfWeek && e.start_time > currentTime);
      if (!nextClass) {
        for (let d = 1; d <= 7; d++) {
          const nextDay = (dayOfWeek + d) % 7;
          nextClass = data.find(e => e.day_of_week === nextDay);
          if (nextClass) break;
        }
      }
      if (!nextClass) return { message: 'No upcoming classes found.' };
      return {
        next_class: {
          subject: nextClass.subject_offerings?.subjects?.name || 'Unknown',
          section: nextClass.subject_offerings?.sections?.section_name || '',
          day: dayName(nextClass.day_of_week),
          time: `${nextClass.start_time} - ${nextClass.end_time}`,
          room: nextClass.room
        }
      };
    }

    const todayEntries = data.filter(e => e.day_of_week === dayOfWeek);
    if (todayEntries.length === 0) return { message: 'No classes scheduled for today.' };

    return {
      day: dayName(dayOfWeek),
      classes: todayEntries.map(e => ({
        period: e.period_number,
        subject: e.subject_offerings?.subjects?.name || 'Unknown',
        section: e.subject_offerings?.sections?.section_name || '',
        time: `${e.start_time} - ${e.end_time}`,
        room: e.room
      }))
    };
  }

  // HOD/Admin — broader scope
  let sectionIds = [];
  if (role === 'hod') {
    const deptId = await getHodDepartmentId(portal_id);
    if (!deptId) return { message: 'No department found.' };
    sectionIds = await getDepartmentSectionIds(deptId);
  } else {
    const { data } = await supabase.from('sections').select('id');
    sectionIds = (data || []).map(s => s.id);
  }

  if (sectionIds.length === 0) return { message: 'No sections found.' };

  // Filter by section name if provided
  if (params?.section_name) {
    const { data: matchSections } = await supabase
      .from('sections')
      .select('id')
      .in('id', sectionIds)
      .ilike('section_name', `%${params.section_name}%`);
    if (matchSections) sectionIds = matchSections.map(s => s.id);
  }

  const { data } = await supabase
    .from('timetable_entries')
    .select('day_of_week, period_number, start_time, end_time, room, section_id, subject_offerings(subjects(code, name), sections(section_name))')
    .in('section_id', sectionIds)
    .eq('day_of_week', dayOfWeek)
    .order('period_number');

  return {
    day: dayName(dayOfWeek),
    count: (data || []).length,
    classes: (data || []).map(e => ({
      period: e.period_number,
      subject: e.subject_offerings?.subjects?.name || 'Unknown',
      section: e.subject_offerings?.sections?.section_name || '',
      time: `${e.start_time} - ${e.end_time}`,
      room: e.room
    }))
  };
}

// ============================================================
// TOOL: getMyAnnouncements
// ============================================================
async function getMyAnnouncements(portalUser, params) {
  const { role, portal_id, section_id, department_id } = portalUser;

  let query = supabase.from('announcements').select('title, message, scope, created_at, sender_portal_id')
    .order('created_at', { ascending: false }).limit(10);

  if (role === 'admin') {
    // Admin sees all
  } else if (role === 'student') {
    let targetIds = [];
    if (section_id) targetIds.push(section_id);
    const { data: sec } = await supabase.from('sections').select('department_id').eq('id', section_id).single();
    if (sec?.department_id) targetIds.push(sec.department_id);
    if (targetIds.length > 0) {
      query = query.or(`scope.eq.institution,target_id.in.(${targetIds.join(',')})`);
    } else {
      query = query.eq('scope', 'institution');
    }
  } else {
    query = query.or(`scope.eq.institution,sender_portal_id.eq.${portal_id}`);
  }

  const { data } = await query;
  return {
    count: (data || []).length,
    announcements: (data || []).map(a => ({
      title: a.title,
      message: a.message,
      scope: a.scope,
      date: a.created_at
    }))
  };
}

// ============================================================
// TOOL: getSectionStudentsList
// ============================================================
async function getSectionStudentsList(portalUser, params) {
  const { role, portal_id, section_id } = portalUser;

  if (role === 'student') {
    return { error: 'Students cannot view the full class roster.' };
  }

  let targetSectionIds = [];
  if (params?.section_name) {
    const { data: sections } = await supabase.from('sections').select('id, section_name').ilike('section_name', `%${params.section_name}%`);
    targetSectionIds = (sections || []).map(s => s.id);
  } else if (role === 'teacher') {
    targetSectionIds = await getTeacherSectionIds(portal_id);
  } else if (role === 'hod') {
    const deptId = await getHodDepartmentId(portal_id);
    if (!deptId) return { message: 'No department found.' };
    targetSectionIds = await getDepartmentSectionIds(deptId);
  } else if (role === 'admin') {
    const { data } = await supabase.from('sections').select('id');
    targetSectionIds = (data || []).map(s => s.id);
  }

  // Authorization: teacher can only see their own sections
  if (role === 'teacher' && params?.section_name) {
    const authSections = await getTeacherSectionIds(portal_id);
    targetSectionIds = targetSectionIds.filter(id => authSections.includes(id));
  }
  if (role === 'hod' && params?.section_name) {
    const deptId = await getHodDepartmentId(portal_id);
    const deptSections = deptId ? await getDepartmentSectionIds(deptId) : [];
    targetSectionIds = targetSectionIds.filter(id => deptSections.includes(id));
  }

  if (targetSectionIds.length === 0) return { message: 'No authorized sections found.' };

  const { data: students } = await supabase
    .from('portal_users')
    .select('portal_id, name, section_id')
    .in('section_id', targetSectionIds)
    .eq('role', 'student')
    .order('name');

  return {
    count: (students || []).length,
    students: (students || []).map(s => ({ name: s.name, portal_id: s.portal_id }))
  };
}

// ============================================================
// TOOL: getMyOfferings
// ============================================================
async function getMyOfferings(portalUser) {
  const { role, portal_id, section_id } = portalUser;

  if (role === 'student') {
    if (!section_id) return { message: 'No section assigned.' };
    const { data } = await supabase
      .from('subject_offerings')
      .select('id, subjects(code, name), sections(section_name)')
      .eq('section_id', section_id)
      .eq('status', 'active');
    return { offerings: (data || []).map(o => ({ id: o.id, subject: o.subjects?.name, code: o.subjects?.code, section: o.sections?.section_name })) };
  }

  if (role === 'teacher') {
    const { data } = await supabase
      .from('subject_offerings')
      .select('id, subjects(code, name), sections(section_name)')
      .eq('teacher_portal_id', portal_id)
      .eq('status', 'active');
    return { offerings: (data || []).map(o => ({ id: o.id, subject: o.subjects?.name, code: o.subjects?.code, section: o.sections?.section_name })) };
  }

  return { message: 'Use the offerings page for a complete view.' };
}

// ============================================================
// TOOL: getMyProfile
// ============================================================
async function getMyProfile(portalUser) {
  return {
    name: portalUser.name,
    portal_id: portalUser.portal_id,
    role: portalUser.role,
    department: portalUser.department || null
  };
}

// ============================================================
// TOOL: getGeneralHelp
// ============================================================
async function getGeneralHelp(portalUser, params) {
  return {
    help: `You are using Phazon Portal as a ${portalUser.role}. You can ask me about your attendance, assignments, tests, timetable, and announcements. For academic subject questions, switch to the Subject Tutor mode and select a subject.`
  };
}


// ============================================================
// DAY NAME HELPER
// ============================================================
function dayName(d) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d] || 'Unknown';
}


// ============================================================
// TOOL REGISTRY
// ============================================================
export const TOOL_REGISTRY = {
  ATTENDANCE_QUERY: {
    getTodayAttendance: { fn: getTodayAttendance, desc: 'Get today\'s attendance (who is present/absent)' },
    getStudentAttendanceSummary: { fn: getStudentAttendanceSummary, desc: 'Get attendance summary for a student' },
    getLowAttendanceStudents: { fn: getLowAttendanceStudents, desc: 'Get students with attendance below a threshold' }
  },
  ASSIGNMENT_QUERY: {
    getAssignmentNonSubmitters: { fn: getAssignmentNonSubmitters, desc: 'Get students who have not submitted an assignment' },
    getPendingAssignments: { fn: getPendingAssignments, desc: 'Get pending/open assignments' }
  },
  TEST_QUERY: {
    getTestInfo: { fn: getTestInfo, desc: 'Get test info including non-takers and low scorers' }
  },
  RESULT_QUERY: {
    getTestInfo: { fn: getTestInfo, desc: 'Get test results, scores, pass/fail info' }
  },
  TIMETABLE_QUERY: {
    getTimetableInfo: { fn: getTimetableInfo, desc: 'Get today\'s timetable or next class' }
  },
  ANNOUNCEMENT_QUERY: {
    getMyAnnouncements: { fn: getMyAnnouncements, desc: 'Get announcements for the user' }
  },
  STUDENT_QUERY: {
    getSectionStudentsList: { fn: getSectionStudentsList, desc: 'Get list of students in a section' },
    getStudentAttendanceSummary: { fn: getStudentAttendanceSummary, desc: 'Get a specific student\'s attendance' }
  },
  GENERAL_HELP: {
    getGeneralHelp: { fn: getGeneralHelp, desc: 'General portal help' }
  }
};

/**
 * Execute the right tool(s) for an intent.
 */
export async function executeTool(intent, portalUser, params) {
  const category = TOOL_REGISTRY[intent];
  if (!category) {
    return { message: 'I can help you with attendance, assignments, tests, timetable, and announcements. What would you like to know?' };
  }

  // Determine which specific tool to run based on params
  if (intent === 'ATTENDANCE_QUERY') {
    if (params?.threshold) return category.getLowAttendanceStudents.fn(portalUser, params);
    if (params?.student_name || params?.student_portal_id) return category.getStudentAttendanceSummary.fn(portalUser, params);
    return category.getTodayAttendance.fn(portalUser, params);
  }
  if (intent === 'ASSIGNMENT_QUERY') {
    if (params?.assignment_title || params?.assignment_id) return category.getAssignmentNonSubmitters.fn(portalUser, params);
    return category.getPendingAssignments.fn(portalUser, params);
  }
  if (intent === 'TEST_QUERY' || intent === 'RESULT_QUERY') {
    return category.getTestInfo.fn(portalUser, params);
  }
  if (intent === 'TIMETABLE_QUERY') {
    if (params?.next_class) return category.getTimetableInfo.fn(portalUser, { ...params, next_class: true });
    return category.getTimetableInfo.fn(portalUser, params);
  }
  if (intent === 'ANNOUNCEMENT_QUERY') {
    return category.getMyAnnouncements.fn(portalUser, params);
  }
  if (intent === 'STUDENT_QUERY') {
    if (params?.student_name) return category.getStudentAttendanceSummary.fn(portalUser, params);
    return category.getSectionStudentsList.fn(portalUser, params);
  }
  if (intent === 'GENERAL_HELP') {
    return category.getGeneralHelp.fn(portalUser, params);
  }

  return { message: 'I couldn\'t determine the right tool for your question. Try asking about attendance, assignments, tests, timetable, or announcements.' };
}
