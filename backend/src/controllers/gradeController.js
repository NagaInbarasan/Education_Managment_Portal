/**
 * Phazon Backend — Grades Controller (Phase 19 Hardened)
 * Handles semester grade entry and student GPA calculations.
 * Security: Class-scope verification for teacher grade recording (H1, M6).
 */

'use strict';

const supabase = require('../config/supabase');
const { createNotification } = require('../services/notificationService');

/**
 * POST /api/grades
 * Upsert grade for a student, subject, and semester.
 * SECURITY (H1): Teacher must be assigned to a class the student is enrolled in.
 */
async function recordGrade(req, res, next) {
  try {
    const { student_id, subject_id, semester_id, internal_marks, external_marks, total_marks, max_marks, grade, grade_point, remarks } = req.body;
    const teacher_id = req.userId;

    if (!student_id || !subject_id || !semester_id) {
      return res.status(400).json({ success: false, message: 'student_id, subject_id, and semester_id are required.' });
    }

    // SECURITY (H1): Verify teacher is assigned to a class that the student is enrolled in
    if (req.userRole === 'teacher') {
      const teacherClassIds = req.classIds || [];
      if (teacherClassIds.length === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden: You have no class assignments.' });
      }

      const { data: studentEnrollment } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', student_id)
        .in('class_id', teacherClassIds)
        .maybeSingle();

      if (!studentEnrollment) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: This student is not enrolled in any of your assigned classes.',
        });
      }
    }

    // HOD: Verify student is in their department
    if (req.userRole === 'hod' && req.departmentId) {
      const { data: studentEnr } = await supabase
        .from('student_enrollments')
        .select('class:classes(department_id)')
        .eq('student_id', student_id)
        .maybeSingle();

      if (!studentEnr || studentEnr.class?.department_id !== req.departmentId) {
        return res.status(403).json({ success: false, message: 'Forbidden: Student is not in your department.' });
      }
    }

    const calculatedTotal = total_marks !== undefined
      ? parseInt(total_marks, 10)
      : (parseInt(internal_marks || 0, 10) + parseInt(external_marks || 0, 10));

    const { data: gradeRecord, error } = await supabase
      .from('grades')
      .upsert([{
        student_id,
        subject_id,
        semester_id,
        internal_marks: internal_marks !== undefined ? parseInt(internal_marks, 10) : null,
        external_marks: external_marks !== undefined ? parseInt(external_marks, 10) : null,
        total_marks: calculatedTotal,
        max_marks: max_marks ? parseInt(max_marks, 10) : 100,
        grade: grade || null,
        grade_point: grade_point !== undefined ? parseFloat(grade_point) : null,
        remarks: remarks || null,
        updated_by: teacher_id,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'student_id,subject_id,semester_id' })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Trigger Notification
    createNotification({
      recipient_id: student_id,
      sender_id: teacher_id,
      type: 'RESULT_PUBLISHED',
      title: 'Course Grade Recorded',
      message: `Your final grade for this subject has been updated to ${grade || calculatedTotal}.`,
      entity_type: 'grade',
      entity_id: gradeRecord.id
    }).catch(err => console.error('[NotificationTrigger] Grade record error:', err.message));

    return res.status(200).json({ success: true, message: 'Grade recorded.', data: gradeRecord });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/grades/my-grades
 * Student fetches own grades and GPA.
 */
async function getMyGrades(req, res, next) {
  try {
    const student_id = req.query.student_id && ['admin', 'hod', 'teacher'].includes(req.userRole)
      ? req.query.student_id
      : req.userId;

    // Fetch individual subject grades
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('id, subject_id, semester_id, internal_marks, external_marks, total_marks, max_marks, grade, grade_point, remarks, subject:subjects(name, code, credits), semester:semesters(name, number)')
      .eq('student_id', student_id);

    if (gradesError) {
      return res.status(500).json({ success: false, message: gradesError.message });
    }

    // Fetch GPA summary from view
    const { data: gpaSummary } = await supabase
      .from('student_gpa')
      .select('semester_id, gpa, total_credits, subjects_count')
      .eq('student_id', student_id);

    return res.status(200).json({
      success: true,
      grades: grades || [],
      gpaSummary: gpaSummary || [],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/grades/class/:classId
 * Staff fetches class grade report.
 * SECURITY (M6): Teacher must be assigned to the requested class.
 */
async function getClassGrades(req, res, next) {
  try {
    const { classId } = req.params;

    // SECURITY (M6): Teacher class-scope verification
    if (req.userRole === 'teacher') {
      const teacherClassIds = req.classIds || [];
      if (!teacherClassIds.includes(classId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this class.' });
      }
    }

    // HOD: Verify class belongs to their department
    if (req.userRole === 'hod' && req.departmentId) {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', classId).single();
      if (cls && cls.department_id !== req.departmentId) {
        return res.status(403).json({ success: false, message: 'Forbidden: This class is not in your department.' });
      }
    }

    // Fetch class enrollments
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('class_id', classId);

    const studentIds = (enrollments || []).map(e => e.student_id);

    if (studentIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const { data: grades, error } = await supabase
      .from('grades')
      .select('id, student_id, subject_id, semester_id, total_marks, max_marks, grade, grade_point, student:users!grades_student_id_fkey(name, email), subject:subjects(name, code)')
      .in('student_id', studentIds);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: grades || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordGrade,
  getMyGrades,
  getClassGrades,
};
