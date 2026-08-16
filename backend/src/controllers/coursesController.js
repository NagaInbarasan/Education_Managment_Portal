/**
 * Phazon Backend — Academic Courses Controller
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');

/**
 * GET /api/courses
 */
async function getAllCourses(req, res, next) {
  try {
    const { department_id, semester_id, subject_id, teacher_id, status } = req.query;

    let query = supabase
      .from('courses')
      .select('id, name, code, description, credits, department_id, subject_id, semester_id, teacher_id, syllabus, schedule, cover_url, status, created_at, department:departments(name, code), subject:subjects(name, code), semester:semesters(name, number), teacher:users!courses_teacher_id_fkey(id, name, email)');

    if (department_id) query = query.eq('department_id', department_id);
    if (semester_id)   query = query.eq('semester_id', semester_id);
    if (subject_id)    query = query.eq('subject_id', subject_id);
    if (teacher_id)    query = query.eq('teacher_id', teacher_id);
    if (status)        query = query.eq('status', status);

    if (req.userRole === 'hod') {
      query = query.eq('department_id', req.departmentId);
    } else if (req.userRole === 'teacher') {
      query = query.eq('teacher_id', req.userId);
    }

    const { data: courses, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: courses || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/courses/:id
 */
async function getCourseById(req, res, next) {
  try {
    const { id } = req.params;

    const { data: course, error } = await supabase
      .from('courses')
      .select('id, name, code, description, credits, department_id, subject_id, semester_id, teacher_id, syllabus, schedule, cover_url, status, created_at, department:departments(name, code), subject:subjects(name, code), semester:semesters(name, number), teacher:users!courses_teacher_id_fkey(id, name, email)')
      .or(`id.eq.${id},code.eq.${id.toUpperCase()}`)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.userRole === 'hod') assertDepartmentScope(req, course.department_id);
    if (req.userRole === 'teacher' && course.teacher_id !== req.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this course.' });
    }

    return res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/courses (Admin / HOD / Teacher)
 */
async function createCourse(req, res, next) {
  try {
    const { name, code, description, department_id, subject_id, semester_id, credits, teacher_id, syllabus, schedule, cover_url, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Course name and code are required.' });
    }

    if (req.userRole === 'hod') assertDepartmentScope(req, department_id);

    const newCourse = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
      department_id: department_id || null,
      subject_id: subject_id || null,
      semester_id: semester_id || null,
      credits: credits ? parseInt(credits, 10) : 3,
      teacher_id: teacher_id || req.userId || null,
      syllabus: syllabus || [],
      schedule: schedule || {},
      cover_url: cover_url || null,
      status: status || 'active',
    };

    const { data: course, error } = await supabase
      .from('courses')
      .insert([newCourse])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, message: 'Course created.', data: course });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/courses/:id
 */
async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, description, department_id, subject_id, semester_id, credits, teacher_id, syllabus, schedule, cover_url, status } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (code) updates.code = code.trim().toUpperCase();
    if (description !== undefined) updates.description = description;
    if (department_id !== undefined) {
      if (req.userRole === 'hod') assertDepartmentScope(req, department_id);
      updates.department_id = department_id;
    }
    if (subject_id !== undefined) updates.subject_id = subject_id;
    if (semester_id !== undefined) updates.semester_id = semester_id;
    if (credits !== undefined) updates.credits = parseInt(credits, 10);
    if (teacher_id !== undefined) updates.teacher_id = teacher_id;
    if (syllabus !== undefined) updates.syllabus = syllabus;
    if (schedule !== undefined) updates.schedule = schedule;
    if (cover_url !== undefined) updates.cover_url = cover_url;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();

    if (req.userRole === 'hod') {
      const { data: existing } = await supabase.from('courses').select('department_id').eq('id', id).single();
      if (existing) assertDepartmentScope(req, existing.department_id);
    }

    const { data: course, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Course updated.', data: course });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/courses/:id
 */
async function deleteCourse(req, res, next) {
  try {
    const { id } = req.params;

    if (req.userRole === 'hod') {
      const { data: existing } = await supabase.from('courses').select('department_id').eq('id', id).single();
      if (existing) assertDepartmentScope(req, existing.department_id);
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Course deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
