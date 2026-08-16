/**
 * Phazon Backend — Academic Context Service
 * Prepares sanitized, minimum academic context for AI prompts.
 * Strictly prevents secret leakage (no passwords, tokens, API keys, or Phase 8 exam answer keys).
 */

'use strict';

const supabase = require('../config/supabase');
const {
  getStudentOverview,
  getTeacherOverview,
  getDepartmentOverview,
  getAdminOverview
} = require('./analyticsService');

/**
 * Build student academic context
 */
async function getStudentContext(studentId) {
  // Fetch deterministic performance overview
  const perf = await getStudentOverview(studentId);

  // Fetch upcoming exams for the student's classes (Phase 8)
  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('class_id')
    .eq('student_id', studentId);

  const classIds = (enrollments || []).map(e => e.class_id);

  let upcomingExams = [];
  if (classIds.length > 0) {
    const now = new Date().toISOString();
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, exam_type, start_at, end_at, duration_minutes, max_marks, subject:subjects(name, code)')
      .in('class_id', classIds)
      .in('status', ['PUBLISHED', 'SCHEDULED', 'LIVE'])
      .order('start_at', { ascending: true });

    upcomingExams = (exams || []).map(e => ({
      examId: e.id,
      title: e.title,
      type: e.exam_type,
      subject: e.subject?.name || 'Subject',
      startDate: e.start_at,
      endDate: e.end_at,
      durationMinutes: e.duration_minutes,
      maxMarks: e.max_marks
    }));
  }

  // Sanitized student context payload
  return {
    studentId,
    gpa: perf.currentGpa,
    gpaTrends: perf.gpaTrends,
    attendancePct: perf.attendance.overallPct,
    assignmentCompletionPct: perf.assignments.overallPct,
    examAveragePct: perf.exams.overallAveragePct,
    coursesPassed: perf.coursesPassed,
    coursesTotal: perf.coursesTotal,
    coursePerformance: perf.coursePerformance.map(c => ({
      subjectName: c.subjectName,
      subjectCode: c.subjectCode,
      attendancePct: c.attendancePct,
      assignmentPct: c.assignmentPct,
      grade: c.grade,
      status: c.status
    })),
    academicFlags: perf.academicFlags,
    upcomingExams
  };
}

/**
 * Build teacher academic context
 */
async function getTeacherContext(teacherId, filters = {}) {
  const perf = await getTeacherOverview(teacherId, filters);
  return {
    teacherId,
    studentCount: perf.studentCount,
    averageAttendancePct: perf.averageAttendance,
    assignmentCompletionPct: perf.assignmentCompletion,
    averageExamScorePct: perf.averageExamScore,
    passRatePct: perf.passRate,
    gradeDistribution: perf.gradeDistribution,
    atRiskCount: perf.atRiskStudents.length,
    studentRosterSummary: perf.studentPerformance.map(s => ({
      name: s.name,
      attendancePct: s.attendancePct,
      assignmentPct: s.assignmentPct,
      examPct: s.examPct,
      grade: s.grade,
      status: s.status,
      flags: s.flags
    }))
  };
}

/**
 * Build HOD academic context
 */
async function getHodContext(departmentId, filters = {}) {
  const perf = await getDepartmentOverview(departmentId, filters);
  return {
    departmentId,
    totalStudents: perf.totalStudents,
    totalTeachers: perf.totalTeachers,
    totalCourses: perf.totalCourses,
    averageAttendancePct: perf.averageAttendance,
    assignmentCompletionPct: perf.assignmentCompletion,
    passRatePct: perf.passRate,
    classComparison: perf.classComparison,
    gradeDistribution: perf.gradeDistribution,
    attentionCount: perf.attentionList.length,
    attentionListSummary: perf.attentionList.map(a => ({
      name: a.name,
      flagsCount: a.flags.length
    }))
  };
}

/**
 * Build Admin academic context
 */
async function getAdminContext(filters = {}) {
  const perf = await getAdminOverview(filters);
  return {
    totalDepartments: perf.totalDepartments,
    totalStudents: perf.totalStudents,
    totalTeachers: perf.totalTeachers,
    totalCourses: perf.totalCourses,
    overallAttendancePct: perf.overallAttendance,
    assignmentCompletionPct: perf.assignmentCompletion,
    passRatePct: perf.passRate,
    gradeDistribution: perf.gradeDistribution,
    departmentComparison: perf.departmentComparison
  };
}

module.exports = {
  getStudentContext,
  getTeacherContext,
  getHodContext,
  getAdminContext,
};
