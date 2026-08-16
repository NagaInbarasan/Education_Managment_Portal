/**
 * Phazon Backend — Analytics Service (Phase 18 Management Intelligence)
 * Deterministic academic performance aggregation, risk indicator calculations, fee metrics, library stats, support metrics, and report formatting.
 */

'use strict';

const supabase = require('../config/supabase');

// Standard Flag Constants
const FLAGS = {
  LOW_ATTENDANCE: 'LOW_ATTENDANCE',
  LOW_ASSIGNMENT_COMPLETION: 'LOW_ASSIGNMENT_COMPLETION',
  FAILED_COURSE: 'FAILED_COURSE',
  LOW_EXAM_PERFORMANCE: 'LOW_EXAM_PERFORMANCE',
  OUTSTANDING_FEE_BALANCE: 'OUTSTANDING_FEE_BALANCE',
};

/**
 * 1. STUDENT OVERVIEW ANALYTICS
 */
async function getStudentOverview(studentId, filters = {}) {
  // Fetch Attendance Summary
  const { data: attSummary } = await supabase
    .from('student_attendance_summary')
    .select('subject_id, present_count, absent_count, total_sessions, attendance_pct, subject:subjects(name, code)')
    .eq('student_id', studentId);

  const totalSessions = (attSummary || []).reduce((acc, curr) => acc + (curr.total_sessions || 0), 0);
  const presentSessions = (attSummary || []).reduce((acc, curr) => acc + (curr.present_count || 0), 0);
  const overallAttendancePct = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : null;

  // Fetch Assignment Summary
  const { data: assgSummary } = await supabase
    .from('student_assignment_summary')
    .select('class_id, subject_id, total_assignments, submitted_count, submission_pct, avg_marks, subject:subjects(name, code)')
    .eq('student_id', studentId);

  const totalAssg = (assgSummary || []).reduce((acc, curr) => acc + (curr.total_assignments || 0), 0);
  const submittedAssg = (assgSummary || []).reduce((acc, curr) => acc + (curr.submitted_count || 0), 0);
  const overallAssgPct = totalAssg > 0 ? Math.round((submittedAssg / totalAssg) * 100) : null;

  // Fetch Exam Attempts & Scores
  const { data: examAttempts } = await supabase
    .from('exam_attempts')
    .select('score, total_marks, percentage, status, exam:exams(id, title, max_marks, pass_marks, subject_id, subject:subjects(name, code))')
    .eq('student_id', studentId);

  let totalExamPct = null;
  let totalExamsAttempted = 0;
  let highestExamScore = null;
  let lowestExamScore = null;

  const validAttempts = (examAttempts || []).filter(a => a.percentage !== null && a.percentage !== undefined);
  if (validAttempts.length > 0) {
    totalExamsAttempted = validAttempts.length;
    const percentages = validAttempts.map(a => parseFloat(a.percentage));
    highestExamScore = Math.max(...percentages);
    lowestExamScore = Math.min(...percentages);
    totalExamPct = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
  }

  // Fetch Semester Grades & GPA
  const { data: grades } = await supabase
    .from('grades')
    .select('subject_id, semester_id, internal_marks, external_marks, total_marks, max_marks, grade, grade_point, status, subject:subjects(name, code, credits), semester:semesters(id, name, number)')
    .eq('student_id', studentId);

  const { data: gpaData } = await supabase
    .from('student_gpa')
    .select('semester_id, gpa, total_credits, subjects_count, semester:semesters(id, name, number)')
    .eq('student_id', studentId);

  // Calculate Cumulative GPA
  let currentGpa = null;
  if (gpaData && gpaData.length > 0) {
    const totalGpaPoints = gpaData.reduce((acc, curr) => acc + (parseFloat(curr.gpa || 0) * parseInt(curr.total_credits || 0, 10)), 0);
    const totalCredits = gpaData.reduce((acc, curr) => acc + parseInt(curr.total_credits || 0, 10), 0);
    currentGpa = totalCredits > 0 ? parseFloat((totalGpaPoints / totalCredits).toFixed(2)) : null;
  }

  // GPA Trend across semesters
  const gpaTrends = (gpaData || []).map(g => ({
    semesterId: g.semester_id,
    semesterName: g.semester?.name || `Semester ${g.semester?.number || ''}`,
    number: g.semester?.number || 0,
    gpa: g.gpa ? parseFloat(g.gpa) : null,
    totalCredits: g.total_credits
  })).sort((a, b) => a.number - b.number);

  // Fetch Fees Summary (Phase 15)
  const { data: feeRecords } = await supabase.from('student_fees').select('amount_due, amount_paid, balance, status').eq('student_id', studentId);
  let totalBilled = 0, totalPaid = 0, totalBalance = 0;
  (feeRecords || []).forEach(f => {
    totalBilled += parseFloat(f.amount_due || 0);
    totalPaid += parseFloat(f.amount_paid || 0);
    totalBalance += parseFloat(f.balance || 0);
  });

  // Per-Course Breakdown
  const coursePerformanceMap = {};
  (attSummary || []).forEach(a => {
    const subId = a.subject_id;
    if (!coursePerformanceMap[subId]) {
      coursePerformanceMap[subId] = { subjectId: subId, subjectName: a.subject?.name || 'Subject', subjectCode: a.subject?.code || '' };
    }
    coursePerformanceMap[subId].attendancePct = a.attendance_pct;
    coursePerformanceMap[subId].presentSessions = a.present_count;
    coursePerformanceMap[subId].totalSessions = a.total_sessions;
  });

  (assgSummary || []).forEach(a => {
    const subId = a.subject_id;
    if (!coursePerformanceMap[subId]) {
      coursePerformanceMap[subId] = { subjectId: subId, subjectName: a.subject?.name || 'Subject', subjectCode: a.subject?.code || '' };
    }
    coursePerformanceMap[subId].assignmentPct = a.submission_pct;
    coursePerformanceMap[subId].submittedAssg = a.submitted_count;
    coursePerformanceMap[subId].totalAssg = a.total_assignments;
  });

  (grades || []).forEach(g => {
    const subId = g.subject_id;
    if (!coursePerformanceMap[subId]) {
      coursePerformanceMap[subId] = { subjectId: subId, subjectName: g.subject?.name || 'Subject', subjectCode: g.subject?.code || '' };
    }
    coursePerformanceMap[subId].grade = g.grade;
    coursePerformanceMap[subId].gradePoint = g.grade_point;
    coursePerformanceMap[subId].totalMarks = g.total_marks;
    coursePerformanceMap[subId].maxMarks = g.max_marks;
    coursePerformanceMap[subId].status = g.grade === 'F' ? 'FAIL' : (g.grade ? 'PASS' : 'PENDING');
  });

  const coursePerformance = Object.values(coursePerformanceMap);

  // Deterministic Academic Risk Indicators (EXPLAINABLE)
  const academicFlags = [];
  if (overallAttendancePct !== null && overallAttendancePct < 75) {
    academicFlags.push({
      code: FLAGS.LOW_ATTENDANCE,
      label: 'Needs Attention: Low Attendance',
      reason: `Attendance is ${overallAttendancePct}% (below 75% threshold)`
    });
  }
  if (overallAssgPct !== null && overallAssgPct < 60) {
    academicFlags.push({
      code: FLAGS.LOW_ASSIGNMENT_COMPLETION,
      label: 'Needs Attention: Missing Assignments',
      reason: `Assignment completion rate is ${overallAssgPct}% (${totalAssg - submittedAssg} missing)`
    });
  }
  
  const failedCourses = coursePerformance.filter(c => c.status === 'FAIL' || c.grade === 'F');
  if (failedCourses.length > 0) {
    academicFlags.push({
      code: FLAGS.FAILED_COURSE,
      label: 'Needs Attention: Failed Course(s)',
      reason: `Failed ${failedCourses.length} course(s): ${failedCourses.map(c => c.subjectName).join(', ')}`
    });
  }

  if (totalExamPct !== null && totalExamPct < 50) {
    academicFlags.push({
      code: FLAGS.LOW_EXAM_PERFORMANCE,
      label: 'Needs Attention: Low Assessment Average',
      reason: `Average examination score is ${totalExamPct}%`
    });
  }

  if (totalBalance > 0) {
    academicFlags.push({
      code: FLAGS.OUTSTANDING_FEE_BALANCE,
      label: 'Needs Attention: Fee Due',
      reason: `Outstanding fee balance: ₹${totalBalance.toLocaleString('en-IN')}`
    });
  }

  return {
    studentId,
    currentGpa,
    gpaTrends,
    attendance: { overallPct: overallAttendancePct, totalSessions, presentSessions },
    assignments: { overallPct: overallAssgPct, totalAssg, submittedAssg },
    exams: { overallAveragePct: totalExamPct, totalAttempts: totalExamsAttempted, highestScore: highestExamScore, lowestScore: lowestExamScore },
    fees: { totalBilled, totalPaid, totalBalance },
    coursesPassed: coursePerformance.filter(c => c.status === 'PASS').length,
    coursesTotal: coursePerformance.length,
    coursePerformance,
    academicFlags,
    isAtRisk: academicFlags.length > 0
  };
}

