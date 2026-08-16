/**
 * Phazon Backend — Teacher Assignments Controller
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');

/**
 * GET /api/teacher-assignments
 */
async function getTeacherAssignments(req, res, next) {
  try {
    const { teacher_id, class_id, subject_id } = req.query;

    let query = supabase
      .from('teacher_assignments')
      .select('id, teacher_id, class_id, subject_id, created_at, teacher:users!teacher_assignments_teacher_id_fkey(id, name, email), class:classes(id, name), subject:subjects(id, name, code)');

    if (teacher_id) query = query.eq('teacher_id', teacher_id);
    if (class_id) query = query.eq('class_id', class_id);
    if (subject_id) query = query.eq('subject_id', subject_id);

    if (req.userRole === 'teacher') {
      query = query.eq('teacher_id', req.userId);
    } else if (req.userRole === 'student') {
      if (!req.classIds || req.classIds.length === 0) return res.status(200).json({ success: true, data: [] });
      query = query.in('class_id', req.classIds);
    }

    const { data: assignments, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: assignments || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/teacher-assignments
 */
async function assignTeacher(req, res, next) {
  try {
    const { teacher_id, class_id, subject_id } = req.body;

    if (!teacher_id || !class_id || !subject_id) {
      return res.status(400).json({ success: false, message: 'teacher_id, class_id, and subject_id are required.' });
    }

    if (req.userRole === 'hod') {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', class_id).single();
      if (cls) assertDepartmentScope(req, cls.department_id);
    }

    const { data: assignment, error } = await supabase
      .from('teacher_assignments')
      .insert([{ teacher_id, class_id, subject_id }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, message: 'Teacher assigned successfully.', data: assignment });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/teacher-assignments/:id
 */
async function removeTeacherAssignment(req, res, next) {
  try {
    const { id } = req.params;

    if (req.userRole === 'hod') {
      const { data: assignment } = await supabase.from('teacher_assignments').select('class_id').eq('id', id).single();
      if (assignment) {
        const { data: cls } = await supabase.from('classes').select('department_id').eq('id', assignment.class_id).single();
        if (cls) assertDepartmentScope(req, cls.department_id);
      }
    }

    const { error } = await supabase
      .from('teacher_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Teacher assignment removed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTeacherAssignments,
  assignTeacher,
  removeTeacherAssignment,
};
