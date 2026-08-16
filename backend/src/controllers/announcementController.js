/**
 * Phazon Backend — Announcement Controller
 * Creation, retrieval, and deletion of academic announcements with strict scope verification & XSS sanitization.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');
const { notifyClass, notifyDepartment, createNotification } = require('../services/notificationService');

// XSS Sanitizer for plain text
function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * GET /api/announcements
 * Retrieve relevant announcements for user's academic context.
 */
async function getAnnouncements(req, res, next) {
  try {
    const { userRole, userId, departmentId, classIds } = req;

    let query = supabase
      .from('announcements')
      .select('*, sender:users!announcements_sender_id_fkey(name, email, role)');

    if (userRole === 'student') {
      const classIdList = classIds || [];
      query = query.or(`target_audience.eq.ALL,target_audience.eq.ROLE.and(role.eq.student),and(target_audience.eq.DEPARTMENT,department_id.eq.${departmentId}),and(target_audience.eq.CLASS,class_id.in.(${classIdList.join(',')}))`);
    } else if (userRole === 'teacher') {
      query = query.or(`sender_id.eq.${userId},target_audience.eq.ALL,and(target_audience.eq.DEPARTMENT,department_id.eq.${departmentId}),target_audience.eq.ROLE.and(role.eq.teacher)`);
    } else if (userRole === 'hod') {
      query = query.or(`sender_id.eq.${userId},target_audience.eq.ALL,and(target_audience.eq.DEPARTMENT,department_id.eq.${departmentId})`);
    }

    const { data: announcements, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, data: announcements || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/announcements
 * Create an announcement with scope verification and automatic notification dispatch.
 */
async function createAnnouncement(req, res, next) {
  try {
    const { title, message, target_audience, class_id, course_id, department_id, role } = req.body;
    const { userRole, userId } = req;

    if (userRole === 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden: Students cannot post announcements.' });
    }

    const cleanTitle = sanitizeText(title);
    const cleanMessage = sanitizeText(message);

    if (!cleanTitle || !cleanMessage || !target_audience) {
      return res.status(400).json({ success: false, message: 'Title, message, and target_audience are required.' });
    }

    // SCOPE VALIDATION
    if (userRole === 'teacher') {
      if (['DEPARTMENT', 'ALL', 'ROLE'].includes(target_audience)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Teachers can only post to assigned classes or courses.' });
      }
      if (target_audience === 'CLASS' && class_id) {
        const { data: assg } = await supabase.from('teacher_assignments').select('id').eq('teacher_id', userId).eq('class_id', class_id).maybeSingle();
        if (!assg) return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this class.' });
      }
    } else if (userRole === 'hod') {
      if (['ALL'].includes(target_audience) && req.userRole !== 'admin') {
        // HOD can target own department
      }
      if (target_audience === 'DEPARTMENT' && department_id) {
        assertDepartmentScope(req, department_id);
      }
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert([{
        title: cleanTitle,
        message: cleanMessage,
        sender_id: userId,
        target_audience,
        class_id: class_id || null,
        course_id: course_id || null,
        department_id: department_id || (userRole === 'hod' ? req.departmentId : null),
        role: role || null
      }])
      .select()
      .single();

    if (error) throw error;

    // AUTOMATIC NOTIFICATION DISPATCH
    if (target_audience === 'CLASS' && class_id) {
      await notifyClass({
        class_id,
        sender_id: userId,
        type: 'ANNOUNCEMENT',
        title: `Announcement: ${cleanTitle}`,
        message: cleanMessage,
        entity_type: 'announcement',
        entity_id: announcement.id
      });
    } else if (target_audience === 'DEPARTMENT' && (department_id || req.departmentId)) {
      await notifyDepartment({
        department_id: department_id || req.departmentId,
        sender_id: userId,
        type: 'ANNOUNCEMENT',
        title: `Department Announcement: ${cleanTitle}`,
        message: cleanMessage,
        entity_type: 'announcement',
        entity_id: announcement.id
      });
    }

    return res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/announcements/:id
 * Sender or Admin only.
 */
async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, userRole } = req;

    const { data: existing } = await supabase.from('announcements').select('sender_id').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Announcement not found' });

    if (existing.sender_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the sender or Admin can delete this announcement.' });
    }

    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};
