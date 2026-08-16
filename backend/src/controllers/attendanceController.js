/**
 * Phazon Backend — Attendance Controller
 * Handles recording, querying, and summary analytics for student attendance.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');
const { createNotification } = require('../services/notificationService');

/**
 * POST /api/attendance/session
 * Teacher records or updates attendance for a class session.
 * Body: { class_id, subject_id, date, records: [{ student_id, status, remarks }] }
 */
async function recordAttendance(req, res, next) {
  try {
    const { class_id, subject_id, date, notes, records } = req.body;
    const teacher_id = req.userId;

    if (!class_id || !subject_id || !date || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'class_id, subject_id, date, and records array are required.',
      });
    }

    if (req.userRole === 'teacher') {
      const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', teacher_id)
        .eq('class_id', class_id)
        .eq('subject_id', subject_id)
        .maybeSingle();
        
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this class and subject.' });
      }
      
      const cutoffDays = parseInt(process.env.ATTENDANCE_EDIT_CUTOFF_DAYS || '7', 10);
      const sessionDate = new Date(date);
      const today = new Date();
      const diffDays = Math.ceil((today - sessionDate) / (1000 * 60 * 60 * 24)); 
      if (diffDays > cutoffDays) {
        return res.status(403).json({ success: false, message: `Forbidden: Cannot edit attendance older than ${cutoffDays} days.` });
      }
    } else if (req.userRole === 'hod') {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', class_id).single();
      if (cls) assertDepartmentScope(req, cls.department_id);
    }

    // Verify all students are enrolled in the class
    if (records.length > 0) {
      const studentIds = records.map(r => r.student_id);
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', class_id)
        .in('student_id', studentIds);
        
      if (!enrollments || enrollments.length !== studentIds.length) {
        return res.status(400).json({ success: false, message: 'One or more students are not enrolled in this class.' });
      }
    }

    // 1. Create or get attendance session
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .upsert([{
        class_id,
        subject_id,
        teacher_id,
        date,
        notes: notes || null,
      }], { onConflict: 'class_id,subject_id,date' })
      .select()
      .single();

    if (sessionError) {
      return res.status(400).json({ success: false, message: sessionError.message });
    }

    // 2. Upsert attendance records for each student
    const recordPayloads = records.map(r => ({
      session_id: session.id,
      student_id: r.student_id,
      status: ['present', 'absent', 'late', 'excused'].includes(r.status) ? r.status : 'absent',
      remarks: r.remarks || null,
    }));

    const { data: savedRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .upsert(recordPayloads, { onConflict: 'session_id,student_id' })
      .select();

    if (recordsError) {
      return res.status(400).json({ success: false, message: recordsError.message });
    }

    // Trigger ATTENDANCE_WARNING check for absent students
    const absentStudentIds = recordPayloads.filter(r => r.status === 'absent').map(r => r.student_id);
    for (const student_id of absentStudentIds) {
      const { data: summary } = await supabase
        .from('student_attendance_summary')
        .select('attendance_pct, subject:subjects(name)')
        .eq('student_id', student_id)
        .eq('subject_id', subject_id)
        .maybeSingle();

      if (summary && summary.attendance_pct < 75) {
        createNotification({
          recipient_id: student_id,
          sender_id: teacher_id,
          type: 'ATTENDANCE_WARNING',
          title: 'Attendance Warning',
          message: `Your attendance in ${summary.subject?.name || 'subject'} is ${summary.attendance_pct}%, which is below the 75% required threshold.`,
          entity_type: 'attendance_session',
          entity_id: session.id
        }).catch(err => console.error('[NotificationTrigger] Attendance warning error:', err.message));
      }
    }

    return res.status(200).json({
      success: true,
      message: `Attendance recorded for ${savedRecords.length} students.`,
      session,
      records: savedRecords,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/session
 * Query session and student attendance status for a specific class, subject, and date.
 */
async function getSessionAttendance(req, res, next) {
  try {
    const { class_id, subject_id, date } = req.query;

    if (!class_id || !subject_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'class_id, subject_id, and date are required.',
      });
    }

    if (req.userRole === 'teacher') {
      if (!req.classIds || !req.classIds.includes(class_id)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not assigned to this class.' });
      }
    } else if (req.userRole === 'hod') {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', class_id).single();
      if (cls) assertDepartmentScope(req, cls.department_id);
    }

    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, class_id, subject_id, teacher_id, date, notes, created_at, teacher:users!attendance_sessions_teacher_id_fkey(name)')
      .eq('class_id', class_id)
      .eq('subject_id', subject_id)
      .eq('date', date)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({ success: false, message: sessionError.message });
    }

    if (!session) {
      return res.status(200).json({ success: true, session: null, records: [] });
    }

    const { data: records, error: recordsError } = await supabase
      .from('attendance_records')
      .select('id, session_id, student_id, status, remarks, student:users!attendance_records_student_id_fkey(id, name, email)')
      .eq('session_id', session.id);

    if (recordsError) {
      return res.status(500).json({ success: false, message: recordsError.message });
    }

    return res.status(200).json({
      success: true,
      session,
      records: records || [],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/my
 * Returns student's attendance records and calculated attendance % per subject.
 */
async function getMyAttendance(req, res, next) {
  try {
    const studentId = req.query.student_id && ['admin', 'hod', 'teacher'].includes(req.userRole)
      ? req.query.student_id
      : req.userId;

    // Fetch summary from view
    const { data: summary, error: summaryError } = await supabase
      .from('student_attendance_summary')
      .select('class_id, subject_id, present_count, absent_count, total_sessions, attendance_pct, subject:subjects(name, code, credits)')
      .eq('student_id', studentId);

    if (summaryError) {
      return res.status(500).json({ success: false, message: summaryError.message });
    }

    // Fetch recent individual records
    const { data: history, error: historyError } = await supabase
      .from('attendance_records')
      .select('id, status, remarks, session:attendance_sessions(date, class_id, subject:subjects(name, code))')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (historyError) {
      return res.status(500).json({ success: false, message: historyError.message });
    }

    return res.status(200).json({
      success: true,
      summary: summary || [],
      history: history || [],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/summary
 * Class or Department wide attendance summary.
 */
async function getAttendanceSummary(req, res, next) {
  try {
    const { class_id, department_id } = req.query;

    let query = supabase
      .from('student_attendance_summary')
      .select('student_id, class_id, subject_id, present_count, absent_count, total_sessions, attendance_pct, student:users!student_attendance_summary_student_id_fkey(name, email)');

    if (class_id) query = query.eq('class_id', class_id);
    if (department_id) {
      // HOD scope check
      if (req.userRole === 'hod') assertDepartmentScope(req, department_id);
      
      const { data: classes } = await supabase.from('classes').select('id').eq('department_id', department_id);
      const classIds = classes ? classes.map(c => c.id) : [];
      if (classIds.length === 0) return res.status(200).json({ success: true, data: [] });
      query = query.in('class_id', classIds);
    }

    if (req.userRole === 'teacher') {
      if (!req.classIds || req.classIds.length === 0) return res.status(200).json({ success: true, data: [] });
      query = query.in('class_id', req.classIds);
    }

    const { data: summary, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: summary || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordAttendance,
  getSessionAttendance,
  getMyAttendance,
  getAttendanceSummary,
};
