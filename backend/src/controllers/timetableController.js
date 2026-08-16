/**
 * Phazon Backend — Academic Timetable Controller
 * Deterministic schedule management, server-side conflict detection engine, publication workflow, and notifications.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');
const { notifyClass, createNotification } = require('../services/notificationService');

const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const VALID_TYPES = ['LECTURE', 'LAB', 'TUTORIAL', 'PRACTICAL', 'SEMINAR', 'OTHER'];

/**
 * Server-Side Conflict Detection Engine
 * Checks Teacher Overlap, Class Overlap, and Room Overlap.
 */
async function checkScheduleConflicts({ idToExclude = null, teacher_id, class_id, room_id, day_of_week, period_number, start_time, end_time }) {
  let query = supabase
    .from('timetable_entries')
    .select('id, class_id, course_id, teacher_id, room_id, day_of_week, period_number, start_time, end_time, course:courses(name), teacher:users!timetable_entries_teacher_id_fkey(name), class:classes(name), room:rooms(name)')
    .eq('day_of_week', day_of_week);

  if (idToExclude) {
    query = query.neq('id', idToExclude);
  }

  const { data: entries } = await query;
  if (!entries || entries.length === 0) return { hasConflict: false };

  for (const entry of entries) {
    // Check time overlap (same period or overlapping start/end time)
    const isPeriodMatch = period_number && entry.period_number === parseInt(period_number, 10);
    const isTimeOverlap = (start_time && end_time && entry.start_time < end_time && entry.end_time > start_time);

    if (isPeriodMatch || isTimeOverlap) {
      // 1. Teacher Conflict
      if (entry.teacher_id === teacher_id) {
        return {
          hasConflict: true,
          conflictType: 'TEACHER_CONFLICT',
          conflictMessage: `Teacher conflict: ${entry.teacher?.name || 'Faculty'} is already scheduled for "${entry.course?.name || 'Subject'}" with Class ${entry.class?.name || ''} during this slot.`
        };
      }
      // 2. Class Conflict
      if (entry.class_id === class_id) {
        return {
          hasConflict: true,
          conflictType: 'CLASS_CONFLICT',
          conflictMessage: `Class conflict: Class ${entry.class?.name || ''} already has "${entry.course?.name || 'Subject'}" scheduled during this slot.`
        };
      }
      // 3. Room Conflict
      if (room_id && entry.room_id === room_id) {
        return {
          hasConflict: true,
          conflictType: 'ROOM_CONFLICT',
          conflictMessage: `Room conflict: ${entry.room?.name || 'Room'} is already booked for Class ${entry.class?.name || ''} during this slot.`
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * GET /api/timetable
 * Retrieve weekly schedule grid for authenticated user context.
 */
async function getTimetable(req, res, next) {
  try {
    const { userRole, userId, classIds, departmentId } = req;
    const { class_id, teacher_id, room_id, day_of_week, status } = req.query;

    let query = supabase
      .from('timetable_entries')
      .select('*, course:courses(id, name, code), teacher:users!timetable_entries_teacher_id_fkey(id, name, email), class:classes(id, name), room:rooms(id, name, building), semester:semesters(name)');

    if (class_id) query = query.eq('class_id', class_id);
    if (teacher_id) query = query.eq('teacher_id', teacher_id);
    if (room_id) query = query.eq('room_id', room_id);
    if (day_of_week) query = query.eq('day_of_week', day_of_week);

    // Role-based visibility isolation
    if (userRole === 'student') {
      const activeClasses = classIds || [];
      query = query.eq('status', 'PUBLISHED').in('class_id', activeClasses);
    } else if (userRole === 'teacher') {
      const activeClasses = classIds || [];
      query = query.or(`teacher_id.eq.${userId},and(status.eq.PUBLISHED,class_id.in.(${activeClasses.join(',')}))`);
    } else if (userRole === 'hod') {
      if (status) query = query.eq('status', status);
      // Filter by department classes
      const { data: deptClasses } = await supabase.from('classes').select('id').eq('department_id', departmentId);
      const classIdList = deptClasses ? deptClasses.map(c => c.id) : [];
      if (classIdList.length > 0) query = query.in('class_id', classIdList);
    }

    const { data: entries, error } = await query
      .order('day_of_week', { ascending: true })
      .order('period_number', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ success: true, data: entries || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/timetable/today
 * Retrieve today's schedule and calculate "Next Class" session.
 */
async function getTodaySchedule(req, res, next) {
  try {
    const { userRole, userId, classIds } = req;
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[new Date().getDay()];

    let query = supabase
      .from('timetable_entries')
      .select('*, course:courses(name, code), teacher:users!timetable_entries_teacher_id_fkey(name), class:classes(name), room:rooms(name, building)')
      .eq('day_of_week', currentDay);

    if (userRole === 'student') {
      query = query.eq('status', 'PUBLISHED').in('class_id', classIds || []);
    } else if (userRole === 'teacher') {
      query = query.eq('teacher_id', userId);
    }

    const { data: todayEntries, error } = await query.order('start_time', { ascending: true });
    if (error) throw error;

    // Calculate Next Class
    const nowTime = new Date().toTimeString().slice(0, 8); // 'HH:MM:SS'
    let nextClass = null;
    if (todayEntries && todayEntries.length > 0) {
      nextClass = todayEntries.find(e => e.start_time > nowTime) || todayEntries[0];
    }

    return res.status(200).json({
      success: true,
      current_day: currentDay,
      today_classes: todayEntries || [],
      next_class: nextClass || null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/timetable
 * Create entry with conflict validation.
 */
async function createTimetableEntry(req, res, next) {
  try {
    const { academic_year_id, semester_id, class_id, course_id, teacher_id, room_id, day_of_week, period_number, start_time, end_time, entry_type } = req.body;
    const { userId, userRole } = req;

    if (userRole === 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden: Students cannot manage timetables.' });
    }

    if (!class_id || !course_id || !teacher_id || !day_of_week || !period_number || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'class_id, course_id, teacher_id, day_of_week, period_number, start_time, and end_time are required.' });
    }

    if (!VALID_DAYS.includes(day_of_week)) {
      return res.status(400).json({ success: false, message: `Invalid day_of_week. Must be one of: ${VALID_DAYS.join(', ')}` });
    }

    // Teacher authorization check
    if (userRole === 'teacher') {
      const { data: assg } = await supabase.from('teacher_assignments').select('id').eq('teacher_id', teacher_id).eq('class_id', class_id).maybeSingle();
      if (!assg) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to teach this class.' });
      }
    }

    // Conflict Check
    const conflict = await checkScheduleConflicts({
      teacher_id,
      class_id,
      room_id: room_id || null,
      day_of_week,
      period_number,
      start_time,
      end_time
    });

    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        conflict_type: conflict.conflictType,
        message: conflict.conflictMessage
      });
    }

    const { data: entry, error } = await supabase
      .from('timetable_entries')
      .insert([{
        academic_year_id: academic_year_id || null,
        semester_id: semester_id || null,
        class_id,
        course_id,
        teacher_id,
        room_id: room_id || null,
        day_of_week,
        period_number: parseInt(period_number, 10),
        start_time,
        end_time,
        entry_type: entry_type || 'LECTURE',
        status: 'DRAFT',
        created_by: userId
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, message: 'Timetable entry created (DRAFT).', data: entry });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/timetable/validate
 * Dry-run conflict check.
 */
async function validateSchedule(req, res, next) {
  try {
    const { id, teacher_id, class_id, room_id, day_of_week, period_number, start_time, end_time } = req.body;

    const conflict = await checkScheduleConflicts({
      idToExclude: id || null,
      teacher_id,
      class_id,
      room_id,
      day_of_week,
      period_number,
      start_time,
      end_time
    });

    return res.status(200).json({
      success: true,
      has_conflict: conflict.hasConflict,
      conflict_message: conflict.conflictMessage || null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/timetable/publish
 * Publish draft timetable for a class/department & dispatch notifications.
 */
async function publishTimetable(req, res, next) {
  try {
    const { class_id } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: HOD/Admin access required to publish.' });
    }

    if (!class_id) {
      return res.status(400).json({ success: false, message: 'class_id is required.' });
    }

    // Audit draft entries for conflict before publishing
    const { data: drafts } = await supabase.from('timetable_entries').select('*').eq('class_id', class_id).eq('status', 'DRAFT');
    if (!drafts || drafts.length === 0) {
      return res.status(400).json({ success: false, message: 'No draft schedule entries found to publish.' });
    }

    // Update status to PUBLISHED
    const { error } = await supabase
      .from('timetable_entries')
      .update({ status: 'PUBLISHED', updated_at: new Date().toISOString() })
      .eq('class_id', class_id);

    if (error) throw error;

    // Trigger Notification to enrolled students
    notifyClass({
      class_id,
      sender_id: userId,
      type: 'ANNOUNCEMENT',
      title: 'Academic Timetable Published',
      message: 'Your official class timetable has been published. Check your schedule portal.',
      entity_type: 'timetable',
      entity_id: class_id
    }).catch(err => console.error('[NotificationTrigger] Timetable publish error:', err.message));

    return res.status(200).json({ success: true, message: `Published ${drafts.length} schedule entries for class.` });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/timetable/:id
 */
async function updateTimetableEntry(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { userId, userRole } = req;

    const { data: existing } = await supabase.from('timetable_entries').select('*').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Timetable entry not found' });

    if (userRole === 'student') return res.status(403).json({ success: false, message: 'Forbidden' });

    // Conflict Re-evaluation
    const conflict = await checkScheduleConflicts({
      idToExclude: id,
      teacher_id: updates.teacher_id || existing.teacher_id,
      class_id: updates.class_id || existing.class_id,
      room_id: updates.room_id !== undefined ? updates.room_id : existing.room_id,
      day_of_week: updates.day_of_week || existing.day_of_week,
      period_number: updates.period_number || existing.period_number,
      start_time: updates.start_time || existing.start_time,
      end_time: updates.end_time || existing.end_time
    });

    if (conflict.hasConflict) {
      return res.status(409).json({ success: false, conflict_type: conflict.conflictType, message: conflict.conflictMessage });
    }

    const { data: updated, error } = await supabase
      .from('timetable_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Send change notification if published
    if (existing.status === 'PUBLISHED') {
      notifyClass({
        class_id: existing.class_id,
        sender_id: userId,
        type: 'ANNOUNCEMENT',
        title: 'Timetable Schedule Change',
        message: `Schedule update for ${existing.day_of_week}. Please check your updated timetable grid.`,
        entity_type: 'timetable',
        entity_id: existing.id
      }).catch(err => console.error('[NotificationTrigger] Schedule update error:', err.message));
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/timetable/:id
 */
async function deleteTimetableEntry(req, res, next) {
  try {
    const { id } = req.params;
    const { userRole } = req;

    if (userRole === 'student') return res.status(403).json({ success: false, message: 'Forbidden' });

    const { error } = await supabase.from('timetable_entries').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Timetable entry deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkScheduleConflicts,
  getTimetable,
  getTodaySchedule,
  createTimetableEntry,
  validateSchedule,
  publishTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
};
