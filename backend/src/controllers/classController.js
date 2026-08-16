/**
 * Phazon Backend — Class Controller
 * Handles CRUD operations for Classes.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope, assertClassScope } = require('../middleware/scopeGuard');

/**
 * GET /api/classes
 */
async function getAllClasses(req, res, next) {
  try {
    const { department_id, semester_id } = req.query;

    let query = supabase
      .from('classes')
      .select('id, name, department_id, semester_id, created_at, department:departments(name, code), semester:semesters(name, number)');

    if (department_id) query = query.eq('department_id', department_id);
    if (semester_id) query = query.eq('semester_id', semester_id);

    // Apply role-based filtering
    if (req.userRole === 'hod') {
      query = query.eq('department_id', req.departmentId);
    } else if (req.userRole === 'teacher' || req.userRole === 'student') {
      if (!req.classIds || req.classIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
      query = query.in('id', req.classIds);
    }

    const { data: classes, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: classes || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/classes/:id
 */
async function getClassById(req, res, next) {
  try {
    const { id } = req.params;

    const { data: cls, error } = await supabase
      .from('classes')
      .select('id, name, department_id, semester_id, created_at, department:departments(name, code), semester:semesters(name, number)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    // Verify scope access
    if (req.userRole === 'hod') assertDepartmentScope(req, cls.department_id);
    else if (req.userRole === 'teacher' || req.userRole === 'student') assertClassScope(req, id);

    // Fetch enrolled students
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('id, enrolled_at, student:users(id, name, email, phone)')
      .eq('class_id', id);

    // Fetch assigned teachers & subjects
    const { data: teacherAssignments } = await supabase
      .from('teacher_assignments')
      .select('id, teacher:users(id, name, email), subject:subjects(id, name, code, credits)')
      .eq('class_id', id);

    return res.status(200).json({
      success: true,
      data: {
        ...cls,
        students: (enrollments || []).map(e => e.student),
        teacherAssignments: teacherAssignments || [],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/classes
 */
async function createClass(req, res, next) {
  try {
    const { name, department_id, semester_id } = req.body;

    if (!name || !department_id || !semester_id) {
      return res.status(400).json({ success: false, message: 'Class name, department_id, and semester_id are required.' });
    }

    // HOD can only create classes in their own department
    assertDepartmentScope(req, department_id);

    const { data: cls, error } = await supabase
      .from('classes')
      .insert([{ name: name.trim(), department_id, semester_id }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, message: 'Class created.', data: cls });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/classes/:id
 */
async function updateClass(req, res, next) {
  try {
    const { id } = req.params;
    const { name, department_id, semester_id } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (department_id) {
      assertDepartmentScope(req, department_id);
      updates.department_id = department_id;
    }
    if (semester_id) updates.semester_id = semester_id;

    // Check existing class for HOD scope before update
    if (req.userRole === 'hod') {
      const { data: existing } = await supabase.from('classes').select('department_id').eq('id', id).single();
      if (existing) assertDepartmentScope(req, existing.department_id);
    }

    const { data: cls, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Class updated.', data: cls });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/classes/:id
 */
async function deleteClass(req, res, next) {
  try {
    const { id } = req.params;

    // Check existing class for HOD scope before delete
    if (req.userRole === 'hod') {
      const { data: existing } = await supabase.from('classes').select('department_id').eq('id', id).single();
      if (existing) assertDepartmentScope(req, existing.department_id);
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Class deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
};
