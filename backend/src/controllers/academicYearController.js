/**
 * Phazon Backend — Academic Year Controller (Phase 19 Hardened)
 * Supports status enum (DRAFT, ACTIVE, ARCHIVED), single-active constraint,
 * date overlap validation, and archive-instead-of-delete.
 */
'use strict';

const supabase = require('../config/supabase');

const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

async function getAllAcademicYears(req, res, next) {
  try {
    const { data: years, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, data: years || [] });
  } catch (err) {
    next(err);
  }
}

async function getAcademicYearById(req, res, next) {
  try {
    const { id } = req.params;
    const { data: year, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return res.status(500).json({ success: false, message: error.message });
    if (!year) return res.status(404).json({ success: false, message: 'Academic Year not found.' });

    return res.status(200).json({ success: true, data: year });
  } catch (err) {
    next(err);
  }
}

async function createAcademicYear(req, res, next) {
  try {
    const { name, start_date, end_date, is_current, status } = req.body;
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Name, start_date, and end_date are required.' });
    }

    // Date validation
    if (end_date <= start_date) {
      return res.status(400).json({ success: false, message: 'end_date must be after start_date.' });
    }

    const yearStatus = VALID_STATUSES.includes(status) ? status : 'DRAFT';

    // Single-ACTIVE constraint: reject if trying to set ACTIVE when one already exists
    if (yearStatus === 'ACTIVE' || is_current) {
      const { data: existingActive } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .maybeSingle();

      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: `Cannot create another ACTIVE academic year. "${existingActive.name}" is currently active. Archive it first.`,
        });
      }
    }

    // Date overlap validation
    const { data: overlapping } = await supabase
      .from('academic_years')
      .select('id, name')
      .lte('start_date', end_date)
      .gte('end_date', start_date)
      .neq('is_current', false); // only check non-archived (rough filter)

    if (overlapping && overlapping.length > 0) {
      // Only warn, don't block — different institutions may have overlapping transition periods
      console.warn(`[AcademicYear] Date overlap detected with: ${overlapping.map(o => o.name).join(', ')}`);
    }

    const { data: year, error } = await supabase
      .from('academic_years')
      .insert([{
        name,
        start_date,
        end_date,
        is_current: yearStatus === 'ACTIVE' || is_current || false,
        status: yearStatus
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(201).json({ success: true, data: year });
  } catch (err) {
    next(err);
  }
}

async function updateAcademicYear(req, res, next) {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, is_current, status } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (start_date) updates.start_date = start_date;
    if (end_date) updates.end_date = end_date;

    // Status transition
    if (status && VALID_STATUSES.includes(status)) {
      updates.status = status;
      if (status === 'ACTIVE') {
        // Single-active constraint: deactivate any other active year
        const { data: existingActive } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_current', true)
          .neq('id', id)
          .maybeSingle();

        if (existingActive) {
          await supabase.from('academic_years').update({ is_current: false, status: 'ARCHIVED' }).eq('id', existingActive.id);
        }
        updates.is_current = true;
      } else if (status === 'ARCHIVED') {
        updates.is_current = false;
      }
    }

    if (typeof is_current === 'boolean') {
      updates.is_current = is_current;
      if (is_current) {
        await supabase.from('academic_years').update({ is_current: false }).neq('id', id);
        updates.status = 'ACTIVE';
      }
    }

    const { data: year, error } = await supabase
      .from('academic_years')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, data: year });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/academic-years/:id
 * H5 FIX: Archive instead of hard delete to prevent orphaning referenced records.
 */
async function deleteAcademicYear(req, res, next) {
  try {
    const { id } = req.params;

    // Check if referenced by semesters
    const { data: semesters } = await supabase.from('semesters').select('id').eq('academic_year_id', id).limit(1);
    if (semesters && semesters.length > 0) {
      // Archive instead of delete
      const { data: archived, error } = await supabase
        .from('academic_years')
        .update({ is_current: false, status: 'ARCHIVED' })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(400).json({ success: false, message: error.message });
      return res.status(200).json({
        success: true,
        message: 'Academic year has been ARCHIVED (not deleted) because it is referenced by existing semesters.',
        data: archived
      });
    }

    // Safe to delete if unreferenced
    const { error } = await supabase.from('academic_years').delete().eq('id', id);
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllAcademicYears, getAcademicYearById, createAcademicYear, updateAcademicYear, deleteAcademicYear };
