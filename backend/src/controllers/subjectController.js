/**
 * Phazon Backend — Subject Controller
 * Handles CRUD operations for Subjects.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');

/**
 * GET /api/subjects
 */
async function getAllSubjects(req, res, next) {
  try {
    const { department_id, semester_id } = req.query;

    let query = supabase
      .from('subjects')
      .select('id, name, code, credits, department_id, semester_id, department:departments(name, code), semester:semesters(name, number)');

    if (department_id) query = query.eq('department_id', department_id);
    if (semester_id) query = query.eq('semester_id', semester_id);

    if (req.userRole === 'hod') {
      query = query.eq('department_id', req.departmentId);
    }

    const { data: subjects, error } = await query.order('code', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: subjects || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/subjects/:id
 */
async function getSubjectById(req, res, next) {
  try {
    const { id } = req.params;

    const { data: subject, error } = await supabase
      .from('subjects')
      .select('id, name, code, credits, department_id, semester_id, department:departments(name, code), semester:semesters(name, number)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    if (req.userRole === 'hod') assertDepartmentScope(req, subject.department_id);

    return res.status(200).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/subjects
 */
async function createSubject(req, res, next) {
  try {
    const { name, code, department_id, semester_id, credits } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Subject name and code are required.' });
    }

    assertDepartmentScope(req, department_id);

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert([{
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department_id: department_id || null,
        semester_id: semester_id || null,
        credits: credits ? parseInt(credits, 10) : 3,
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, message: 'Subject created.', data: subject });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/subjects/:id
 */
async function updateSubject(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, department_id, semester_id, credits } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (code) updates.code = code.trim().toUpperCase();
    if (department_id !== undefined) {
      assertDepartmentScope(req, department_id);
      updates.department_id = department_id;
    }
    if (semester_id !== undefined) updates.semester_id = semester_id;
    if (credits !== undefined) updates.credits = parseInt(credits, 10);

    if (req.userRole === 'hod') {
      const { data: existing } = await supabase.from('subjects').select('department_id').eq('id', id).single();
      if (existing) assertDepartmentScope(req, existing.department_id);
    }

    const { data: subject, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Subject updated.', data: subject });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/subjects/:id
 */
async function deleteSubject(req, res, next) {
  try {
    const { id } = req.params;

    if (req.userRole === 'hod') {
      const { data: existing } = await supabase.from('subjects').select('department_id').eq('id', id).single();
      if (existing) assertDepartmentScope(req, existing.department_id);
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Subject deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};