/**
 * 2. TEACHER OVERVIEW ANALYTICS
 */
async function getTeacherOverview(teacherId, filters = {}) {
  let query = supabase.from('teacher_assignments').select('class_id, subject_id, class:classes(id, name, department_id), subject:subjects(id, name, code)').eq('teacher_id', teacherId);

  if (filters.class_id) query = query.eq('class_id', filters.class_id);
  if (filters.subject_id) query = query.eq('subject_id', filters.subject_id);

  const { data: assignments } = await query;
  if (!assignments || assignments.length === 0) {
    return { teacherId, studentCount: 0, averageAttendance: null, assignmentCompletion: null, averageExamScore: null, passRate: null, gradeDistribution: {}, studentPerformance: [], atRiskStudents: [] };
  }

  const classIds = [...new Set(assignments.map(a => a.class_id))];
  const subjectIds = [...new Set(assignments.map(a => a.subject_id))];

  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id, student:users!student_enrollments_student_id_fkey(id, name, email)')
    .in('class_id', classIds);

  const students = enrollments ? enrollments.map(e => e.student).filter(Boolean) : [];

  const { data: attData } = await supabase.from('student_attendance_summary').select('student_id, attendance_pct').in('class_id', classIds).in('subject_id', subjectIds);
  const { data: assgData } = await supabase.from('student_assignment_summary').select('student_id, submission_pct').in('class_id', classIds).in('subject_id', subjectIds);

  const studentPerformance = [];
  const atRiskStudents = [];

  for (const s of students) {
    const sAtt = (attData || []).filter(a => a.student_id === s.id);
    const sAssg = (assgData || []).filter(a => a.student_id === s.id);

    const attPct = sAtt.length > 0 ? Math.round(sAtt.reduce((a, b) => a + parseFloat(b.attendance_pct || 0), 0) / sAtt.length) : null;
    const assgPct = sAssg.length > 0 ? Math.round(sAssg.reduce((a, b) => a + parseFloat(b.submission_pct || 0), 0) / sAssg.length) : null;
    
    const flags = [];
    if (attPct !== null && attPct < 75) flags.push(`Attendance ${attPct}%`);
    if (assgPct !== null && assgPct < 60) flags.push(`Assignment rate ${assgPct}%`);

    const record = {
      studentId: s.id,
      name: s.name,
      email: s.email,
      attendancePct: attPct,
      assignmentPct: assgPct,
      status: flags.length > 0 ? 'NEEDS_ATTENTION' : 'GOOD',
      reasons: flags
    };

    studentPerformance.push(record);
    if (flags.length > 0) atRiskStudents.push(record);
  }

  const validAtt = studentPerformance.map(s => s.attendancePct).filter(v => v !== null);
  const avgAtt = validAtt.length > 0 ? Math.round(validAtt.reduce((a, b) => a + b, 0) / validAtt.length) : null;

  const validAssg = studentPerformance.map(s => s.assignmentPct).filter(v => v !== null);
  const avgAssg = validAssg.length > 0 ? Math.round(validAssg.reduce((a, b) => a + b, 0) / validAssg.length) : null;

  return {
    teacherId,
    studentCount: students.length,
    averageAttendance: avgAtt,
    assignmentCompletion: avgAssg,
    studentPerformance,
    atRiskStudents
  };
}

