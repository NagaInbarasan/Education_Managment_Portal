/**
 * Phazon Backend — Semester Controller (Phase 19 Hardened)
 * Archive-instead-of-delete, date validation within academic year range.
 */
'use strict';

const supabase = require('../config/supabase');

async function getAllSemesters(req, res, next) {
  try {
    const { academic_year_id } = req.query;
    let query = supabase.from('semesters').select('*, academic_year:academic_years(name)').order('number', { ascending: true });
    if (academic_year_id) query = query.eq('academic_year_id', academic_year_id);

    const { data: semesters, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, data: semesters || [] });
  } catch (err) {
    next(err);
  }
}

async function getSemesterById(req, res, next) {
  try {
    const { id } = req.params;
    const { data: semester, error } = await supabase
      .from('semesters')
      .select('*, academic_year:academic_years(name)')
      .eq('id', id)
      .maybeSingle();

    if (error) return res.status(500).json({ success: false, message: error.message });
    if (!semester) return res.status(404).json({ success: false, message: 'Semester not found.' });

    return res.status(200).json({ success: true, data: semester });
  } catch (err) {
    next(err);
  }
}

async function createSemester(req, res, next) {
  try {
    const { name, number, academic_year_id, start_date, end_date, is_current } = req.body;
    if (!name || number === undefined || !academic_year_id) {
      return res.status(400).json({ success: false, message: 'Name, number, and academic_year_id are required.' });
    }

    // Validate semester dates within academic year range
    if (start_date && end_date) {
      if (end_date <= start_date) {
        return res.status(400).json({ success: false, message: 'end_date must be after start_date.' });
      }

      const { data: ay } = await supabase.from('academic_years').select('start_date, end_date').eq('id', academic_year_id).single();
      if (ay) {
        if (start_date < ay.start_date || end_date > ay.end_date) {
          return res.status(400).json({
            success: false,
            message: `Semester dates must fall within academic year range (${ay.start_date} to ${ay.end_date}).`
          });
        }
      }
    }

    if (is_current) {
      await supabase.from('semesters').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data: semester, error } = await supabase
      .from('semesters')
      .insert([{ name, number: parseInt(number, 10), academic_year_id, start_date, end_date, is_current: is_current || false }])
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(201).json({ success: true, data: semester });
  } catch (err) {
    next(err);
  }
}

async function updateSemester(req, res, next) {
  try {
    const { id } = req.params;
    const { name, number, academic_year_id, start_date, end_date, is_current } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (number !== undefined) updates.number = parseInt(number, 10);
    if (academic_year_id) updates.academic_year_id = academic_year_id;
    if (start_date) updates.start_date = start_date;
    if (end_date) updates.end_date = end_date;
    if (typeof is_current === 'boolean') updates.is_current = is_current;

    if (updates.is_current) {
      await supabase.from('semesters').update({ is_current: false }).neq('id', id);
    }

    const { data: semester, error } = await supabase
      .from('semesters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, data: semester });
  } catch (err) {
    next(err);
  }
}

/**
 * H5 FIX: Archive instead of hard delete to prevent orphaning grades, enrollments, fees.
 */
async function deleteSemester(req, res, next) {
  try {
    const { id } = req.params;

    // Check references in grades, student_enrollments, student_fees
    const { data: gradeRefs } = await supabase.from('grades').select('id').eq('semester_id', id).limit(1);
    const { data: enrollRefs } = await supabase.from('student_enrollments').select('id').eq('semester_id', id).limit(1);

    const hasReferences = (gradeRefs && gradeRefs.length > 0) || (enrollRefs && enrollRefs.length > 0);

    if (hasReferences) {
      const { data: archived, error } = await supabase
        .from('semesters')
        .update({ is_current: false })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(400).json({ success: false, message: error.message });
      return res.status(200).json({
        success: true,
        message: 'Semester has been deactivated (not deleted) because it is referenced by existing academic records.',
        data: archived
      });
    }

    const { error } = await supabase.from('semesters').delete().eq('id', id);
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllSemesters, getSemesterById, createSemester, updateSemester, deleteSemester };
