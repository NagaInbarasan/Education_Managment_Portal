/**
 * Phazon Backend — Department Controller
 * Handles CRUD operations for Academic Departments.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');

/**
 * GET /api/departments
 */
async function getAllDepartments(req, res, next) {
  try {
    const { data: departments, error } = await supabase
      .from('departments')
      .select('id, name, code, hod_id, created_at')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Populate HOD user details
    const hodIds = [...new Set((departments || []).map(d => d.hod_id).filter(Boolean))];
    let hodMap = {};
    if (hodIds.length > 0) {
      const { data: hods } = await supabase.from('users').select('id, name, email').in('id', hodIds);
      (hods || []).forEach(h => { hodMap[h.id] = h; });
    }

    const result = (departments || []).map(d => ({
      ...d,
      hod: d.hod_id ? (hodMap[d.hod_id] || null) : null,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/departments/:id
 */
async function getDepartmentById(req, res, next) {
  try {
    const { id } = req.params;
    console.log('[DEBUG] getDepartmentById requested id:', id);

    const { data: department, error } = await supabase
      .from('departments')
      .select('id, name, code, hod_id, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    let hod = null;
    if (department.hod_id) {
      const { data: hodUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', department.hod_id)
        .maybeSingle();
      hod = hodUser || null;
    }

    // Fetch associated classes & subjects
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, semester_id, semester:semesters(name)')
      .eq('department_id', id);

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code, credits, semester_id')
      .eq('department_id', id);

    return res.status(200).json({
      success: true,
      data: {
        ...department,
        hod,
        classes: classes || [],
        subjects: subjects || [],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/departments (Admin Only)
 */
async function createDepartment(req, res, next) {
  try {
    const { name, code, hod_id } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required.' });
    }

    const { data: department, error } = await supabase
      .from('departments')
      .insert([{ name: name.trim(), code: code.trim().toUpperCase(), hod_id: hod_id || null }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, message: 'Department created.', data: department });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/departments/:id (Admin / HOD)
 */
async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, hod_id } = req.body;

    // HODs can only update their own department
    assertDepartmentScope(req, id);

    const updates = {};
    if (name) updates.name = name.trim();
    if (code) updates.code = code.trim().toUpperCase();
    if (hod_id !== undefined) updates.hod_id = hod_id || null;

    const { data: department, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Department updated.', data: department });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/departments/:id (Admin Only)
 */
async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Department deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
