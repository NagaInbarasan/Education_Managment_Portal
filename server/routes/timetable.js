import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, requireRole, isDepartmentHod, getHodDepartmentId, canEditSectionTimetable } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// =============================================
// TIMETABLE ENTRY ROUTES
// =============================================

// GET /api/timetable/my — logged-in teacher/HOD's personal teaching timetable
router.get('/my', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    if (role === 'student') {
      // Student: get their section timetable
      const sectionId = req.portalUser.section_id;
      if (!sectionId) return res.json([]);

      const { data, error } = await supabase
        .from('timetable_entries')
        .select('*, subject_offerings(id, teacher_portal_id, subjects(code, name, icon), sections(section_name, batch_year, departments(department_code, department_name)))')
        .eq('section_id', sectionId)
        .order('day_of_week')
        .order('period_number');
      if (error) throw error;
      return res.json(data || []);
    }

    if (role === 'teacher' || role === 'hod') {
      // Get all offerings where this user is teacher
      const { data: offerings } = await supabase
        .from('subject_offerings')
        .select('id')
        .eq('teacher_portal_id', portal_id)
        .eq('status', 'active');

      if (!offerings || offerings.length === 0) return res.json([]);
      const offeringIds = offerings.map(o => o.id);

      const { data, error } = await supabase
        .from('timetable_entries')
        .select('*, subject_offerings(id, teacher_portal_id, subjects(code, name, icon), sections(section_name, batch_year, departments(department_code, department_name)))')
        .in('offering_id', offeringIds)
        .order('day_of_week')
        .order('period_number');
      if (error) throw error;
      return res.json(data || []);
    }

    if (role === 'admin') {
      // Admin gets everything
      const { data, error } = await supabase
        .from('timetable_entries')
        .select('*, subject_offerings(id, teacher_portal_id, subjects(code, name, icon), sections(section_name, batch_year, departments(department_code, department_name)))')
        .order('day_of_week')
        .order('period_number');
      if (error) throw error;
      return res.json(data || []);
    }

    return res.json([]);
  } catch (err) {
    console.error('[timetable]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/timetable/section/:sectionId — section timetable
router.get('/section/:sectionId', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    // Authorization: student can view own section, teacher if assigned, HOD if own dept, admin all
    if (role === 'student' && req.portalUser.section_id !== req.params.sectionId) {
      return res.status(403).json({ error: 'Access denied. Not your section.' });
    }

    if (role === 'hod') {
      const { data: section } = await supabase
        .from('sections')
        .select('department_id')
        .eq('id', req.params.sectionId)
        .single();
      if (section) {
        const isHod = await isDepartmentHod(portal_id, section.department_id);
        if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
      }
    }

    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*, subject_offerings(id, teacher_portal_id, subjects(code, name, icon), sections(section_name, batch_year, departments(department_code, department_name)))')
      .eq('section_id', req.params.sectionId)
      .order('day_of_week')
      .order('period_number');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[timetable]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/timetable/can-edit/:sectionId — check if user can edit section timetable
router.get('/can-edit/:sectionId', async (req, res) => {
  try {
    const result = await canEditSectionTimetable(req.portalUser, req.params.sectionId);
    res.json({ canEdit: result.allowed, reason: result.reason || null });
  } catch (err) {
    console.error('[timetable]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/timetable/department/:deptId — department timetable (all sections)
router.get('/department/:deptId', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, req.params.deptId);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get all sections in this department
    const { data: sections } = await supabase
      .from('sections')
      .select('id, section_name, batch_year')
      .eq('department_id', req.params.deptId)
      .order('section_name');

    if (!sections || sections.length === 0) return res.json([]);
    const sectionIds = sections.map(s => s.id);

    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*, subject_offerings(id, teacher_portal_id, subjects(code, name, icon), sections(id, section_name, batch_year))')
      .in('section_id', sectionIds)
      .order('day_of_week')
      .order('period_number');
    if (error) throw error;

    // Group by section
    const grouped = {};
    for (const section of sections) {
      grouped[section.id] = {
        section,
        entries: (data || []).filter(e => e.section_id === section.id),
      };
    }

    res.json({ sections, entries: data || [], grouped });
  } catch (err) {
    console.error('[timetable]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/timetable — create timetable entry (admin or dept HOD)
router.post('/', async (req, res) => {
  try {
    const { section_id, offering_id, day_of_week, period_number, start_time, end_time, room, academic_year } = req.body;

    if (!section_id || !offering_id || !day_of_week || !period_number || !start_time || !end_time) {
      return res.status(400).json({ error: 'section_id, offering_id, day_of_week, period_number, start_time, end_time are required' });
    }

    // Authorization: admin, HOD of dept, or class advisor/mentor
    const editCheck = await canEditSectionTimetable(req.portalUser, section_id);
    if (!editCheck.allowed) {
      return res.status(403).json({ error: editCheck.reason || 'Access denied.' });
    }

    // Get the offering to know the teacher
    const { data: offering } = await supabase
      .from('subject_offerings')
      .select('teacher_portal_id')
      .eq('id', offering_id)
      .single();
    if (!offering) return res.status(404).json({ error: 'Offering not found' });

    // ---- CONFLICT DETECTION ----

    // 1. Section conflict: same section, same day, same period
    const { data: sectionConflict } = await supabase
      .from('timetable_entries')
      .select('id, subject_offerings(subjects(code, name))')
      .eq('section_id', section_id)
      .eq('day_of_week', day_of_week)
      .eq('period_number', period_number)
      .limit(1);
    if (sectionConflict && sectionConflict.length > 0) {
      return res.status(409).json({
        error: `Section conflict: Period ${period_number} on day ${day_of_week} is already assigned to ${sectionConflict[0].subject_offerings?.subjects?.name || 'another subject'}.`
      });
    }

    // 2. Teacher conflict: same teacher, same day, same period (across all sections)
    const { data: allTeacherOfferings } = await supabase
      .from('subject_offerings')
      .select('id')
      .eq('teacher_portal_id', offering.teacher_portal_id)
      .eq('status', 'active');
    if (allTeacherOfferings && allTeacherOfferings.length > 0) {
      const teacherOfferingIds = allTeacherOfferings.map(o => o.id);
      const { data: teacherConflict } = await supabase
        .from('timetable_entries')
        .select('id, section_id, subject_offerings(subjects(code, name), sections(section_name, departments(department_code)))')
        .in('offering_id', teacherOfferingIds)
        .eq('day_of_week', day_of_week)
        .eq('period_number', period_number)
        .limit(1);
      if (teacherConflict && teacherConflict.length > 0) {
        const conflict = teacherConflict[0];
        return res.status(409).json({
          error: `Teacher conflict: This teacher is already assigned to ${conflict.subject_offerings?.subjects?.name || 'another class'} in ${conflict.subject_offerings?.sections?.departments?.department_code || ''} ${conflict.subject_offerings?.sections?.section_name || ''} at the same time.`
        });
      }
    }

    // 3. Room conflict: same room, same day, same period
    if (room) {
      const { data: roomConflict } = await supabase
        .from('timetable_entries')
        .select('id, subject_offerings(subjects(name), sections(section_name))')
        .eq('room', room)
        .eq('day_of_week', day_of_week)
        .eq('period_number', period_number)
        .limit(1);
      if (roomConflict && roomConflict.length > 0) {
        return res.status(409).json({
          error: `Room conflict: ${room} is already booked at this time.`
        });
      }
    }

    // ---- INSERT ----
    const { data, error } = await supabase
      .from('timetable_entries')
      .insert({
        section_id,
        offering_id,
        day_of_week,
        period_number,
        start_time,
        end_time,
        room: room || null,
        academic_year: academic_year || '2025-26',
      })
      .select('*, subject_offerings(id, teacher_portal_id, subjects(code, name), sections(section_name, departments(department_code, department_name)))')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[timetable]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/timetable/:id — update timetable entry
router.put('/:id', async (req, res) => {
  try {
    // Get existing entry
    const { data: existing } = await supabase
      .from('timetable_entries')
      .select('section_id, offering_id, day_of_week, period_number, sections(department_id)')
      .eq('id', req.params.id)
      .single();
    if (!existing) return res.status(404).json({ error: 'Timetable entry not found' });

    // Authorization: admin, HOD of dept, or class advisor/mentor
    const editCheck = await canEditSectionTimetable(req.portalUser, existing.section_id);
    if (!editCheck.allowed) {
      return res.status(403).json({ error: editCheck.reason || 'Access denied.' });
    }

    const { offering_id, day_of_week, period_number, start_time, end_time, room } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    
    const newOfferingId = offering_id || existing.offering_id;
    const newDay = day_of_week || existing.day_of_week;
    const newPeriod = period_number || existing.period_number;

    // Check conflicts if day/period/offering changed
    if (day_of_week || period_number || offering_id) {
      // Section conflict
      const { data: sectionConflict } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('section_id', existing.section_id)
        .eq('day_of_week', newDay)
        .eq('period_number', newPeriod)
        .neq('id', req.params.id)
        .limit(1);
      if (sectionConflict && sectionConflict.length > 0) {
        return res.status(409).json({ error: 'Section conflict: Another class is already at this time.' });
      }

      // Teacher conflict
      const { data: offering } = await supabase
        .from('subject_offerings')
        .select('teacher_portal_id')
        .eq('id', newOfferingId)
        .single();
      if (offering) {
        const { data: allOffs } = await supabase
          .from('subject_offerings')
          .select('id')
          .eq('teacher_portal_id', offering.teacher_portal_id)
          .eq('status', 'active');
        if (allOffs) {
          const { data: teacherConflict } = await supabase
            .from('timetable_entries')
            .select('id')
            .in('offering_id', allOffs.map(o => o.id))
            .eq('day_of_week', newDay)
            .eq('period_number', newPeriod)
            .neq('id', req.params.id)
            .limit(1);
          if (teacherConflict && teacherConflict.length > 0) {
            return res.status(409).json({ error: 'Teacher conflict: This teacher is busy at this time.' });
          }
        }
      }
    }

    if (offering_id !== undefined) updates.offering_id = offering_id;
    if (day_of_week !== undefined) updates.day_of_week = day_of_week;
    if (period_number !== undefined) updates.period_number = period_number;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (room !== undefined) updates.room = room;

    const { data, error } = await supabase
      .from('timetable_entries')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, subject_offerings(id, teacher_portal_id, subjects(code, name), sections(section_name, departments(department_code, department_name)))')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[timetable]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/timetable/:id — delete timetable entry
router.delete('/:id', async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('timetable_entries')
      .select('section_id, sections(department_id)')
      .eq('id', req.params.id)
      .single();
    if (!existing) return res.status(404).json({ error: 'Timetable entry not found' });

    // Authorization: admin, HOD of dept, or class advisor/mentor
    const editCheck = await canEditSectionTimetable(req.portalUser, existing.section_id);
    if (!editCheck.allowed) {
      return res.status(403).json({ error: editCheck.reason || 'Access denied.' });
    }

    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Timetable entry deleted' });
  } catch (err) {
    console.error('[timetable]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