/**
 * 3. HOD DEPARTMENT OVERVIEW ANALYTICS
 */
async function getDepartmentOverview(departmentId, filters = {}) {
  const { data: deptClasses } = await supabase.from('classes').select('id, name').eq('department_id', departmentId);
  const classIds = deptClasses ? deptClasses.map(c => c.id) : [];

  if (classIds.length === 0) {
    return { departmentId, totalStudents: 0, totalTeachers: 0, totalCourses: 0, averageAttendance: null, assignmentCompletion: null, passRate: null, classComparison: [], attentionList: [] };
  }

  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id, class_id, student:users!student_enrollments_student_id_fkey(id, name, email)')
    .in('class_id', classIds);

  const totalStudents = enrollments ? [...new Set(enrollments.map(e => e.student_id))].length : 0;
  const { data: deptCourses } = await supabase.from('courses').select('id').eq('department_id', departmentId);
  const totalCourses = deptCourses ? deptCourses.length : 0;

  const { data: deptTeachers } = await supabase.from('teacher_assignments').select('teacher_id').in('class_id', classIds);
  const totalTeachers = deptTeachers ? [...new Set(deptTeachers.map(t => t.teacher_id))].length : 0;

  // Class Comparison Breakdown
  const classComparison = [];
  for (const cls of deptClasses) {
    const clsStudents = (enrollments || []).filter(e => e.class_id === cls.id);
    const { data: att } = await supabase.from('student_attendance_summary').select('attendance_pct').eq('class_id', cls.id);
    const { data: grades } = await supabase.from('grades').select('grade').in('student_id', clsStudents.map(s => s.student_id));

    const attPct = att && att.length > 0 ? Math.round(att.reduce((a, b) => a + parseFloat(b.attendance_pct || 0), 0) / att.length) : null;
    const passed = (grades || []).filter(g => g.grade && g.grade !== 'F').length;
    const totalGraded = (grades || []).filter(g => g.grade).length;
    const passRate = totalGraded > 0 ? Math.round((passed / totalGraded) * 100) : null;

    classComparison.push({
      classId: cls.id,
      className: cls.name,
      studentCount: clsStudents.length,
      averageAttendance: attPct,
      passRate
    });
  }

  // Fees Summary for Department
  const studentIds = enrollments ? [...new Set(enrollments.map(e => e.student_id))] : [];
  const { data: deptFees } = await supabase.from('student_fees').select('amount_due, amount_paid, balance').in('student_id', studentIds);
  let feeBilled = 0, feePaid = 0, feeBalance = 0;
  (deptFees || []).forEach(f => {
    feeBilled += parseFloat(f.amount_due || 0);
    feePaid += parseFloat(f.amount_paid || 0);
    feeBalance += parseFloat(f.balance || 0);
  });

  // Support Tickets for Department
  const { data: deptTickets } = await supabase.from('support_requests').select('id, status').eq('department_id', departmentId);
  const pendingTickets = (deptTickets || []).filter(t => ['OPEN', 'IN_REVIEW'].includes(t.status)).length;

  // Overall Attendance & Assignment
  const { data: overallAtt } = await supabase.from('student_attendance_summary').select('attendance_pct').in('class_id', classIds);
  const avgAtt = overallAtt && overallAtt.length > 0 ? Math.round(overallAtt.reduce((a, b) => a + parseFloat(b.attendance_pct || 0), 0) / overallAtt.length) : null;

  const { data: overallAssg } = await supabase.from('student_assignment_summary').select('submission_pct').in('class_id', classIds);
  const avgAssg = overallAssg && overallAssg.length > 0 ? Math.round(overallAssg.reduce((a, b) => a + parseFloat(b.submission_pct || 0), 0) / overallAssg.length) : null;

  // Attention List
  const attentionList = [];
  for (const sId of studentIds) {
    const perf = await getStudentOverview(sId);
    if (perf.isAtRisk) {
      const studentObj = enrollments.find(e => e.student_id === sId)?.student;
      attentionList.push({
        studentId: sId,
        name: studentObj?.name || 'Student',
        email: studentObj?.email || '',
        reasons: perf.academicFlags.map(f => f.reason)
      });
    }
  }

  return {
    departmentId,
    totalStudents,
    totalTeachers,
    totalCourses,
    averageAttendance: avgAtt,
    assignmentCompletion: avgAssg,
    classComparison,
    finance: { billed: feeBilled, paid: feePaid, balance: feeBalance },
    pendingSupportTickets: pendingTickets,
    attentionList
  };
}

