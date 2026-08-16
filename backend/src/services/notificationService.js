/**
 * Phazon Backend — Notification Service
 * Controlled notification dispatching, audience expansion, and de-duplication logic.
 */

'use strict';

const supabase = require('../config/supabase');

const NOTIFICATION_TYPES = [
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_DUE_SOON',
  'ASSIGNMENT_SUBMITTED',
  'ASSIGNMENT_GRADED',
  'EXAM_SCHEDULED',
  'EXAM_UPDATED',
  'EXAM_REMINDER',
  'EXAM_RESULT_PUBLISHED',
  'RESULT_PUBLISHED',
  'ATTENDANCE_WARNING',
  'ANNOUNCEMENT',
  'ACADEMIC_MESSAGE',
  'SYSTEM_NOTIFICATION',
];

/**
 * Dispatch a single notification with de-duplication check.
 */
async function createNotification({ recipient_id, sender_id = null, type, title, message, entity_type = null, entity_id = null }) {
  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Invalid notification type: ${type}`);
  }

  // De-duplication check: Skip if an identical notification was created within the last 5 minutes
  if (entity_id && recipient_id) {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', recipient_id)
      .eq('type', type)
      .eq('entity_id', entity_id)
      .gte('created_at', fiveMinsAgo)
      .maybeSingle();

    if (existing) {
      return existing; // Duplicate suppressed
    }
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      recipient_id,
      sender_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      is_read: false
    }])
    .select()
    .single();

  if (error) {
    console.error('[NotificationService] Error creating notification:', error.message);
  }
  return data;
}

/**
 * Dispatch notification to all students enrolled in a class.
 */
async function notifyClass({ class_id, sender_id = null, type, title, message, entity_type = null, entity_id = null }) {
  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id')
    .eq('class_id', class_id);

  if (!enrollments || enrollments.length === 0) return;

  const recipientIds = [...new Set(enrollments.map(e => e.student_id))];

  for (const recipient_id of recipientIds) {
    await createNotification({ recipient_id, sender_id, type, title, message, entity_type, entity_id });
  }
}

/**
 * Dispatch notification to all students enrolled in a course.
 */
async function notifyCourse({ course_id, sender_id = null, type, title, message, entity_type = null, entity_id = null }) {
  // Find class linked to course
  const { data: course } = await supabase.from('courses').select('subject_id, department_id').eq('id', course_id).single();
  
  if (!course) return;

  // Find classes linked to department or teacher assignments
  const { data: assignments } = await supabase.from('teacher_assignments').select('class_id').eq('subject_id', course.subject_id);
  const classIds = assignments ? [...new Set(assignments.map(a => a.class_id))] : [];

  for (const class_id of classIds) {
    await notifyClass({ class_id, sender_id, type, title, message, entity_type, entity_id });
  }
}

/**
 * Dispatch notification to all members of a department.
 */
async function notifyDepartment({ department_id, sender_id = null, type, title, message, entity_type = null, entity_id = null }) {
  const { data: users } = await supabase.from('users').select('id').eq('department_id', department_id);
  if (!users || users.length === 0) return;

  for (const u of users) {
    await createNotification({ recipient_id: u.id, sender_id, type, title, message, entity_type, entity_id });
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  notifyClass,
  notifyCourse,
  notifyDepartment,
};
