/**
 * Phazon Backend — Student Enrollments Controller
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');

/**
 * GET /api/enrollments
 */
async function getEnrollments(req, res, next) {
  try {
    const { student_id, class_id } = req.query;

    let query = supabase
      .from('student_enrollments')
      .select('id, student_id, class_id, enrolled_at, student:users!student_enrollments_student_id_fkey(id, name, email), class:classes(id, name, department_id, semester_id)');

    if (student_id) query = query.eq('student_id', student_id);
    if (class_id) query = query.eq('class_id', class_id);

    if (req.userRole === 'teacher' || req.userRole === 'student') {
      if (!req.classIds || req.classIds.length === 0) return res.status(200).json({ success: true, data: [] });
      query = query.in('class_id', req.classIds);
    }

    const { data: enrollments, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: enrollments || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/enrollments
 */
async function enrollStudent(req, res, next) {
  try {
    const { student_id, class_id } = req.body;

    if (!student_id || !class_id) {
      return res.status(400).json({ success: false, message: 'student_id and class_id are required.' });
    }

    if (req.userRole === 'hod') {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', class_id).single();
      if (cls) assertDepartmentScope(req, cls.department_id);
    }

    const { data: enrollment, error } = await supabase
      .from('student_enrollments')
      .insert([{ student_id, class_id }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, message: 'Student enrolled successfully.', data: enrollment });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/enrollments/:id
 */
async function removeEnrollment(req, res, next) {
  try {
    const { id } = req.params;

    if (req.userRole === 'hod') {
      const { data: enrollment } = await supabase.from('student_enrollments').select('class_id').eq('id', id).single();
      if (enrollment) {
        const { data: cls } = await supabase.from('classes').select('department_id').eq('id', enrollment.class_id).single();
        if (cls) assertDepartmentScope(req, cls.department_id);
      }
    }

    const { error } = await supabase
      .from('student_enrollments')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Enrollment removed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEnrollments,
  enrollStudent,
  removeEnrollment,
};