/**
 * 4. ADMIN GLOBAL OVERVIEW ANALYTICS
 */
async function getAdminOverview(filters = {}) {
  const { data: depts } = await supabase.from('departments').select('id, name, code');
  const { data: students } = await supabase.from('users').select('id').eq('role', 'student');
  const { data: teachers } = await supabase.from('users').select('id').eq('role', 'teacher');
  const { data: courses } = await supabase.from('courses').select('id');

  const departmentComparison = [];
  for (const d of (depts || [])) {
    const deptOverview = await getDepartmentOverview(d.id, filters);
    departmentComparison.push({
      departmentId: d.id,
      name: d.name,
      code: d.code,
      studentCount: deptOverview.totalStudents,
      averageAttendance: deptOverview.averageAttendance,
      financeBalance: deptOverview.finance?.balance || 0,
      attentionCount: deptOverview.attentionList?.length || 0
    });
  }

  // Global Financial Summary
  const { data: allFees } = await supabase.from('student_fees').select('amount_due, amount_paid, balance');
  let globalBilled = 0, globalPaid = 0, globalBalance = 0;
  (allFees || []).forEach(f => {
    globalBilled += parseFloat(f.amount_due || 0);
    globalPaid += parseFloat(f.amount_paid || 0);
    globalBalance += parseFloat(f.balance || 0);
  });

  // Global Library & Support Stats
  const { data: loans } = await supabase.from('library_loans').select('id, status');
  const totalLoans = (loans || []).length;
  const activeLoans = (loans || []).filter(l => l.status === 'ACTIVE').length;
  const overdueLoans = (loans || []).filter(l => l.status === 'OVERDUE').length;

  const { data: tickets } = await supabase.from('support_requests').select('id, status');
  const openTickets = (tickets || []).filter(t => ['OPEN', 'IN_REVIEW'].includes(t.status)).length;

  return {
    totalDepartments: (depts || []).length,
    totalStudents: (students || []).length,
    totalTeachers: (teachers || []).length,
    totalCourses: (courses || []).length,
    finance: { totalBilled: globalBilled, totalPaid: globalPaid, outstandingBalance: globalBalance },
    library: { totalLoans, activeLoans, overdueLoans },
    support: { openTickets },
    departmentComparison
  };
}

/**
 * Generate CSV Report Content
 */
function formatCsvReport(data, reportType = 'GENERAL') {
  if (Array.isArray(data)) {
    if (data.length === 0) return 'No data available\n';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    return [headers, ...rows].join('\n');
  } else if (typeof data === 'object') {
    const lines = [`Report Type,${reportType}`, `Generated At,${new Date().toISOString()}`];
    Object.entries(data).forEach(([k, v]) => {
      if (typeof v !== 'object') lines.push(`"${k}","${v}"`);
    });
    return lines.join('\n');
  }
  return String(data);
}

module.exports = {
  FLAGS,
  getStudentOverview,
  getTeacherOverview,
  getDepartmentOverview,
  getAdminOverview,
  formatCsvReport,
};
